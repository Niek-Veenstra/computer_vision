import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { IsNull, Repository } from 'typeorm';
import { Scanner } from './scanner.entity';

export type ScannerView = {
  id: string;
  name: string;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
};

function toView(scanner: Scanner): ScannerView {
  return {
    id: scanner.id,
    name: scanner.name,
    createdAt: scanner.createdAt.toISOString(),
    lastSeenAt: scanner.lastSeenAt?.toISOString() ?? null,
    revokedAt: scanner.revokedAt?.toISOString() ?? null,
  };
}

function hashKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

function newKey(): string {
  return `scn_${randomBytes(32).toString('base64url')}`;
}

@Injectable()
export class ScannersService {
  constructor(
    @InjectRepository(Scanner)
    private readonly scanners: Repository<Scanner>,
  ) {}

  async list(ownerId: string): Promise<ScannerView[]> {
    const scanners = await this.scanners.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
    return scanners.map(toView);
  }

  async create(ownerId: string, name: string) {
    const apiKey = newKey();
    const scanner = await this.scanners.save(
      this.scanners.create({
        ownerId,
        name,
        keyHash: hashKey(apiKey),
        lastSeenAt: null,
        revokedAt: null,
      }),
    );
    return { scanner: toView(scanner), apiKey };
  }

  async rotateKey(id: string, ownerId: string) {
    const scanner = await this.findOwned(id, ownerId);
    if (scanner.revokedAt) {
      throw new ConflictException('Revoked scanners cannot rotate keys.');
    }
    const apiKey = newKey();
    const updated = await this.scanners.update(
      { id, ownerId, revokedAt: IsNull() },
      { keyHash: hashKey(apiKey) },
    );
    if (updated.affected !== 1) {
      throw new ConflictException('Revoked scanners cannot rotate keys.');
    }
    return { scanner: toView(await this.findOwned(id, ownerId)), apiKey };
  }

  async revoke(id: string, ownerId: string): Promise<void> {
    const updated = await this.scanners.update(
      { id, ownerId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    if (updated.affected !== 1) await this.findOwned(id, ownerId);
  }

  async authenticate(apiKey: string) {
    if (!/^scn_[A-Za-z0-9_-]{43}$/.test(apiKey)) {
      throw new UnauthorizedException();
    }
    const keyHash = hashKey(apiKey);
    const updated = await this.scanners.update(
      { keyHash, revokedAt: IsNull() },
      { lastSeenAt: new Date() },
    );
    if (updated.affected !== 1) throw new UnauthorizedException();
    const scanner = await this.scanners.findOneBy({
      keyHash,
      revokedAt: IsNull(),
    });
    if (!scanner) throw new UnauthorizedException();
    return { ...toView(scanner), ownerId: scanner.ownerId };
  }

  private async findOwned(id: string, ownerId: string): Promise<Scanner> {
    const scanner = await this.scanners.findOneBy({ id, ownerId });
    if (!scanner) throw new NotFoundException('Scanner not found.');
    return scanner;
  }
}
