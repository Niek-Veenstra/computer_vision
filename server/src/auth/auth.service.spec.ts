import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const findOneByEmail = jest.fn();
  const sign = jest.fn();
  const service = new AuthService(
    { findOneByEmail } as unknown as UsersService,
    { sign } as unknown as JwtService,
  );

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('returns a signed token for valid credentials', async () => {
    findOneByEmail.mockResolvedValue({
      id: '81b160a4-9768-482b-946b-f3e76588e49b',
      password: 'hashed-password',
    });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    sign.mockReturnValue('signed-token');

    await expect(
      service.authenticate('user@example.com', 'secret-password'),
    ).resolves.toEqual({ token: 'signed-token' });
    expect(bcrypt.compare).toHaveBeenCalledWith(
      'secret-password',
      'hashed-password',
    );
    expect(sign).toHaveBeenCalledWith({
      sub: '81b160a4-9768-482b-946b-f3e76588e49b',
    });
  });

  it('rejects an unknown email address', async () => {
    findOneByEmail.mockResolvedValue(null);

    await expect(
      service.authenticate('missing@example.com', 'secret-password'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an incorrect password', async () => {
    findOneByEmail.mockResolvedValue({
      id: '81b160a4-9768-482b-946b-f3e76588e49b',
      password: 'hashed-password',
    });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

    await expect(
      service.authenticate('user@example.com', 'incorrect-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sign).not.toHaveBeenCalled();
  });
});
