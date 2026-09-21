import 'dotenv/config';
import { DataSource } from 'typeorm';
import { getDatabaseConfig } from './database.config';
import { CreateDocuments1726900000000 } from './database/migrations/1726900000000-CreateDocuments';
import { AddUserTimestamps1789992000000 } from './database/migrations/1789992000000-AddUserTimestamps';
import { Document } from './documents/documents.entity';
import { CreateUsers1726899999999 } from './database/migrations/1726899999999-CreateUsers';
import { User } from './users/users.entity';
import { Scanner } from './scanners/scanner.entity';
import { CreateScanners1790000000001 } from './database/migrations/1790000000001-CreateScanners';

export const AppDataSource = new DataSource({
  ...getDatabaseConfig(process.env),
  entities: [User, Document, Scanner],
  migrations: [
    CreateUsers1726899999999,
    CreateDocuments1726900000000,
    AddUserTimestamps1789992000000,
    CreateScanners1790000000001,
  ],
});
