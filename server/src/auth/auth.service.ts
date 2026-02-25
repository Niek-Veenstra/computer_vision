import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}
  async authenticate(email: string, password: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found for given email.');
    }
    const matches = await bcrypt.compare(user.password, password);
    const payload = {
      sub: user.id,
      email: user.email,
    };
    if (matches) {
      return { token: this.jwtService.sign(payload) };
    }
    throw new UnauthorizedException();
  }
}
