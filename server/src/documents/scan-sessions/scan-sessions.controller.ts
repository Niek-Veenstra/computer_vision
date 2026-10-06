import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  type AuthenticatedRequest,
  UserJwtGuard,
} from '../../auth/user-jwt.guard';
import {
  ScannerApiKeyGuard,
  type ScannerRequest,
} from '../../scanners/scanner-api-key.guard';
import { CreateScanSessionDto } from './dto/create-scan-session.dto';
import { FinishScanSessionDto } from './dto/finish-scan-session.dto';
import { StopScanSessionDto } from './dto/stop-scan-session.dto';
import { ScanSession } from './scan-session.entity';
import { ScanSessionsService } from './scan-sessions.service';

@Controller('documents/:documentId/scan-sessions')
@UseGuards(UserJwtGuard)
export class DocumentScanSessionsController {
  constructor(private readonly sessions: ScanSessionsService) {}

  @Get()
  findAll(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ScanSession[]> {
    return this.sessions.findAllForDocument(documentId, request.userId);
  }

  @Post()
  create(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: CreateScanSessionDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ScanSession> {
    return this.sessions.create(documentId, dto.scannerId, request.userId);
  }

  @Patch(':sessionId')
  stop(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: StopScanSessionDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ScanSession> {
    return this.sessions.stop(
      documentId,
      sessionId,
      request.userId,
      dto.status,
    );
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    return this.sessions.remove(documentId, sessionId, request.userId);
  }
}

@Controller('scanner-auth/scan-sessions')
@UseGuards(ScannerApiKeyGuard)
export class ScannerScanSessionsController {
  constructor(private readonly sessions: ScanSessionsService) {}

  @Get('active')
  findActive(@Req() request: ScannerRequest): Promise<ScanSession> {
    return this.sessions.findActiveForScanner(request.scanner.id);
  }

  @Patch(':sessionId')
  finish(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: FinishScanSessionDto,
    @Req() request: ScannerRequest,
  ): Promise<ScanSession> {
    return this.sessions.finish(sessionId, request.scanner.id, dto.status);
  }
}
