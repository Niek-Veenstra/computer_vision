import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
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
  const service = new DocumentsService(
    documents as unknown as Repository<Document>,
    users as unknown as Repository<User>,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    users.existsBy.mockResolvedValue(true);
    documents.findOneBy.mockResolvedValue(document);
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
