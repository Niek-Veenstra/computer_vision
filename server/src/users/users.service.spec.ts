import { BadRequestException, ConflictException } from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { UsersService } from './users.service';
import type { UsersRepository } from './users.repository';
import type { User } from './users.entity';

function user(): User {
  return {
    id: 'c8df30f2-8c3e-4b6c-93cc-675f521da39b',
    email: 'person@example.com',
    password: 'stored-hash',
    firstName: 'Pat',
    lastName: 'Smith',
    birthDate: '2000-01-01',
    logoDataUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('UsersService account settings', () => {
  const repository = {
    findById: jest.fn((): Promise<User | null> => Promise.resolve(user())),
    findByEmail: jest.fn((): Promise<User | null> => Promise.resolve(null)),
    find: jest.fn((): Promise<User[]> => Promise.resolve([])),
    save: jest.fn((value: User): Promise<User> => Promise.resolve(value)),
  };
  const service = new UsersService(repository as unknown as UsersRepository);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findById.mockImplementation(() => Promise.resolve(user()));
    repository.findByEmail.mockImplementation(() => Promise.resolve(null));
    repository.find.mockImplementation(() => Promise.resolve([]));
  });

  it('returns account details without a password hash', async () => {
    const profile = await service.findProfile(user().id);

    expect(profile).toEqual({
      id: user().id,
      email: 'person@example.com',
      firstName: 'Pat',
      lastName: 'Smith',
      birthDate: '2000-01-01',
      logoDataUrl: null,
    });
    expect(profile).not.toHaveProperty('password');
  });

  it('omits logo data and password hashes from the public user list', async () => {
    const account = user();
    account.logoDataUrl = 'data:image/png;base64,example';
    repository.find.mockImplementation(() => Promise.resolve([account]));

    const [publicUser] = await service.findAllPublic();

    expect(publicUser).not.toHaveProperty('password');
    expect(publicUser).not.toHaveProperty('logoDataUrl');
  });

  it('rejects another account’s email address', async () => {
    repository.findByEmail.mockImplementation(() =>
      Promise.resolve({
        ...user(),
        id: '66bbfc24-d35d-4946-8a1b-3bab00500a98',
      }),
    );

    await expect(
      service.updateProfile(user().id, { email: 'taken@example.com' }),
    ).rejects.toThrow(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects an SVG disguised as a PNG logo', async () => {
    const disguisedLogo = `data:image/png;base64,${Buffer.from('<svg/>').toString('base64')}`;

    await expect(
      service.updateProfile(user().id, { logoDataUrl: disguisedLogo }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('requires the current password before changing it', async () => {
    const existing = user();
    existing.password = await hash('current-password', 4);
    repository.findById.mockImplementation(() => Promise.resolve(existing));

    await expect(
      service.changePassword(existing.id, {
        currentPassword: 'wrong-password',
        newPassword: 'new-password',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('stores the new password as a hash', async () => {
    const existing = user();
    existing.password = await hash('current-password', 4);
    repository.findById.mockImplementation(() => Promise.resolve(existing));

    await service.changePassword(existing.id, {
      currentPassword: 'current-password',
      newPassword: 'new-password',
    });

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(await compare('new-password', existing.password)).toBe(true);
    expect(await compare('current-password', existing.password)).toBe(false);
  });
});
