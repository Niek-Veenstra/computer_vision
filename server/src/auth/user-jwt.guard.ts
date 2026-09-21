import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { isUUID } from 'class-validator';
import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  userId: string;
}

@Injectable()
export class UserJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      if (!isUUID(payload.sub)) {
        throw new UnauthorizedException();
      }
      request.userId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
