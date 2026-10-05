import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { createHash } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { DataSource, type Repository } from 'typeorm';
import { User } from '../src/users/users.entity';
import { Document } from '../src/documents/documents.entity';
import { DocumentMarker } from '../src/documents/markers/document-marker.entity';
import { DocumentMarkersController } from '../src/documents/markers/document-markers.controller';
import { DocumentMarkersService } from '../src/documents/markers/document-markers.service';
import { Scanner } from '../src/scanners/scanner.entity';
import { ScannerApiKeyGuard } from '../src/scanners/scanner-api-key.guard';
import { ScannersService } from '../src/scanners/scanners.service';
import { CreateUsers1726899999999 } from '../src/database/migrations/1726899999999-CreateUsers';
import { CreateDocuments1726900000000 } from '../src/database/migrations/1726900000000-CreateDocuments';
import { AddUserTimestamps1789992000000 } from '../src/database/migrations/1789992000000-AddUserTimestamps';
import { CreateScanners1790000000001 } from '../src/database/migrations/1790000000001-CreateScanners';
import { AddUserLogo1790000000002 } from '../src/database/migrations/1790000000002-AddUserLogo';
import { CreateDocumentMarkers1790000000003 } from '../src/database/migrations/1790000000003-CreateDocumentMarkers';

jest.setTimeout(180_000);

describe('Document marker API with PostgreSQL (e2e)', () => {
  const documentId = 'ea8fdd81-d02f-43b0-9bc3-e798a0afe052';
  const ownerId = '81b160a4-9768-482b-946b-f3e76588e49b';
  const scannerId = '30000000-0000-4000-8000-000000000001';
  const firstMarkerId = 'f45e4bf4-88ca-42b7-843d-b781698be74c';
  const secondMarkerId = 'c12cf6b3-117e-4ead-b414-b5e147bad13e';
  const apiKey = `scn_${'a'.repeat(43)}`;

  let container: StartedPostgreSqlContainer;
  let app: INestApplication;
  let httpServer: Server;
  let dataSource: DataSource;
  let documents: Repository<Document>;
  let markers: Repository<DocumentMarker>;
  let scanners: Repository<Scanner>;
  let users: Repository<User>;

  function initialContent(): object {
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Before ' },
            {
              type: 'recognitionMarker',
              attrs: { id: firstMarkerId, label: 'First field' },
              content: [{ type: 'text', text: 'keep me' }],
            },
            { type: 'text', text: ' between ' },
            {
              type: 'recognitionMarker',
              attrs: { id: secondMarkerId, label: 'Second field' },
              content: [{ type: 'text', text: 'replace me' }],
            },
            { type: 'text', text: ' after' },
          ],
        },
      ],
    };
  }

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: container.getHost(),
          port: container.getPort(),
          username: container.getUsername(),
          password: container.getPassword(),
          database: container.getDatabase(),
          entities: [User, Document, DocumentMarker, Scanner],
          migrations: [
            CreateUsers1726899999999,
            CreateDocuments1726900000000,
            AddUserTimestamps1789992000000,
            CreateScanners1790000000001,
            AddUserLogo1790000000002,
            CreateDocumentMarkers1790000000003,
          ],
          migrationsRun: true,
        }),
        TypeOrmModule.forFeature([User, Document, DocumentMarker, Scanner]),
      ],
      controllers: [DocumentMarkersController],
      providers: [DocumentMarkersService, ScannersService, ScannerApiKeyGuard],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    httpServer = app.getHttpServer() as Server;
    dataSource = module.get(DataSource);
    documents = dataSource.getRepository(Document);
    markers = dataSource.getRepository(DocumentMarker);
    scanners = dataSource.getRepository(Scanner);
    users = dataSource.getRepository(User);
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE TABLE "document_markers", "documents", "scanners", "user" CASCADE',
    );

    await users.save({
      id: ownerId,
      email: 'reader@example.com',
      password: 'not-used-by-this-test',
      firstName: 'Test',
      lastName: 'Reader',
      birthDate: '2000-01-01',
      logoDataUrl: null,
    });
    await scanners.save({
      id: scannerId,
      ownerId,
      name: 'Integration scanner',
      keyHash: createHash('sha256').update(apiKey).digest('hex'),
      lastSeenAt: null,
      revokedAt: null,
    });
    await documents.save({
      id: documentId,
      title: 'Marker positions',
      content: initialContent(),
      version: 7,
      updatedById: ownerId,
    });
    await markers.save([
      {
        id: firstMarkerId,
        documentId,
        label: 'First field',
        lastOperationId: null,
        lastRequestHash: null,
        resultVersion: null,
        updatedById: null,
        scannerId: null,
      },
      {
        id: secondMarkerId,
        documentId,
        label: 'Second field',
        lastOperationId: null,
        lastRequestHash: null,
        resultVersion: null,
        updatedById: null,
        scannerId: null,
      },
    ]);
  });

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  it('persists an update at the addressed marker through the authenticated API', async () => {
    const operationId = '1480d919-14eb-49d4-8f40-50cf5bd815c9';

    await request(httpServer)
      .patch(`/documents/${documentId}/markers/${secondMarkerId}`)
      .set('X-Scanner-Key', apiKey)
      .send({
        operationId,
        version: 7,
        content: [
          { type: 'text', value: 'recognized: ' },
          { type: 'inlineMath', value: 'x^2' },
        ],
      })
      .expect(200)
      .expect({
        operationId,
        documentId,
        markerId: secondMarkerId,
        version: 8,
        applied: true,
      });

    const storedDocument = await documents.findOneByOrFail({ id: documentId });
    expect(storedDocument.version).toBe(8);
    expect(storedDocument.content).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Before ' },
            {
              type: 'recognitionMarker',
              attrs: { id: firstMarkerId, label: 'First field' },
              content: [{ type: 'text', text: 'keep me' }],
            },
            { type: 'text', text: ' between ' },
            {
              type: 'recognitionMarker',
              attrs: { id: secondMarkerId, label: 'Second field' },
              content: [
                { type: 'text', text: 'recognized: ' },
                { type: 'inlineMath', attrs: { latex: 'x^2' } },
              ],
            },
            { type: 'text', text: ' after' },
          ],
        },
      ],
    });

    const storedMarker = await markers.findOneByOrFail({
      id: secondMarkerId,
      documentId,
    });
    expect(storedMarker).toMatchObject({
      lastOperationId: operationId,
      resultVersion: 8,
      scannerId,
      updatedById: ownerId,
    });
    const storedScanner = await scanners.findOneByOrFail({ id: scannerId });
    expect(storedScanner.lastSeenAt).toBeInstanceOf(Date);

    await request(httpServer)
      .get(`/documents/${documentId}/markers`)
      .set('X-Scanner-Key', apiKey)
      .expect(200)
      .expect({
        documentId,
        version: 8,
        markers: [
          {
            id: firstMarkerId,
            label: 'First field',
            content: [{ type: 'text', value: 'keep me' }],
          },
          {
            id: secondMarkerId,
            label: 'Second field',
            content: [
              { type: 'text', value: 'recognized: ' },
              { type: 'inlineMath', value: 'x^2' },
            ],
          },
        ],
      });
  });

  it('clears marker content without moving or deleting the marker', async () => {
    const operationId = '1480d919-14eb-49d4-8f40-50cf5bd815c9';

    await request(httpServer)
      .patch(`/documents/${documentId}/markers/${firstMarkerId}`)
      .set('X-Scanner-Key', apiKey)
      .send({ operationId, version: 7, content: [] })
      .expect(200);

    const storedDocument = await documents.findOneByOrFail({ id: documentId });
    expect(storedDocument.content).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Before ' },
            {
              type: 'recognitionMarker',
              attrs: { id: firstMarkerId, label: 'First field' },
            },
            { type: 'text', text: ' between ' },
            {
              type: 'recognitionMarker',
              attrs: { id: secondMarkerId, label: 'Second field' },
              content: [{ type: 'text', text: 'replace me' }],
            },
            { type: 'text', text: ' after' },
          ],
        },
      ],
    });
  });

  it('returns the stored result when the same operation is retried', async () => {
    const operationId = '1480d919-14eb-49d4-8f40-50cf5bd815c9';
    const update = {
      operationId,
      version: 7,
      content: [{ type: 'text', value: 'recognized text' }],
    };
    const route = `/documents/${documentId}/markers/${firstMarkerId}`;

    await request(httpServer)
      .patch(route)
      .set('X-Scanner-Key', apiKey)
      .send(update)
      .expect(200)
      .expect({
        operationId,
        documentId,
        markerId: firstMarkerId,
        version: 8,
        applied: true,
      });

    await request(httpServer)
      .patch(route)
      .set('X-Scanner-Key', apiKey)
      .send(update)
      .expect(200)
      .expect({
        operationId,
        documentId,
        markerId: firstMarkerId,
        version: 8,
        applied: false,
      });

    await expect(
      documents.findOneByOrFail({ id: documentId }),
    ).resolves.toEqual(expect.objectContaining({ version: 8 }));
  });

  it('serializes concurrent updates so one stale version is rejected', async () => {
    const route = `/documents/${documentId}/markers/${secondMarkerId}`;
    const responses = await Promise.all([
      request(httpServer)
        .patch(route)
        .set('X-Scanner-Key', apiKey)
        .send({
          operationId: 'f94cd40b-caee-45c7-8c29-cd85d52886f8',
          version: 7,
          content: [{ type: 'text', value: 'first candidate' }],
        }),
      request(httpServer)
        .patch(route)
        .set('X-Scanner-Key', apiKey)
        .send({
          operationId: 'e1178405-dc02-4dd0-bfa6-4663b3286673',
          version: 7,
          content: [{ type: 'text', value: 'second candidate' }],
        }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    await expect(
      documents.findOneByOrFail({ id: documentId }),
    ).resolves.toEqual(expect.objectContaining({ version: 8 }));
  });

  it('rejects a stale version without changing the stored document', async () => {
    const originalDocument = await documents.findOneByOrFail({
      id: documentId,
    });

    await request(httpServer)
      .patch(`/documents/${documentId}/markers/${firstMarkerId}`)
      .set('X-Scanner-Key', apiKey)
      .send({
        operationId: '1480d919-14eb-49d4-8f40-50cf5bd815c9',
        version: 6,
        content: [{ type: 'text', value: 'must not be applied' }],
      })
      .expect(409);

    const storedDocument = await documents.findOneByOrFail({ id: documentId });
    expect(storedDocument.version).toBe(7);
    expect(storedDocument.content).toEqual(originalDocument.content);
  });

  it('rejects an unknown marker without changing the stored document', async () => {
    const unknownMarkerId = '7820da33-b244-48fb-8d1f-4f2fb14fe790';
    const originalDocument = await documents.findOneByOrFail({
      id: documentId,
    });

    await request(httpServer)
      .patch(`/documents/${documentId}/markers/${unknownMarkerId}`)
      .set('X-Scanner-Key', apiKey)
      .send({
        operationId: '1480d919-14eb-49d4-8f40-50cf5bd815c9',
        version: 7,
        content: [{ type: 'text', value: 'must not be applied' }],
      })
      .expect(404);

    const storedDocument = await documents.findOneByOrFail({ id: documentId });
    expect(storedDocument.version).toBe(7);
    expect(storedDocument.content).toEqual(originalDocument.content);
  });

  it('rejects invalid marker content without changing the stored document', async () => {
    const originalDocument = await documents.findOneByOrFail({
      id: documentId,
    });

    await request(httpServer)
      .patch(`/documents/${documentId}/markers/${firstMarkerId}`)
      .set('X-Scanner-Key', apiKey)
      .send({
        operationId: '1480d919-14eb-49d4-8f40-50cf5bd815c9',
        version: 7,
        content: [{ type: 'paragraph', value: 'unsupported' }],
      })
      .expect(400);

    const storedDocument = await documents.findOneByOrFail({ id: documentId });
    expect(storedDocument.version).toBe(7);
    expect(storedDocument.content).toEqual(originalDocument.content);
  });

  it('requires a valid scanner key', async () => {
    await request(httpServer)
      .get(`/documents/${documentId}/markers`)
      .expect(401);

    await request(httpServer)
      .get(`/documents/${documentId}/markers`)
      .set('X-Scanner-Key', `scn_${'z'.repeat(43)}`)
      .expect(401);
  });
});
