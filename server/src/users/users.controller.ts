import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import type { PublicUser, UserProfile } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserExistsGuard } from './guards/user-exists/user-exists.guard';
import { UserJwtGuard } from '../auth/user-jwt.guard';
import type { AuthenticatedRequest } from '../auth/user-jwt.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(): Promise<PublicUser[]> {
    return this.usersService.findAllPublic();
  }

  @Get('me')
  @UseGuards(UserJwtGuard)
  getCurrentUser(@Req() request: AuthenticatedRequest): Promise<UserProfile> {
    return this.usersService.findProfile(request.userId);
  }

  @Patch('me')
  @UseGuards(UserJwtGuard)
  updateCurrentUser(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfile> {
    return this.usersService.updateProfile(request.userId, dto);
  }

  @Patch('me/password')
  @UseGuards(UserJwtGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  changeCurrentUserPassword(
    @Req() request: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.usersService.changePassword(request.userId, dto);
  }

  @UseGuards(UserExistsGuard)
  @Get(':id')
  async findOneById(@Param('id') id: string): Promise<PublicUser> {
    return this.usersService.findPublicProfile(id);
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<PublicUser> {
    const user = await this.usersService.create(createUserDto);
    return this.usersService.findPublicProfile(user.id);
  }
}
