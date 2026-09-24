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
import { ScannerApiKeyGuard } from '../../scanners/scanner-api-key.guard';
import type { ScannerRequest } from '../../scanners/scanner-api-key.guard';
import type {
  DocumentMarkers,
  DocumentMarkerUpdateResult,
} from './document-marker-content';
import { DocumentMarkersService } from './document-markers.service';
import { UpdateDocumentMarkerDto } from './dto/update-document-marker.dto';

@Controller('documents')
@UseGuards(ScannerApiKeyGuard)
export class DocumentMarkersController {
  constructor(
    private readonly documentMarkersService: DocumentMarkersService,
  ) {}

  @Get(':id/markers')
  findMarkers(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DocumentMarkers> {
    return this.documentMarkersService.findAll(id);
  }

  @Patch(':id/markers/:markerId')
  updateMarker(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('markerId', ParseUUIDPipe) markerId: string,
    @Body() dto: UpdateDocumentMarkerDto,
    @Req() request: ScannerRequest,
  ): Promise<DocumentMarkerUpdateResult> {
    return this.documentMarkersService.update(
      id,
      markerId,
      dto,
      request.scanner.ownerId,
      request.scanner.id,
    );
  }
}
