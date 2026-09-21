import 'dotenv/config';
import { DataSource } from 'typeorm';
import { getDatabaseConfig } from './database.config';
import { CreateDocuments1726900000000 } from './database/migrations/1726900000000-CreateDocuments';
import { Document } from './documents/documents.entity';
import { CreateUsers1726899999999 } from './database/migrations/1726899999999-CreateUsers';
import { User } from './users/users.entity';

export const AppDataSource = new DataSource({
  ...getDatabaseConfig(process.env),
  entities: [User, Document],
  migrations: [CreateUsers1726899999999, CreateDocuments1726900000000],
});
