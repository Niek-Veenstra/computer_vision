import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ScannerApiKeyGuard } from '../scanners/scanner-api-key.guard';
import type { ScannerRequest } from '../scanners/scanner-api-key.guard';
import type {
  DocumentMarkers,
  DocumentMarkerUpdateResult,
} from './document-content';
import { DocumentsService } from './documents.service';
import { UpdateDocumentMarkerDto } from './dto/update-document-marker.dto';

@Controller('reader/documents')
@UseGuards(ScannerApiKeyGuard)
export class ReaderDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(':id/markers')
  findMarkers(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DocumentMarkers> {
    return this.documentsService.findMarkers(id);
  }

  @Patch(':id/markers/:markerId')
  updateMarker(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('markerId', ParseUUIDPipe) markerId: string,
    @Body() dto: UpdateDocumentMarkerDto,
    @Req() request: ScannerRequest,
  ): Promise<DocumentMarkerUpdateResult> {
    return this.documentsService.updateMarker(
      id,
      markerId,
      dto,
      request.scanner.ownerId,
      request.scanner.id,
    );
  }
}
