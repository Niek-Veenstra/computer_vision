import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/users.entity';
import { UsersController } from './users/users.controller';
import { AuthController } from './auth/auth.controller';
import { ConfigModule } from '@nestjs/config';
import { getDatabaseConfig } from './database.config';
import { DocumentsModule } from './documents/documents.module';
import { Document } from './documents/documents.entity';
import { DocumentMarker } from './documents/document-marker.entity';
import { Scanner } from './scanners/scanner.entity';
import { ScannersModule } from './scanners/scanners.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    DocumentsModule,
    ScannersModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...getDatabaseConfig(process.env),
        entities: [User, Document, DocumentMarker, Scanner],
      }),
    }),
  ],
  controllers: [UsersController, AuthController],
  providers: [AppService],
})
export class AppModule {}
