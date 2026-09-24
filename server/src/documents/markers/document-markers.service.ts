import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { User } from '../../users/users.entity';
import { Document } from '../documents.entity';
import {
  findDocumentMarkers,
  updateDocumentMarkerContent,
  type DocumentMarkers,
  type DocumentMarkerUpdateResult,
  type DocumentMarkerView,
} from './document-marker-content';
import { DocumentMarker } from './document-marker.entity';
import { UpdateDocumentMarkerDto } from './dto/update-document-marker.dto';

@Injectable()
export class DocumentMarkersService {
  constructor(
    @InjectRepository(Document)
    private readonly documents: Repository<Document>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(documentId: string): Promise<DocumentMarkers> {
    const document = await this.documents.findOneBy({ id: documentId });
    if (!document) throw new NotFoundException('Document not found');
    return {
      documentId: document.id,
      version: document.version,
      markers: this.uniqueMarkers(document.content),
    };
  }

  async update(
    documentId: string,
    markerId: string,
    dto: UpdateDocumentMarkerDto,
    userId: string,
    scannerId: string,
  ): Promise<DocumentMarkerUpdateResult> {
    await this.assertUserExists(userId);
    const requestHash = this.markerRequestHash(markerId, dto);

    return this.dataSource.transaction(async (manager) => {
      const documents = manager.getRepository(Document);
      const markers = manager.getRepository(DocumentMarker);
      const document = await documents.findOne({
        where: { id: documentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!document) throw new NotFoundException('Document not found');

      const markerView = this.uniqueMarkers(document.content).find(
        (marker) => marker.id === markerId,
      );
      if (!markerView) throw new NotFoundException('Document marker not found');

      const operationMarker = await markers.findOneBy({
        lastOperationId: dto.operationId,
      });
      if (operationMarker) {
        if (
          operationMarker.id !== markerId ||
          operationMarker.documentId !== documentId ||
          operationMarker.lastRequestHash !== requestHash ||
          operationMarker.scannerId !== scannerId
        ) {
          throw new ConflictException(
            'Operation id was already used for another marker update',
          );
        }
        return {
          operationId: dto.operationId,
          documentId,
          markerId,
          version: operationMarker.resultVersion ?? document.version,
          applied: false,
        };
      }

      if (document.version !== dto.version) {
        throw new ConflictException('Document version is outdated');
      }
      const updated = updateDocumentMarkerContent(
        document.content,
        markerId,
        dto.content,
      );
      if (updated.matches !== 1) {
        throw new ConflictException('Document contains duplicate marker ids');
      }

      document.content = updated.content;
      document.version += 1;
      document.updatedById = userId;
      await documents.save(document);

      const marker =
        (await markers.findOneBy({ id: markerId, documentId })) ??
        markers.create({ id: markerId, documentId });
      marker.label = markerView.label;
      marker.lastOperationId = dto.operationId;
      marker.lastRequestHash = requestHash;
      marker.resultVersion = document.version;
      marker.updatedById = userId;
      marker.scannerId = scannerId;
      await markers.save(marker);

      return {
        operationId: dto.operationId,
        documentId,
        markerId,
        version: document.version,
        applied: true,
      };
    });
  }

  async synchronize(manager: EntityManager, document: Document): Promise<void> {
    const current = this.uniqueMarkers(document.content);
    const repository = manager.getRepository(DocumentMarker);
    const stored = await repository.findBy({ documentId: document.id });
    const storedById = new Map(stored.map((marker) => [marker.id, marker]));

    const toSave = current.map((view) => {
      const marker =
        storedById.get(view.id) ??
        repository.create({ id: view.id, documentId: document.id });
      marker.label = view.label;
      return marker;
    });
    if (toSave.length > 0) await repository.save(toSave);

    const currentIds = new Set(current.map((marker) => marker.id));
    const removedIds = stored
      .filter((marker) => !currentIds.has(marker.id))
      .map((marker) => marker.id);
    if (removedIds.length > 0) {
      await repository.delete({ documentId: document.id, id: In(removedIds) });
    }
  }

  private uniqueMarkers(content: object): DocumentMarkerView[] {
    const markers = findDocumentMarkers(content);
    if (new Set(markers.map((marker) => marker.id)).size !== markers.length) {
      throw new ConflictException('Document contains duplicate marker ids');
    }
    return markers;
  }

  private markerRequestHash(
    markerId: string,
    dto: UpdateDocumentMarkerDto,
  ): string {
    return createHash('sha256')
      .update(
        JSON.stringify({
          version: dto.version,
          markerId,
          content: dto.content,
        }),
      )
      .digest('hex');
  }

  private async assertUserExists(userId: string): Promise<void> {
    if (!(await this.users.existsBy({ id: userId }))) {
      throw new UnauthorizedException('User not found');
    }
  }
}
