import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {

  @Inject('UserRepository')
    private readonly userRepo: UserRepository,
}
