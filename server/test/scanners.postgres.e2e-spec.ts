import { JwtModule, JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { DataSource, type Repository } from 'typeorm';
import { UserJwtGuard } from '../src/auth/user-jwt.guard';
import { Scanner } from '../src/scanners/scanner.entity';
import { ScannerApiKeyGuard } from '../src/scanners/scanner-api-key.guard';
import {
  ScannerIdentityController,
  ScannersController,
} from '../src/scanners/scanners.controller';
import { ScannersService } from '../src/scanners/scanners.service';
import { User } from '../src/users/users.entity';
import {
  type PostgresTestApplication,
  startPostgresTestApplication,
  truncateTestDatabase,
} from './support/postgres-test-application';

type ScannerResponse = {
  id: string;
  name: string;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
};

type CreatedScannerResponse = {
  scanner: ScannerResponse;
  apiKey: string;
};

jest.setTimeout(180_000);

describe('Scanner API with PostgreSQL (e2e)', () => {
  const jwtSecret = 'scanner-integration-test-secret';
  const ownerId = '81b160a4-9768-482b-946b-f3e76588e49b';
  const otherOwnerId = '1fcf3646-26ec-45f4-aaf5-d871980ddf99';

  let testApplication: PostgresTestApplication;
  let httpServer: Server;
  let dataSource: DataSource;
  let scanners: Repository<Scanner>;
  let users: Repository<User>;
  let ownerToken: string;
  let otherOwnerToken: string;

  function createdScanner(body: unknown): CreatedScannerResponse {
    return body as CreatedScannerResponse;
  }

  beforeAll(async () => {
    testApplication = await startPostgresTestApplication({
      imports: [JwtModule.register({ secret: jwtSecret })],
      controllers: [ScannersController, ScannerIdentityController],
      providers: [ScannersService, ScannerApiKeyGuard, UserJwtGuard],
    });

    httpServer = testApplication.httpServer;
    dataSource = testApplication.dataSource;
    scanners = dataSource.getRepository(Scanner);
    users = dataSource.getRepository(User);

    const jwt = testApplication.module.get(JwtService);
    ownerToken = await jwt.signAsync({ sub: ownerId });
    otherOwnerToken = await jwt.signAsync({ sub: otherOwnerId });
  });

  beforeEach(async () => {
    await truncateTestDatabase(dataSource);
    await users.save([
      {
        id: ownerId,
        email: 'owner@example.com',
        password: 'not-used-by-this-test',
        firstName: 'Scanner',
        lastName: 'Owner',
        birthDate: '2000-01-01',
        logoDataUrl: null,
      },
      {
        id: otherOwnerId,
        email: 'other@example.com',
        password: 'not-used-by-this-test',
        firstName: 'Other',
        lastName: 'Owner',
        birthDate: '2000-01-01',
        logoDataUrl: null,
      },
    ]);
  });

  afterAll(async () => {
    await testApplication.close();
  });

  it('creates a scanner and authenticates its returned API key', async () => {
    const createResponse = await request(httpServer)
      .post('/scanners')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: '  Reception scanner  ' })
      .expect(201);
    const body = createdScanner(createResponse.body as unknown);

    expect(body.scanner.name).toBe('Reception scanner');
    expect(body.scanner.createdAt).toEqual(expect.any(String));
    expect(body.scanner.lastSeenAt).toBeNull();
    expect(body.scanner.revokedAt).toBeNull();
    expect(body.apiKey).toMatch(/^scn_[A-Za-z0-9_-]{43}$/);
    expect(body.scanner).not.toHaveProperty('keyHash');

    const storedScanner = await scanners.findOneByOrFail({
      id: body.scanner.id,
    });
    expect(storedScanner.ownerId).toBe(ownerId);
    expect(storedScanner.keyHash).toBe(
      createHash('sha256').update(body.apiKey).digest('hex'),
    );

    await request(httpServer)
      .get('/scanner-auth/me')
      .set('X-Scanner-Key', body.apiKey)
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          id: body.scanner.id,
          name: 'Reception scanner',
          ownerId,
        });
      });

    const authenticatedScanner = await scanners.findOneByOrFail({
      id: body.scanner.id,
    });
    expect(authenticatedScanner.lastSeenAt).toBeInstanceOf(Date);
  });

  it('rejects invalid scanner creation data', async () => {
    const invalidBodies = [
      { name: '' },
      { name: 'x'.repeat(101) },
      { name: 'Valid name', unexpected: true },
    ];

    for (const body of invalidBodies) {
      await request(httpServer)
        .post('/scanners')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(body)
        .expect(400);
    }

    await expect(scanners.count()).resolves.toBe(0);
  });

  it('lists only scanners owned by the authenticated user', async () => {
    await request(httpServer)
      .post('/scanners')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Owner scanner' })
      .expect(201);
    await request(httpServer)
      .post('/scanners')
      .set('Authorization', `Bearer ${otherOwnerToken}`)
      .send({ name: 'Other scanner' })
      .expect(201);

    await request(httpServer)
      .get('/scanners')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect((response) => {
        const body = response.body as unknown as ScannerResponse[];
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({ name: 'Owner scanner' });
      });
  });

  it('rotates a key and invalidates the previous key', async () => {
    const createResponse = await request(httpServer)
      .post('/scanners')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Rotating scanner' })
      .expect(201);
    const created = createdScanner(createResponse.body as unknown);

    const rotateResponse = await request(httpServer)
      .post(`/scanners/${created.scanner.id}/rotate-key`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    const rotated = createdScanner(rotateResponse.body as unknown);

    expect(rotated.apiKey).not.toBe(created.apiKey);
    await request(httpServer)
      .get('/scanner-auth/me')
      .set('X-Scanner-Key', created.apiKey)
      .expect(401);
    await request(httpServer)
      .get('/scanner-auth/me')
      .set('X-Scanner-Key', rotated.apiKey)
      .expect(200);
  });

  it('revokes a scanner and rejects its API key and key rotation', async () => {
    const createResponse = await request(httpServer)
      .post('/scanners')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Revoked scanner' })
      .expect(201);
    const created = createdScanner(createResponse.body as unknown);

    await request(httpServer)
      .patch(`/scanners/${created.scanner.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ revoked: true })
      .expect(200)
      .expect((response) => {
        const body = response.body as unknown as ScannerResponse;
        expect(typeof body.revokedAt).toBe('string');
      });

    await request(httpServer)
      .get('/scanner-auth/me')
      .set('X-Scanner-Key', created.apiKey)
      .expect(401);
    await request(httpServer)
      .post(`/scanners/${created.scanner.id}/rotate-key`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(409);
  });

  it('prevents another user from managing a scanner', async () => {
    const createResponse = await request(httpServer)
      .post('/scanners')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Private scanner' })
      .expect(201);
    const created = createdScanner(createResponse.body as unknown);

    await request(httpServer)
      .post(`/scanners/${created.scanner.id}/rotate-key`)
      .set('Authorization', `Bearer ${otherOwnerToken}`)
      .expect(404);
    await request(httpServer)
      .patch(`/scanners/${created.scanner.id}`)
      .set('Authorization', `Bearer ${otherOwnerToken}`)
      .send({ revoked: true })
      .expect(404);
    await request(httpServer)
      .delete(`/scanners/${created.scanner.id}`)
      .set('Authorization', `Bearer ${otherOwnerToken}`)
      .expect(404);
  });

  it('deletes an owned scanner and invalidates its API key', async () => {
    const createResponse = await request(httpServer)
      .post('/scanners')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Disposable scanner' })
      .expect(201);
    const created = createdScanner(createResponse.body as unknown);

    await request(httpServer)
      .delete(`/scanners/${created.scanner.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);

    await expect(
      scanners.findOneBy({ id: created.scanner.id }),
    ).resolves.toBeNull();
    await request(httpServer)
      .get('/scanner-auth/me')
      .set('X-Scanner-Key', created.apiKey)
      .expect(401);
  });

  it('requires a valid JWT for scanner management', async () => {
    await request(httpServer).get('/scanners').expect(401);
    await request(httpServer)
      .post('/scanners')
      .set('Authorization', 'Bearer invalid-token')
      .send({ name: 'Unauthorized scanner' })
      .expect(401);
  });
});
