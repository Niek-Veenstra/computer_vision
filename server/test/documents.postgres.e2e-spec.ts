import { JwtModule, JwtService } from '@nestjs/jwt';
import type { Server } from 'node:http';
import request from 'supertest';
import { DataSource, type Repository } from 'typeorm';
import { UserJwtGuard } from '../src/auth/user-jwt.guard';
import { Document } from '../src/documents/documents.entity';
import { DocumentsController } from '../src/documents/documents.controller';
import { DocumentsService } from '../src/documents/documents.service';
import { DocumentMarker } from '../src/documents/markers/document-marker.entity';
import { DocumentMarkersService } from '../src/documents/markers/document-markers.service';
import { User } from '../src/users/users.entity';
import {
  type PostgresTestApplication,
  startPostgresTestApplication,
  truncateTestDatabase,
} from './support/postgres-test-application';

type DocumentResponse = {
  id: string;
  title: string;
  content: object;
  version: number;
  ownerId: string;
  updatedById: string;
};

jest.setTimeout(180_000);

describe('Documents API with PostgreSQL (e2e)', () => {
  const jwtSecret = 'documents-integration-test-secret';
  const userId = '81b160a4-9768-482b-946b-f3e76588e49b';
  const otherUserId = '1fcf3646-26ec-45f4-aaf5-d871980ddf99';
  const firstMarkerId = 'f45e4bf4-88ca-42b7-843d-b781698be74c';
  const secondMarkerId = 'c12cf6b3-117e-4ead-b414-b5e147bad13e';

  let testApplication: PostgresTestApplication;
  let httpServer: Server;
  let dataSource: DataSource;
  let documents: Repository<Document>;
  let markers: Repository<DocumentMarker>;
  let users: Repository<User>;
  let token: string;
  let otherToken: string;

  function documentResponse(body: unknown): DocumentResponse {
    return body as DocumentResponse;
  }

  function contentWithMarker(markerId = firstMarkerId): object {
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Before ' },
            {
              type: 'recognitionMarker',
              attrs: { id: markerId, label: 'Recognition field' },
              content: [{ type: 'text', text: 'pending' }],
            },
            { type: 'text', text: ' after' },
          ],
        },
      ],
    };
  }

  async function createDocument(
    title = 'Test document',
    content = contentWithMarker(),
  ): Promise<DocumentResponse> {
    const response = await request(httpServer)
      .post('/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title, content })
      .expect(201);
    return documentResponse(response.body as unknown);
  }

  beforeAll(async () => {
    testApplication = await startPostgresTestApplication({
      imports: [JwtModule.register({ secret: jwtSecret })],
      controllers: [DocumentsController],
      providers: [DocumentsService, DocumentMarkersService, UserJwtGuard],
    });
    httpServer = testApplication.httpServer;
    dataSource = testApplication.dataSource;
    documents = dataSource.getRepository(Document);
    markers = dataSource.getRepository(DocumentMarker);
    users = dataSource.getRepository(User);

    const jwt = testApplication.module.get(JwtService);
    token = await jwt.signAsync({ sub: userId });
    otherToken = await jwt.signAsync({ sub: otherUserId });
  });

  beforeEach(async () => {
    await truncateTestDatabase(dataSource);
    await users.save([
      {
        id: userId,
        email: 'editor@example.com',
        password: 'not-used-by-this-test',
        firstName: 'Document',
        lastName: 'Editor',
        birthDate: '1990-05-20',
        logoDataUrl: null,
      },
      {
        id: otherUserId,
        email: 'other-editor@example.com',
        password: 'not-used-by-this-test',
        firstName: 'Other',
        lastName: 'Editor',
        birthDate: '1991-06-21',
        logoDataUrl: null,
      },
    ]);
  });

  afterAll(async () => {
    await testApplication.close();
  });

  it('creates a document and synchronizes its recognition markers', async () => {
    const created = await createDocument();

    expect(created).toMatchObject({
      title: 'Test document',
      content: contentWithMarker(),
      version: 1,
      ownerId: userId,
      updatedById: userId,
    });
    const storedDocument = await documents.findOneByOrFail({ id: created.id });
    expect(storedDocument.content).toEqual(contentWithMarker());
    await expect(markers.findBy({ documentId: created.id })).resolves.toEqual([
      expect.objectContaining({
        id: firstMarkerId,
        documentId: created.id,
        label: 'Recognition field',
      }),
    ]);
  });

  it('requires JWT authentication and validates document input', async () => {
    await request(httpServer).get('/documents').expect(401);
    await request(httpServer)
      .post('/documents')
      .set('Authorization', 'Bearer invalid-token')
      .send({ title: 'Unauthorized', content: { type: 'doc' } })
      .expect(401);
    await request(httpServer)
      .post('/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '', content: [] })
      .expect(400);

    await expect(documents.count()).resolves.toBe(0);
  });

  it('lists documents and retrieves one by UUID', async () => {
    const first = await createDocument('First document', { type: 'doc' });
    const second = await createDocument('Second document', { type: 'doc' });

    await request(httpServer)
      .get('/documents')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        const body = response.body as unknown as DocumentResponse[];
        expect(body).toHaveLength(2);
        expect(body.map((document) => document.id)).toEqual(
          expect.arrayContaining([first.id, second.id]),
        );
      });

    await request(httpServer)
      .get(`/documents/${first.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          id: first.id,
          title: 'First document',
        });
      });
    await request(httpServer)
      .get('/documents/not-a-uuid')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    await request(httpServer)
      .get('/documents/7820da33-b244-48fb-8d1f-4f2fb14fe790')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('does not expose one users documents to another user', async () => {
    const created = await createDocument();

    await request(httpServer)
      .get('/documents')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200)
      .expect([]);
    await request(httpServer)
      .get(`/documents/${created.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
    await request(httpServer)
      .patch(`/documents/${created.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ version: 1, title: 'Unauthorized edit' })
      .expect(404);
    await request(httpServer)
      .delete(`/documents/${created.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
    await expect(
      documents.findOneBy({ id: created.id }),
    ).resolves.not.toBeNull();
  });

  it('updates content, increments the version and synchronizes marker rows', async () => {
    const created = await createDocument();
    const nextContent = contentWithMarker(secondMarkerId);

    await request(httpServer)
      .patch(`/documents/${created.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        version: 1,
        title: 'Updated document',
        content: nextContent,
      })
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          id: created.id,
          title: 'Updated document',
          content: nextContent,
          version: 2,
          updatedById: userId,
        });
      });

    await expect(markers.findBy({ documentId: created.id })).resolves.toEqual([
      expect.objectContaining({
        id: secondMarkerId,
        documentId: created.id,
      }),
    ]);
  });

  it('rejects stale and empty updates without changing the document', async () => {
    const created = await createDocument();

    await request(httpServer)
      .patch(`/documents/${created.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ version: 2, title: 'Stale update' })
      .expect(409);
    await request(httpServer)
      .patch(`/documents/${created.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ version: 1 })
      .expect(400);

    const stored = await documents.findOneByOrFail({ id: created.id });
    expect(stored).toMatchObject({ title: created.title, version: 1 });
  });

  it('deletes a document and cascades its marker rows', async () => {
    const created = await createDocument();

    await request(httpServer)
      .delete(`/documents/${created.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await expect(documents.findOneBy({ id: created.id })).resolves.toBeNull();
    await expect(markers.countBy({ documentId: created.id })).resolves.toBe(0);
    await request(httpServer)
      .get(`/documents/${created.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});
