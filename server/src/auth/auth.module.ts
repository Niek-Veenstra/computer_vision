import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserJwtGuard } from './user-jwt.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, UserJwtGuard],
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
      }),
    }),
  ],
  exports: [AuthService, JwtModule, UserJwtGuard],
})
export class AuthModule {}
