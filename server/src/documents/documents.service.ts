import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/users.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { Document } from './documents.entity';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documents: Repository<Document>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  findAll(): Promise<Document[]> {
    return this.documents.find({ order: { updatedAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Document> {
    const document = await this.documents.findOneBy({ id });
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  async create(dto: CreateDocumentDto, userId: string): Promise<Document> {
    await this.assertUserExists(userId);
    const document = this.documents.create({
      title: dto.title,
      content: dto.content,
      updatedById: userId,
    });
    return this.documents.save(document);
  }

  async update(
    id: string,
    dto: UpdateDocumentDto,
    userId: string,
  ): Promise<Document> {
    if (dto.title === undefined && dto.content === undefined) {
      throw new BadRequestException('Provide title or content to update');
    }
    await this.assertUserExists(userId);

    const result = await this.documents.update(
      { id, version: dto.version },
      {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        version: () => 'version + 1',
        updatedById: userId,
      },
    );
    if (!result.affected) {
      await this.findOne(id);
      throw new ConflictException('Document version is outdated');
    }
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.documents.delete(id);
    if (!result.affected) {
      throw new NotFoundException('Document not found');
    }
  }

  private async assertUserExists(userId: string): Promise<void> {
    if (!(await this.users.existsBy({ id: userId }))) {
      throw new UnauthorizedException('User not found');
    }
  }
}
