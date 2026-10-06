import { JwtModule } from '@nestjs/jwt';
import type { Server } from 'node:http';
import request from 'supertest';
import { DataSource, type Repository } from 'typeorm';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { UserJwtGuard } from '../src/auth/user-jwt.guard';
import { UserExistsGuard } from '../src/users/guards/user-exists/user-exists.guard';
import { User } from '../src/users/users.entity';
import { UsersController } from '../src/users/users.controller';
import { UsersRepository } from '../src/users/users.repository';
import { UsersService } from '../src/users/users.service';
import {
  type PostgresTestApplication,
  startPostgresTestApplication,
  truncateTestDatabase,
} from './support/postgres-test-application';

type PublicUserResponse = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  birthDate: string;
};

type AuthenticationResponse = {
  token: string;
};

jest.setTimeout(180_000);

describe('Users and authentication API with PostgreSQL (e2e)', () => {
  const jwtSecret = 'users-auth-integration-test-secret';
  const originalPassword = 'correct horse battery staple';

  let testApplication: PostgresTestApplication;
  let httpServer: Server;
  let dataSource: DataSource;
  let users: Repository<User>;

  function publicUser(body: unknown): PublicUserResponse {
    return body as PublicUserResponse;
  }

  function authentication(body: unknown): AuthenticationResponse {
    return body as AuthenticationResponse;
  }

  async function createUser(
    email = 'alice@example.com',
  ): Promise<PublicUserResponse> {
    const response = await request(httpServer)
      .post('/users')
      .send({
        email,
        password: originalPassword,
        firstName: 'Alice',
        lastName: 'Reader',
        birthDate: '1990-05-20',
      })
      .expect(201);
    return publicUser(response.body as unknown);
  }

  async function authenticate(
    email = 'alice@example.com',
    password = originalPassword,
  ): Promise<string> {
    const response = await request(httpServer)
      .post('/auth/authenticate')
      .send({ email, password })
      .expect(201);
    return authentication(response.body as unknown).token;
  }

  beforeAll(async () => {
    testApplication = await startPostgresTestApplication({
      imports: [JwtModule.register({ secret: jwtSecret })],
      controllers: [UsersController, AuthController],
      providers: [
        UsersRepository,
        UsersService,
        AuthService,
        UserJwtGuard,
        UserExistsGuard,
      ],
    });
    httpServer = testApplication.httpServer;
    dataSource = testApplication.dataSource;
    users = dataSource.getRepository(User);
  });

  beforeEach(async () => {
    await truncateTestDatabase(dataSource);
  });

  afterAll(async () => {
    await testApplication.close();
  });

  it('creates a public user profile and hashes the stored password', async () => {
    const created = await createUser();

    expect(created).toMatchObject({
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Reader',
      birthDate: '1990-05-20',
    });
    expect(created).not.toHaveProperty('password');
    expect(created).not.toHaveProperty('logoDataUrl');

    const stored = await users.findOneByOrFail({ id: created.id });
    expect(stored.password).not.toBe(originalPassword);
    expect(stored.password).toMatch(/^\$2[aby]\$/);
  });

  it('validates registration and rejects duplicate email addresses', async () => {
    await createUser();

    await request(httpServer)
      .post('/users')
      .send({
        email: 'alice@example.com',
        password: 'another password',
        firstName: 'Another',
        lastName: 'Alice',
        birthDate: '1991-01-01',
      })
      .expect(409);
    await request(httpServer)
      .post('/users')
      .send({
        email: 'not-an-email',
        password: originalPassword,
        firstName: 'Invalid',
        lastName: 'Email',
        birthDate: 'not-a-date',
      })
      .expect(400);

    await expect(users.count()).resolves.toBe(1);
  });

  it('authenticates a user and rejects incorrect credentials', async () => {
    const created = await createUser();
    const token = await authenticate();

    expect(token.split('.')).toHaveLength(3);
    await request(httpServer)
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          id: created.id,
          email: created.email,
          logoDataUrl: null,
        });
      });

    await request(httpServer)
      .post('/auth/authenticate')
      .send({ email: created.email, password: 'wrong password' })
      .expect(401);
    await request(httpServer)
      .post('/auth/authenticate')
      .send({ email: 'missing@example.com', password: originalPassword })
      .expect(404);
  });

  it('lists and retrieves public profiles without private fields', async () => {
    const alice = await createUser();
    const bob = await createUser('bob@example.com');

    await request(httpServer)
      .get('/users')
      .expect(200)
      .expect((response) => {
        const body = response.body as unknown as PublicUserResponse[];
        expect(body).toHaveLength(2);
        expect(body.map((user) => user.email).sort()).toEqual([
          'alice@example.com',
          'bob@example.com',
        ]);
        body.forEach((user) => {
          expect(user).not.toHaveProperty('password');
          expect(user).not.toHaveProperty('logoDataUrl');
        });
      });

    await request(httpServer).get(`/users/${bob.id}`).expect(200).expect(bob);
    await request(httpServer)
      .get('/users/7820da33-b244-48fb-8d1f-4f2fb14fe790')
      .expect(404);
    expect(alice.id).not.toBe(bob.id);
  });

  it('updates the authenticated profile and validates email and logo data', async () => {
    const created = await createUser();
    await createUser('occupied@example.com');
    const token = await authenticate();
    const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const logoDataUrl = `data:image/png;base64,${pngHeader.toString('base64')}`;

    await request(httpServer)
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: '  Alicia  ',
        email: '  ALICIA@EXAMPLE.COM ',
        logoDataUrl,
      })
      .expect(200)
      .expect({
        id: created.id,
        email: 'alicia@example.com',
        firstName: 'Alicia',
        lastName: 'Reader',
        birthDate: '1990-05-20',
        logoDataUrl,
      });

    await request(httpServer)
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'occupied@example.com' })
      .expect(409);
    await request(httpServer)
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ logoDataUrl: 'data:image/png;base64,bm90LWEtcG5n' })
      .expect(400);
  });

  it('changes the password and uses it for subsequent authentication', async () => {
    await createUser();
    const token = await authenticate();
    const newPassword = 'new secure password';

    await request(httpServer)
      .patch('/users/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'incorrect', newPassword })
      .expect(400);
    await request(httpServer)
      .patch('/users/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: originalPassword, newPassword })
      .expect(204);

    await request(httpServer)
      .post('/auth/authenticate')
      .send({ email: 'alice@example.com', password: originalPassword })
      .expect(401);
    await authenticate('alice@example.com', newPassword);
  });

  it('requires a valid JWT for private profile operations', async () => {
    await createUser();

    await request(httpServer).get('/users/me').expect(401);
    await request(httpServer)
      .patch('/users/me')
      .set('Authorization', 'Bearer invalid-token')
      .send({ firstName: 'Unauthorized' })
      .expect(401);
  });
});
