import { Inject, Injectable } from '@nestjs/common';
import type { UserRepository } from 'src/domain/users/users.repository';

@Injectable()
export class UsersService {
  @Inject('UserRepository')
  private readonly userRepo: UserRepository;
}
