import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { DocumentMarker } from './document-marker.entity';
import { DocumentsService } from './documents.service';
import { Document } from './documents.entity';
import { User } from '../users/users.entity';

describe('DocumentsService.update', () => {
  const id = 'ea8fdd81-d02f-43b0-9bc3-e798a0afe052';
  const userId = '81b160a4-9768-482b-946b-f3e76588e49b';
  const document = { id, version: 3, title: 'New title' } as Document;
  const documents = {
    update: jest.fn(),
    findOneBy: jest.fn(),
  };
  const users = { existsBy: jest.fn() };
  const markers = {
    findBy: jest.fn(),
    create: jest.fn((value: unknown) => value),
    save: jest.fn(),
    delete: jest.fn(),
  };
  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === DocumentMarker) return markers;
      return documents;
    }),
  };
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
  );

  beforeEach(() => {
    jest.clearAllMocks();
    users.existsBy.mockResolvedValue(true);
    documents.findOneBy.mockResolvedValue(document);
    markers.findBy.mockResolvedValue([]);
  });

  it('updates only the requested version and records the editor', async () => {
    documents.update.mockResolvedValue({ affected: 1 });

    await expect(
      service.update(id, { version: 2, title: 'New title' }, userId),
    ).resolves.toBe(document);
    expect(documents.update).toHaveBeenCalledWith(
      { id, version: 2 },
      expect.objectContaining({ title: 'New title', updatedById: userId }),
    );
  });

  it('synchronizes marker creation and deletion from document content', async () => {
    const currentMarkerId = 'f45e4bf4-88ca-42b7-843d-b781698be74c';
    const removedMarkerId = 'c12cf6b3-117e-4ead-b414-b5e147bad13e';
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'recognitionMarker',
              attrs: { id: currentMarkerId, label: 'Result' },
            },
          ],
        },
      ],
    };
    documents.update.mockResolvedValue({ affected: 1 });
    documents.findOneBy.mockResolvedValue({ ...document, content });
    markers.findBy.mockResolvedValue([
      { id: removedMarkerId, documentId: id, label: 'Old' },
    ]);

    await service.update(id, { version: 2, content }, userId);

    expect(markers.save).toHaveBeenCalledWith([
      expect.objectContaining({
        id: currentMarkerId,
        documentId: id,
        label: 'Result',
      }),
    ]);
    expect(markers.delete).toHaveBeenCalledTimes(1);
  });

  it('returns a conflict when another change has advanced the version', async () => {
    documents.update.mockResolvedValue({ affected: 0 });

    await expect(
      service.update(id, { version: 2, title: 'New title' }, userId),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns not found when the document does not exist', async () => {
    documents.update.mockResolvedValue({ affected: 0 });
    documents.findOneBy.mockResolvedValue(null);

    await expect(
      service.update(id, { version: 2, title: 'New title' }, userId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
