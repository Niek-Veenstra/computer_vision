import {
  BadRequestException,
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { User } from './users.entity';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { compare, hash } from 'bcrypt';

export type UserProfile = Pick<
  User,
  'id' | 'email' | 'firstName' | 'lastName' | 'birthDate' | 'logoDataUrl'
>;
export type PublicUser = Omit<UserProfile, 'logoDataUrl'>;

const MAX_LOGO_BYTES = 1024 * 1024;

function profileOf(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    birthDate: user.birthDate,
    logoDataUrl: user.logoDataUrl ?? null,
  };
}

function publicUserOf(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    birthDate: user.birthDate,
  };
}

function validateLogo(dataUrl: string): void {
  const match =
    /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new BadRequestException('Use a PNG, JPEG or WebP logo.');

  const content = Buffer.from(match[2], 'base64');
  if (
    content.length === 0 ||
    content.length > MAX_LOGO_BYTES ||
    content.toString('base64') !== match[2]
  ) {
    throw new BadRequestException('Logo must be smaller than 1 MB.');
  }

  let validImage = false;
  if (match[1] === 'png') {
    validImage = content
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  } else if (match[1] === 'jpeg') {
    validImage =
      content.length >= 3 &&
      content[0] === 0xff &&
      content[1] === 0xd8 &&
      content[2] === 0xff;
  } else if (match[1] === 'webp') {
    validImage =
      content.subarray(0, 4).toString() === 'RIFF' &&
      content.subarray(8, 12).toString() === 'WEBP';
  }
  if (!validImage)
    throw new BadRequestException('The logo is not a valid image.');
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOneById(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findOneByEmail(email: string): Promise<User> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepository.findByEmail(
      createUserDto.email,
    );
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }
    const saltRounds = 10;
    const hashedPassword = await hash(createUserDto.password, saltRounds);
    createUserDto.password = hashedPassword;
    return this.usersRepository.createUser(createUserDto);
  }

  async findProfile(userId: string): Promise<UserProfile> {
    return profileOf(await this.findOneById(userId));
  }

  async findAllPublic(): Promise<PublicUser[]> {
    return (await this.findAll()).map(publicUserOf);
  }

  async findPublicProfile(userId: string): Promise<PublicUser> {
    return publicUserOf(await this.findOneById(userId));
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserProfile> {
    const user = await this.findOneById(userId);
    if (dto.email !== undefined && dto.email !== user.email) {
      const existing = await this.usersRepository.findByEmail(dto.email);
      if (existing && existing.id !== user.id) {
        throw new ConflictException('User with this email already exists');
      }
      user.email = dto.email;
    }
    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.logoDataUrl !== undefined) {
      if (dto.logoDataUrl !== null) validateLogo(dto.logoDataUrl);
      user.logoDataUrl = dto.logoDataUrl;
    }
    return profileOf(await this.usersRepository.save(user));
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findOneById(userId);
    if (!(await compare(dto.currentPassword, user.password))) {
      throw new BadRequestException('Current password is incorrect.');
    }
    user.password = await hash(dto.newPassword, 10);
    await this.usersRepository.save(user);
  }
}
