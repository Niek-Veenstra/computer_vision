import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../users/users.entity';
import { DocumentsAuthGuard } from './documents-auth.guard';
import { DocumentsController } from './documents.controller';
import { Document } from './documents.entity';
import { DocumentsService } from './documents.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Document, User])],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentsAuthGuard],
})
export class DocumentsModule {}
