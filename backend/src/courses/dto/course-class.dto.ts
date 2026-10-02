import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateCourseClassDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
}

export class AddClassMemberDto {
  @IsUUID()
  userId!: string;
}
