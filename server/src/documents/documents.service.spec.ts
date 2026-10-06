import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { DocumentsService } from './documents.service';
import { DocumentMarkersService } from './markers/document-markers.service';
import { Document } from './documents.entity';
import { User } from '../users/users.entity';

describe('DocumentsService', () => {
  const id = 'ea8fdd81-d02f-43b0-9bc3-e798a0afe052';
  const userId = '81b160a4-9768-482b-946b-f3e76588e49b';
  const document = {
    id,
    ownerId: userId,
    version: 3,
    title: 'New title',
  } as Document;
  const documents = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const users = { existsBy: jest.fn() };
  const documentMarkers = { synchronize: jest.fn() };
  const manager = { getRepository: jest.fn(() => documents) };
  const dataSource = {
    transaction: jest.fn(
      (callback: (transactionManager: EntityManager) => Promise<unknown>) =>
        callback(manager as unknown as EntityManager),
    ),
  };
  const service = new DocumentsService(
    documents as unknown as Repository<Document>,
    users as unknown as Repository<User>,
    dataSource as unknown as DataSource,
    documentMarkers as unknown as DocumentMarkersService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    users.existsBy.mockResolvedValue(true);
    documents.findOneBy.mockResolvedValue(document);
  });

  it('lists only documents owned by the user', async () => {
    documents.find.mockResolvedValue([document]);

    await expect(service.findAll(userId)).resolves.toEqual([document]);
    expect(documents.find).toHaveBeenCalledWith({
      where: { ownerId: userId },
      order: { updatedAt: 'DESC' },
    });
  });

  it('finds a document only for its owner', async () => {
    await expect(service.findOne(id, userId)).resolves.toBe(document);
    expect(documents.findOneBy).toHaveBeenCalledWith({ id, ownerId: userId });
  });

  it('updates only the requested version and records the editor', async () => {
    documents.update.mockResolvedValue({ affected: 1 });

    await expect(
      service.update(id, { version: 2, title: 'New title' }, userId),
    ).resolves.toBe(document);
    expect(documents.update).toHaveBeenCalledWith(
      { id, ownerId: userId, version: 2 },
      expect.objectContaining({ title: 'New title', updatedById: userId }),
    );
  });

  it('delegates marker synchronization when document content changes', async () => {
    const content = {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    };
    documents.update.mockResolvedValue({ affected: 1 });
    documents.findOneBy.mockResolvedValue({ ...document, content });

    await service.update(id, { version: 2, content }, userId);

    expect(documentMarkers.synchronize).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ id, content }),
    );
  });

  it('returns a conflict when another change has advanced the version', async () => {
    documents.update.mockResolvedValue({ affected: 0 });

    await expect(
      service.update(id, { version: 2, title: 'New title' }, userId),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns not found when the document is not owned by the user', async () => {
    documents.update.mockResolvedValue({ affected: 0 });
    documents.findOneBy.mockResolvedValue(null);

    await expect(
      service.update(id, { version: 2, title: 'New title' }, userId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes a document only for its owner', async () => {
    documents.delete.mockResolvedValue({ affected: 1 });

    await service.remove(id, userId);

    expect(documents.delete).toHaveBeenCalledWith({ id, ownerId: userId });
  });
});
