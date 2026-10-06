import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Scanner } from '../../scanners/scanner.entity';
import { Document } from '../documents.entity';
import { ScanSession, ScanSessionStatus } from './scan-session.entity';

@Injectable()
export class ScanSessionsService {
  constructor(
    @InjectRepository(ScanSession)
    private readonly sessions: Repository<ScanSession>,
    @InjectRepository(Document)
    private readonly documents: Repository<Document>,
    @InjectRepository(Scanner)
    private readonly scanners: Repository<Scanner>,
  ) {}

  async create(
    documentId: string,
    scannerId: string,
    userId: string,
  ): Promise<ScanSession> {
    const document = await this.documents.findOneBy({ id: documentId });
    if (!document) throw new NotFoundException('Document not found');

    const scanner = await this.scanners.findOneBy({
      id: scannerId,
      ownerId: userId,
      revokedAt: IsNull(),
    });
    if (!scanner) throw new NotFoundException('Scanner not found');

    const current = await this.sessions.findOneBy({
      scannerId,
      status: ScanSessionStatus.Active,
    });
    if (current) {
      throw new ConflictException('Scanner already has an active scan session');
    }

    return this.sessions.save(
      this.sessions.create({
        documentId,
        scannerId,
        createdById: userId,
        status: ScanSessionStatus.Active,
        completedAt: null,
      }),
    );
  }

  async findAllForDocument(
    documentId: string,
    userId: string,
  ): Promise<ScanSession[]> {
    const document = await this.documents.findOneBy({ id: documentId });
    if (!document) throw new NotFoundException('Document not found');

    return this.sessions.find({
      where: { documentId, createdById: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async stop(
    documentId: string,
    sessionId: string,
    userId: string,
    status: ScanSessionStatus.Completed,
  ): Promise<ScanSession> {
    const session = await this.sessions.findOneBy({
      id: sessionId,
      documentId,
      createdById: userId,
      status: ScanSessionStatus.Active,
    });
    if (!session) throw new NotFoundException('Active scan session not found');

    session.status = status;
    session.completedAt = new Date();
    return this.sessions.save(session);
  }

  async remove(
    documentId: string,
    sessionId: string,
    userId: string,
  ): Promise<void> {
    const session = await this.sessions.findOneBy({
      id: sessionId,
      documentId,
      createdById: userId,
    });
    if (!session) throw new NotFoundException('Scan session not found');
    if (session.status === ScanSessionStatus.Active) {
      throw new ConflictException('Active scan sessions cannot be deleted');
    }

    const deleted = await this.sessions.delete({
      id: sessionId,
      documentId,
      createdById: userId,
    });
    if (deleted.affected !== 1) {
      throw new NotFoundException('Scan session not found');
    }
  }

  async findActiveForScanner(scannerId: string): Promise<ScanSession> {
    const session = await this.sessions.findOneBy({
      scannerId,
      status: ScanSessionStatus.Active,
    });
    if (!session) throw new NotFoundException('No active scan session');
    return session;
  }

  async assertActive(documentId: string, scannerId: string): Promise<void> {
    const active = await this.sessions.existsBy({
      documentId,
      scannerId,
      status: ScanSessionStatus.Active,
    });
    if (!active) {
      throw new NotFoundException('No active scan session for this document');
    }
  }

  async finish(
    sessionId: string,
    scannerId: string,
    status: ScanSessionStatus.Completed | ScanSessionStatus.Cancelled,
  ): Promise<ScanSession> {
    const session = await this.sessions.findOneBy({
      id: sessionId,
      scannerId,
      status: ScanSessionStatus.Active,
    });
    if (!session) throw new NotFoundException('Active scan session not found');

    session.status = status;
    session.completedAt = new Date();
    return this.sessions.save(session);
  }
}
