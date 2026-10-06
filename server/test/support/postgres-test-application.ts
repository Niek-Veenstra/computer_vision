import {
  type INestApplication,
  type ModuleMetadata,
  ValidationPipe,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { Server } from 'node:http';
import { DataSource } from 'typeorm';
import { CreateUsers1726899999999 } from '../../src/database/migrations/1726899999999-CreateUsers';
import { CreateDocuments1726900000000 } from '../../src/database/migrations/1726900000000-CreateDocuments';
import { AddUserTimestamps1789992000000 } from '../../src/database/migrations/1789992000000-AddUserTimestamps';
import { CreateScanners1790000000001 } from '../../src/database/migrations/1790000000001-CreateScanners';
import { AddUserLogo1790000000002 } from '../../src/database/migrations/1790000000002-AddUserLogo';
import { CreateDocumentMarkers1790000000003 } from '../../src/database/migrations/1790000000003-CreateDocumentMarkers';
import { CreateScanSessions1790000000004 } from '../../src/database/migrations/1790000000004-CreateScanSessions';
import { AddDocumentOwnership1790000000005 } from '../../src/database/migrations/1790000000005-AddDocumentOwnership';
import { Document } from '../../src/documents/documents.entity';
import { DocumentMarker } from '../../src/documents/markers/document-marker.entity';
import { ScanSession } from '../../src/documents/scan-sessions/scan-session.entity';
import { Scanner } from '../../src/scanners/scanner.entity';
import { User } from '../../src/users/users.entity';

const entities = [User, Document, DocumentMarker, ScanSession, Scanner];
const migrations = [
  CreateUsers1726899999999,
  CreateDocuments1726900000000,
  AddUserTimestamps1789992000000,
  CreateScanners1790000000001,
  AddUserLogo1790000000002,
  CreateDocumentMarkers1790000000003,
  CreateScanSessions1790000000004,
  AddDocumentOwnership1790000000005,
];

type PostgresTestApplicationOptions = Pick<
  ModuleMetadata,
  'controllers' | 'imports' | 'providers'
>;

export type PostgresTestApplication = {
  app: INestApplication;
  dataSource: DataSource;
  httpServer: Server;
  module: TestingModule;
  close(): Promise<void>;
};

export async function startPostgresTestApplication(
  options: PostgresTestApplicationOptions,
): Promise<PostgresTestApplication> {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();

  try {
    const module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: container.getHost(),
          port: container.getPort(),
          username: container.getUsername(),
          password: container.getPassword(),
          database: container.getDatabase(),
          entities,
          migrations,
          migrationsRun: true,
        }),
        TypeOrmModule.forFeature(entities),
        ...(options.imports ?? []),
      ],
      controllers: options.controllers,
      providers: options.providers,
    }).compile();

    const app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    return {
      app,
      dataSource: module.get(DataSource),
      httpServer: app.getHttpServer() as Server,
      module,
      async close(): Promise<void> {
        await app.close();
        await container.stop();
      },
    };
  } catch (error) {
    await container.stop();
    throw error;
  }
}

export async function truncateTestDatabase(
  dataSource: DataSource,
): Promise<void> {
  await dataSource.query(
    'TRUNCATE TABLE "scan_sessions", "document_markers", "documents", "scanners", "user" CASCADE',
  );
}
