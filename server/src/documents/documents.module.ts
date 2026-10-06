import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ScannersModule } from '../scanners/scanners.module';
import { Scanner } from '../scanners/scanner.entity';
import { User } from '../users/users.entity';
import { DocumentMarker } from './markers/document-marker.entity';
import { DocumentsController } from './documents.controller';
import { DocumentMarkersController } from './markers/document-markers.controller';
import { DocumentMarkersService } from './markers/document-markers.service';
import { Document } from './documents.entity';
import { DocumentsService } from './documents.service';
import { ScanSession } from './scan-sessions/scan-session.entity';
import {
  DocumentScanSessionsController,
  ScannerScanSessionsController,
} from './scan-sessions/scan-sessions.controller';
import { ScanSessionsService } from './scan-sessions/scan-sessions.service';

@Module({
  imports: [
    AuthModule,
    ScannersModule,
    TypeOrmModule.forFeature([
      Document,
      DocumentMarker,
      ScanSession,
      Scanner,
      User,
    ]),
  ],
  controllers: [
    DocumentsController,
    DocumentMarkersController,
    DocumentScanSessionsController,
    ScannerScanSessionsController,
  ],
  providers: [DocumentsService, DocumentMarkersService, ScanSessionsService],
})
export class DocumentsModule {}
