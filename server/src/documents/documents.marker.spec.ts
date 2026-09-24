import { createHash } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from '../users/users.entity';
import { DocumentMarker } from './document-marker.entity';
import { Document } from './documents.entity';
import { DocumentsService } from './documents.service';
import type { UpdateDocumentMarkerDto } from './dto/update-document-marker.dto';

describe('DocumentsService.updateMarker', () => {
  const id = 'ea8fdd81-d02f-43b0-9bc3-e798a0afe052';
  const userId = '81b160a4-9768-482b-946b-f3e76588e49b';
  const markerId = 'f45e4bf4-88ca-42b7-843d-b781698be74c';
  const scannerId = '30000000-0000-4000-8000-000000000001';
  const operationId = '1480d919-14eb-49d4-8f40-50cf5bd815c9';
  const dto: UpdateDocumentMarkerDto = {
    operationId,
    version: 3,
    content: [{ type: 'inlineMath', value: '8-4=4' }],
  };
  const documents = { findOneBy: jest.fn() };
  const users = { existsBy: jest.fn() };
  const transactionDocuments = { findOne: jest.fn(), save: jest.fn() };
  const markers = {
    findOneBy: jest.fn(),
    create: jest.fn((value: unknown) => value),
    save: jest.fn(),
  };
  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Document) return transactionDocuments;
      return markers;
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
    markers.findOneBy.mockResolvedValue(null);
    transactionDocuments.save.mockImplementation((value: unknown) => value);
    markers.save.mockImplementation((value: unknown) => value);
    transactionDocuments.findOne.mockResolvedValue({
      id,
      version: 3,
      updatedById: userId,
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'recognitionMarker',
                attrs: { id: markerId, label: 'Result' },
              },
            ],
          },
        ],
      },
    });
  });

  it('updates marker content without removing the marker', async () => {
    await expect(
      service.updateMarker(id, markerId, dto, userId, scannerId),
    ).resolves.toEqual({
      operationId,
      documentId: id,
      markerId,
      version: 4,
      applied: true,
    });

    expect(transactionDocuments.save).toHaveBeenCalledWith(
      expect.objectContaining({
        version: 4,
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'recognitionMarker',
                  attrs: { id: markerId, label: 'Result' },
                  content: [{ type: 'inlineMath', attrs: { latex: '8-4=4' } }],
                },
              ],
            },
          ],
        },
      }),
    );
    expect(markers.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: markerId, scannerId, resultVersion: 4 }),
    );
  });

  it('returns the original result when the latest operation is retried', async () => {
    const requestHash = createHash('sha256')
      .update(JSON.stringify({ version: 3, markerId, content: dto.content }))
      .digest('hex');
    markers.findOneBy.mockResolvedValueOnce({
      id: markerId,
      documentId: id,
      lastOperationId: operationId,
      lastRequestHash: requestHash,
      resultVersion: 4,
      updatedById: userId,
      scannerId,
    } as DocumentMarker);

    await expect(
      service.updateMarker(id, markerId, dto, userId, scannerId),
    ).resolves.toEqual({
      operationId,
      documentId: id,
      markerId,
      version: 4,
      applied: false,
    });
    expect(transactionDocuments.save).not.toHaveBeenCalled();
  });

  it('rejects a stale document version', async () => {
    transactionDocuments.findOne.mockResolvedValue({
      id,
      version: 4,
      content: {
        type: 'doc',
        content: [{ type: 'recognitionMarker', attrs: { id: markerId } }],
      },
    });

    await expect(
      service.updateMarker(id, markerId, dto, userId, scannerId),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transactionDocuments.save).not.toHaveBeenCalled();
  });
});
