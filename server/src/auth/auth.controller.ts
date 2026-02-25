import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthService } from './auth.service';
import status from 'http-status';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/authenticate')
  @HttpCode(status.CREATED)
  async authenticate(@Body() loginInformation: LoginUserDto) {
    console.log(loginInformation);

    return this.authService.authenticate(
      loginInformation.email,
      loginInformation.password,
    );
  }
}
