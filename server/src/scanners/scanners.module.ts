import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ScannerApiKeyGuard } from './scanner-api-key.guard';
import { Scanner } from './scanner.entity';
import {
  ScannerIdentityController,
  ScannersController,
} from './scanners.controller';
import { ScannersService } from './scanners.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Scanner])],
  controllers: [ScannersController, ScannerIdentityController],
  providers: [ScannersService, ScannerApiKeyGuard],
  exports: [ScannersService, ScannerApiKeyGuard],
})
export class ScannersModule {}
