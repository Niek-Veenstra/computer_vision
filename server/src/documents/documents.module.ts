import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ScannersModule } from '../scanners/scanners.module';
import { User } from '../users/users.entity';
import { DocumentMarker } from './document-marker.entity';
import { DocumentsController } from './documents.controller';
import { ReaderDocumentsController } from './reader-documents.controller';
import { Document } from './documents.entity';
import { DocumentsService } from './documents.service';

@Module({
  imports: [
    AuthModule,
    ScannersModule,
    TypeOrmModule.forFeature([Document, DocumentMarker, User]),
  ],
  controllers: [DocumentsController, ReaderDocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
