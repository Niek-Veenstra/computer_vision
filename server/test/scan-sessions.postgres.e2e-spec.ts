import { JwtModule, JwtService } from '@nestjs/jwt';
import type { Server } from 'node:http';
import request from 'supertest';
import { DataSource, type Repository } from 'typeorm';
import { UserJwtGuard } from '../src/auth/user-jwt.guard';
import { Document } from '../src/documents/documents.entity';
import { ScanSessionStatus } from '../src/documents/scan-sessions/scan-session.entity';
import { DocumentScanSessionsController } from '../src/documents/scan-sessions/scan-sessions.controller';
import { ScanSessionsService } from '../src/documents/scan-sessions/scan-sessions.service';
import { Scanner } from '../src/scanners/scanner.entity';
import { User } from '../src/users/users.entity';
import {
  type PostgresTestApplication,
  startPostgresTestApplication,
  truncateTestDatabase,
} from './support/postgres-test-application';

type ScanSessionResponse = {
  id: string;
  documentId: string;
  scannerId: string;
  createdById: string;
  status: ScanSessionStatus;
  completedAt: string | null;
};

jest.setTimeout(180_000);

describe('Document scan sessions API with PostgreSQL (e2e)', () => {
  const jwtSecret = 'scan-session-integration-test-secret';
  const userId = '81b160a4-9768-482b-946b-f3e76588e49b';
  const otherUserId = '1fcf3646-26ec-45f4-aaf5-d871980ddf99';

  let testApplication: PostgresTestApplication;
  let httpServer: Server;
  let dataSource: DataSource;
  let users: Repository<User>;
  let documents: Repository<Document>;
  let scanners: Repository<Scanner>;
  let token: string;
  let otherToken: string;
  let document: Document;
  let scanner: Scanner;

  beforeAll(async () => {
    testApplication = await startPostgresTestApplication({
      imports: [JwtModule.register({ secret: jwtSecret })],
      controllers: [DocumentScanSessionsController],
      providers: [ScanSessionsService, UserJwtGuard],
    });

    httpServer = testApplication.httpServer;
    dataSource = testApplication.dataSource;
    users = dataSource.getRepository(User);
    documents = dataSource.getRepository(Document);
    scanners = dataSource.getRepository(Scanner);

    const jwt = testApplication.module.get(JwtService);
    token = await jwt.signAsync({ sub: userId });
    otherToken = await jwt.signAsync({ sub: otherUserId });
  });

  beforeEach(async () => {
    await truncateTestDatabase(dataSource);
    await users.save([
      {
        id: userId,
        email: 'scanner-owner@example.com',
        password: 'not-used-by-this-test',
        firstName: 'Scanner',
        lastName: 'Owner',
        birthDate: '2000-01-01',
        logoDataUrl: null,
      },
      {
        id: otherUserId,
        email: 'other@example.com',
        password: 'not-used-by-this-test',
        firstName: 'Other',
        lastName: 'User',
        birthDate: '2000-01-01',
        logoDataUrl: null,
      },
    ]);
    document = await documents.save({
      title: 'Document with scanning',
      content: { type: 'doc' },
      ownerId: userId,
      updatedById: userId,
    });
    scanner = await scanners.save({
      ownerId: userId,
      name: 'Document scanner',
      keyHash: 'a'.repeat(64),
      lastSeenAt: null,
      revokedAt: null,
    });
  });

  afterAll(async () => {
    await testApplication.close();
  });

  it('starts, lists and stops a scan session for a document', async () => {
    const startResponse = await request(httpServer)
      .post(`/documents/${document.id}/scan-sessions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ scannerId: scanner.id })
      .expect(201);
    const started = startResponse.body as unknown as ScanSessionResponse;

    expect(started).toMatchObject({
      documentId: document.id,
      scannerId: scanner.id,
      createdById: userId,
      status: ScanSessionStatus.Active,
      completedAt: null,
    });

    await request(httpServer)
      .get(`/documents/${document.id}/scan-sessions`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual([
          expect.objectContaining({
            id: started.id,
            status: ScanSessionStatus.Active,
          }),
        ]);
      });

    await request(httpServer)
      .patch(`/documents/${document.id}/scan-sessions/${started.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: ScanSessionStatus.Completed })
      .expect(200)
      .expect((response) => {
        const body = response.body as unknown as ScanSessionResponse;
        expect(body).toMatchObject({
          id: started.id,
          status: ScanSessionStatus.Completed,
        });
        expect(body.completedAt).toEqual(expect.any(String));
      });

    await request(httpServer)
      .post(`/documents/${document.id}/scan-sessions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ scannerId: scanner.id })
      .expect(201);
  });

  it('deletes completed sessions without deleting the document', async () => {
    const startResponse = await request(httpServer)
      .post(`/documents/${document.id}/scan-sessions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ scannerId: scanner.id })
      .expect(201);
    const started = startResponse.body as unknown as ScanSessionResponse;

    await request(httpServer)
      .delete(`/documents/${document.id}/scan-sessions/${started.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
    await request(httpServer)
      .patch(`/documents/${document.id}/scan-sessions/${started.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: ScanSessionStatus.Completed })
      .expect(200);
    await request(httpServer)
      .delete(`/documents/${document.id}/scan-sessions/${started.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
    await request(httpServer)
      .get(`/documents/${document.id}/scan-sessions`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect([]);
    await expect(documents.existsBy({ id: document.id })).resolves.toBe(true);
  });

  it('only exposes and stops sessions created by the current user', async () => {
    const startResponse = await request(httpServer)
      .post(`/documents/${document.id}/scan-sessions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ scannerId: scanner.id })
      .expect(201);
    const started = startResponse.body as unknown as ScanSessionResponse;

    await request(httpServer)
      .get(`/documents/${document.id}/scan-sessions`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
    await request(httpServer)
      .patch(`/documents/${document.id}/scan-sessions/${started.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ status: ScanSessionStatus.Completed })
      .expect(404);
  });

  it('rejects unsupported status changes and missing documents', async () => {
    const startResponse = await request(httpServer)
      .post(`/documents/${document.id}/scan-sessions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ scannerId: scanner.id })
      .expect(201);
    const started = startResponse.body as unknown as ScanSessionResponse;

    await request(httpServer)
      .patch(`/documents/${document.id}/scan-sessions/${started.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: ScanSessionStatus.Cancelled })
      .expect(400);
    await request(httpServer)
      .get('/documents/15d79d83-e70c-4afb-8ab7-c291b26a2843/scan-sessions')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});
