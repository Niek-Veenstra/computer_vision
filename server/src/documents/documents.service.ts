import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { User } from '../users/users.entity';
import {
  findDocumentMarkers,
  updateDocumentMarkerContent,
  type DocumentMarkers,
  type DocumentMarkerUpdateResult,
  type DocumentMarkerView,
} from './document-content';
import { DocumentMarker } from './document-marker.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { UpdateDocumentMarkerDto } from './dto/update-document-marker.dto';
import { Document } from './documents.entity';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documents: Repository<Document>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(): Promise<Document[]> {
    return this.documents.find({ order: { updatedAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Document> {
    const document = await this.documents.findOneBy({ id });
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  async findMarkers(id: string): Promise<DocumentMarkers> {
    const document = await this.findOne(id);
    return {
      documentId: document.id,
      version: document.version,
      markers: this.uniqueMarkers(document.content),
    };
  }

  async create(dto: CreateDocumentDto, userId: string): Promise<Document> {
    await this.assertUserExists(userId);
    return this.dataSource.transaction(async (manager) => {
      const documents = manager.getRepository(Document);
      const document = await documents.save(
        documents.create({
          title: dto.title,
          content: dto.content,
          updatedById: userId,
        }),
      );
      await this.syncMarkers(manager, document);
      return document;
    });
  }

  async updateMarker(
    id: string,
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
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!document) throw new NotFoundException('Document not found');

      const documentMarkers = this.uniqueMarkers(document.content);
      const markerView = documentMarkers.find(
        (marker) => marker.id === markerId,
      );
      if (!markerView) throw new NotFoundException('Document marker not found');

      const operationMarker = await markers.findOneBy({
        lastOperationId: dto.operationId,
      });
      if (operationMarker) {
        if (
          operationMarker.id !== markerId ||
          operationMarker.documentId !== id ||
          operationMarker.lastRequestHash !== requestHash ||
          operationMarker.scannerId !== scannerId
        ) {
          throw new ConflictException(
            'Operation id was already used for another marker update',
          );
        }
        return {
          operationId: dto.operationId,
          documentId: id,
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
        (await markers.findOneBy({ id: markerId, documentId: id })) ??
        markers.create({ id: markerId, documentId: id });
      marker.label = markerView.label;
      marker.lastOperationId = dto.operationId;
      marker.lastRequestHash = requestHash;
      marker.resultVersion = document.version;
      marker.updatedById = userId;
      marker.scannerId = scannerId;
      await markers.save(marker);

      return {
        operationId: dto.operationId,
        documentId: id,
        markerId,
        version: document.version,
        applied: true,
      };
    });
  }

  async update(
    id: string,
    dto: UpdateDocumentDto,
    userId: string,
  ): Promise<Document> {
    if (dto.title === undefined && dto.content === undefined) {
      throw new BadRequestException('Provide title or content to update');
    }
    await this.assertUserExists(userId);

    return this.dataSource.transaction(async (manager) => {
      const documents = manager.getRepository(Document);
      const result = await documents.update(
        { id, version: dto.version },
        {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.content !== undefined && { content: dto.content }),
          version: () => 'version + 1',
          updatedById: userId,
        },
      );
      if (!result.affected) {
        const current = await documents.findOneBy({ id });
        if (!current) throw new NotFoundException('Document not found');
        throw new ConflictException('Document version is outdated');
      }

      const document = await documents.findOneBy({ id });
      if (!document) throw new NotFoundException('Document not found');
      if (dto.content !== undefined) await this.syncMarkers(manager, document);
      return document;
    });
  }

  async remove(id: string): Promise<void> {
    const result = await this.documents.delete(id);
    if (!result.affected) throw new NotFoundException('Document not found');
  }

  private uniqueMarkers(content: object): DocumentMarkerView[] {
    const markers = findDocumentMarkers(content);
    if (new Set(markers.map((marker) => marker.id)).size !== markers.length) {
      throw new ConflictException('Document contains duplicate marker ids');
    }
    return markers;
  }

  private async syncMarkers(
    manager: EntityManager,
    document: Document,
  ): Promise<void> {
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
