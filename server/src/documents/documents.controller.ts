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
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { UserJwtGuard } from '../auth/user-jwt.guard';
import type { AuthenticatedRequest } from '../auth/user-jwt.guard';
import { Document } from './documents.entity';
import { DocumentsService } from './documents.service';

@Controller('documents')
@UseGuards(UserJwtGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  findAll(): Promise<Document[]> {
    return this.documentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Document> {
    return this.documentsService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateDocumentDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Document> {
    return this.documentsService.create(dto, request.userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Document> {
    return this.documentsService.update(id, dto, request.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.documentsService.remove(id);
  }
}
