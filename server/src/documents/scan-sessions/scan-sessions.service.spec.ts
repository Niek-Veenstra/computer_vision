import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Scanner } from '../../scanners/scanner.entity';
import { Document } from '../documents.entity';
import { ScanSession, ScanSessionStatus } from './scan-session.entity';
import { ScanSessionsService } from './scan-sessions.service';

describe('ScanSessionsService', () => {
  const documentId = '15d79d83-e70c-4afb-8ab7-c291b26a2843';
  const scannerId = 'ca3999a4-1479-41ed-b03e-604b6cd3a7a8';
  const userId = 'bbc167e5-a0b0-4c45-ac6c-ee722ac83540';
  const sessionId = '7ebf4db5-284d-42c2-8c59-424ef0e870aa';

  const sessions = {
    findOneBy: jest.fn(),
    find: jest.fn(),
    existsBy: jest.fn(),
    create: jest.fn((value: object) => value),
    save: jest.fn((value: object) => value),
    delete: jest.fn(),
  };
  const documents = { findOneBy: jest.fn() };
  const scanners = { findOneBy: jest.fn() };
  const service = new ScanSessionsService(
    sessions as unknown as Repository<ScanSession>,
    documents as unknown as Repository<Document>,
    scanners as unknown as Repository<Scanner>,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    documents.findOneBy.mockResolvedValue({ id: documentId });
    scanners.findOneBy.mockResolvedValue({ id: scannerId, ownerId: userId });
    sessions.findOneBy.mockResolvedValue(null);
  });

  it('creates an active session for a scanner owned by the user', async () => {
    const session = await service.create(documentId, scannerId, userId);

    expect(session).toMatchObject({
      documentId,
      scannerId,
      createdById: userId,
      status: ScanSessionStatus.Active,
    });
    expect(scanners.findOneBy).toHaveBeenCalledWith(
      expect.objectContaining({ id: scannerId, ownerId: userId }),
    );
  });

  it('rejects a second active session for the scanner', async () => {
    sessions.findOneBy.mockResolvedValue({ id: sessionId });

    await expect(
      service.create(documentId, scannerId, userId),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists the current users scan sessions for a document', async () => {
    const expected = [{ id: sessionId, documentId, createdById: userId }];
    sessions.find.mockResolvedValue(expected);

    await expect(
      service.findAllForDocument(documentId, userId),
    ).resolves.toEqual(expected);
    expect(sessions.find).toHaveBeenCalledWith({
      where: { documentId, createdById: userId },
      order: { createdAt: 'DESC' },
    });
  });

  it('rejects listing sessions for a missing document', async () => {
    documents.findOneBy.mockResolvedValue(null);

    await expect(
      service.findAllForDocument(documentId, userId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('stops an active session created by the user', async () => {
    const active = {
      id: sessionId,
      documentId,
      scannerId,
      createdById: userId,
      status: ScanSessionStatus.Active,
      completedAt: null,
    };
    sessions.findOneBy.mockResolvedValue(active);

    const result = await service.stop(
      documentId,
      sessionId,
      userId,
      ScanSessionStatus.Completed,
    );

    expect(sessions.findOneBy).toHaveBeenCalledWith({
      id: sessionId,
      documentId,
      createdById: userId,
      status: ScanSessionStatus.Active,
    });
    expect(result.status).toBe(ScanSessionStatus.Completed);
    expect(result.completedAt).toBeInstanceOf(Date);
  });

  it('does not stop a session that is not active and owned by the user', async () => {
    sessions.findOneBy.mockResolvedValue(null);

    await expect(
      service.stop(documentId, sessionId, userId, ScanSessionStatus.Completed),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes a completed session created by the user', async () => {
    sessions.findOneBy.mockResolvedValue({
      id: sessionId,
      documentId,
      createdById: userId,
      status: ScanSessionStatus.Completed,
    });
    sessions.delete.mockResolvedValue({ affected: 1 });

    await service.remove(documentId, sessionId, userId);

    expect(sessions.delete).toHaveBeenCalledWith({
      id: sessionId,
      documentId,
      createdById: userId,
    });
  });

  it('does not delete an active session', async () => {
    sessions.findOneBy.mockResolvedValue({
      id: sessionId,
      documentId,
      createdById: userId,
      status: ScanSessionStatus.Active,
    });

    await expect(
      service.remove(documentId, sessionId, userId),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(sessions.delete).not.toHaveBeenCalled();
  });

  it('does not delete a session owned by another user', async () => {
    sessions.findOneBy.mockResolvedValue(null);

    await expect(
      service.remove(documentId, sessionId, userId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(sessions.delete).not.toHaveBeenCalled();
  });

  it('requires an active session for marker access', async () => {
    sessions.existsBy.mockResolvedValue(false);

    await expect(
      service.assertActive(documentId, scannerId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('completes only the active session assigned to the scanner', async () => {
    const active = {
      id: sessionId,
      documentId,
      scannerId,
      status: ScanSessionStatus.Active,
      completedAt: null,
    };
    sessions.findOneBy.mockResolvedValue(active);

    const result = await service.finish(
      sessionId,
      scannerId,
      ScanSessionStatus.Completed,
    );

    expect(result).toMatchObject({
      status: ScanSessionStatus.Completed,
    });
    expect(result.completedAt).toBeInstanceOf(Date);
  });
});
