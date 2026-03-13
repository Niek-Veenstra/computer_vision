import { IsString, IsEmail, IsDateString } from 'class-validator';

export class GetUserDto {
  @IsString()
  id: string;

  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsDateString()
  birthDate: string;
}
