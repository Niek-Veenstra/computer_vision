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

@Module({
  imports: [
    AuthModule,
    UsersModule,
    DocumentsModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...getDatabaseConfig(process.env),
        entities: [User, Document],
      }),
    }),
  ],
  controllers: [UsersController, AuthController],
  providers: [AppService],
})
export class AppModule {}
