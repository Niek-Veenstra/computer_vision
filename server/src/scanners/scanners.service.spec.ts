import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Repository } from 'typeorm';
import { Scanner } from './scanner.entity';
import { ScannersService } from './scanners.service';

const ownerId = '20000000-0000-4000-8000-000000000001';
const scannerId = '30000000-0000-4000-8000-000000000001';

function scanner(overrides: Partial<Scanner> = {}): Scanner {
  return {
    id: scannerId,
    ownerId,
    name: 'Reception',
    keyHash: 'old-hash',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    lastSeenAt: null,
    revokedAt: null,
    ...overrides,
  } as Scanner;
}

describe('ScannersService', () => {
  it('returns a new key once without exposing its hash in scanner data', async () => {
    const create = jest.fn((fields: Partial<Scanner>) => scanner(fields));
    const save = jest.fn((value: Scanner) => Promise.resolve(value));
    const service = new ScannersService({
      create,
      save,
    } as unknown as Repository<Scanner>);

    const result = await service.create(ownerId, 'Reception');

    expect(result.apiKey).toMatch(/^scn_[A-Za-z0-9_-]{43}$/);
    expect(create.mock.calls[0][0].keyHash).toBe(
      createHash('sha256').update(result.apiKey).digest('hex'),
    );
    expect(result.scanner).not.toHaveProperty('keyHash');
    expect(result.scanner.name).toBe('Reception');
  });

  it('only rotates a scanner found for its owner', async () => {
    const findOneBy = jest.fn().mockResolvedValue(null);
    const service = new ScannersService({
      findOneBy,
    } as unknown as Repository<Scanner>);

    await expect(service.rotateKey(scannerId, ownerId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findOneBy).toHaveBeenCalledWith({ id: scannerId, ownerId });
  });

  it("lists only the owner's scanners without exposing key hashes", async () => {
    const find = jest.fn().mockResolvedValue([scanner()]);
    const service = new ScannersService({
      find,
    } as unknown as Repository<Scanner>);

    const result = await service.list(ownerId);

    expect(find).toHaveBeenCalledWith({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
    expect(result[0]).not.toHaveProperty('keyHash');
  });

  it('does not rotate a scanner revoked during the update', async () => {
    const findOneBy = jest.fn().mockResolvedValue(scanner());
    const update = jest.fn().mockResolvedValue({ affected: 0 });
    const service = new ScannersService({
      findOneBy,
      update,
    } as unknown as Repository<Scanner>);

    await expect(service.rotateKey(scannerId, ownerId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid or revoked keys before returning scanner identity', async () => {
    const update = jest.fn().mockResolvedValue({ affected: 0 });
    const findOneBy = jest.fn();
    const service = new ScannersService({
      update,
      findOneBy,
    } as unknown as Repository<Scanner>);

    await expect(service.authenticate('invalid')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(
      service.authenticate(`scn_${'a'.repeat(43)}`),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findOneBy).not.toHaveBeenCalled();
  });

  it('returns only public identity for an active key', async () => {
    const apiKey = `scn_${'a'.repeat(43)}`;
    const keyHash = createHash('sha256').update(apiKey).digest('hex');
    const update = jest.fn().mockResolvedValue({ affected: 1 });
    const findOneBy = jest
      .fn()
      .mockResolvedValue(scanner({ keyHash, lastSeenAt: new Date() }));
    const service = new ScannersService({
      update,
      findOneBy,
    } as unknown as Repository<Scanner>);

    const identity = await service.authenticate(apiKey);

    expect(identity.id).toBe(scannerId);
    expect(identity.ownerId).toBe(ownerId);
    expect(identity).not.toHaveProperty('keyHash');
    expect(update).toHaveBeenCalledTimes(1);
  });
});
