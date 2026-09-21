import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserJwtGuard } from '../auth/user-jwt.guard';
import type { AuthenticatedRequest } from '../auth/user-jwt.guard';
import { CreateScannerDto } from './dto/create-scanner.dto';
import { ScannerApiKeyGuard } from './scanner-api-key.guard';
import type { ScannerRequest } from './scanner-api-key.guard';
import { ScannersService } from './scanners.service';

@Controller('scanners')
@UseGuards(UserJwtGuard)
export class ScannersController {
  constructor(private readonly scanners: ScannersService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.scanners.list(request.userId);
  }

  @Post()
  create(@Body() dto: CreateScannerDto, @Req() request: AuthenticatedRequest) {
    return this.scanners.create(request.userId, dto.name);
  }

  @Post(':id/rotate-key')
  @HttpCode(HttpStatus.OK)
  rotateKey(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.scanners.rotateKey(id, request.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    return this.scanners.revoke(id, request.userId);
  }
}

@Controller('scanner-auth')
@UseGuards(ScannerApiKeyGuard)
export class ScannerIdentityController {
  @Get('me')
  me(@Req() request: ScannerRequest) {
    return request.scanner;
  }
}
