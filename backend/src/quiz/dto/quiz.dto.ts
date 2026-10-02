import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsString, IsUUID, MaxLength, MinLength, ValidateNested } from 'class-validator';

export class QuizChoiceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  text!: string;

  @IsBoolean()
  correct!: boolean;
}

export class CreateQuizQuestionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  prompt!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => QuizChoiceDto)
  choices!: QuizChoiceDto[];
}

export class QuizAnswerDto {
  @IsUUID()
  questionId!: string;

  @IsUUID()
  choiceId!: string;
}

export class SubmitQuizDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers!: QuizAnswerDto[];
}
