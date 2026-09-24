import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ScannersModule } from '../scanners/scanners.module';
import { User } from '../users/users.entity';
import { DocumentMarker } from './markers/document-marker.entity';
import { DocumentsController } from './documents.controller';
import { DocumentMarkersController } from './markers/document-markers.controller';
import { DocumentMarkersService } from './markers/document-markers.service';
import { Document } from './documents.entity';
import { DocumentsService } from './documents.service';

@Module({
  imports: [
    AuthModule,
    ScannersModule,
    TypeOrmModule.forFeature([Document, DocumentMarker, User]),
  ],
  controllers: [DocumentsController, DocumentMarkersController],
  providers: [DocumentsService, DocumentMarkersService],
})
export class DocumentsModule {}
