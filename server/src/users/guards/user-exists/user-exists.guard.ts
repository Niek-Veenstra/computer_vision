import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class UserExistsGuard implements CanActivate {
  constructor(private usersService: UsersService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const id = request.params.id;
    const user = await this.usersService.findOneById(id);

    if (!user) {
      throw new NotFoundException();
    }
    request.userEntity = user;
    return true;
  }
}
