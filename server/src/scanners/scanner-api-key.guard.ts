import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ScannersService } from './scanners.service';

export interface ScannerRequest extends Request {
  scanner: Awaited<ReturnType<ScannersService['authenticate']>>;
}

@Injectable()
export class ScannerApiKeyGuard implements CanActivate {
  constructor(private readonly scanners: ScannersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ScannerRequest>();
    const apiKey = request.header('X-Scanner-Key');
    if (!apiKey) throw new UnauthorizedException();
    request.scanner = await this.scanners.authenticate(apiKey);
    return true;
  }
}
