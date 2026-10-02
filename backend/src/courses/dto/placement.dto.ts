import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PlacementChoiceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  text!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  targetOrderIndex!: number;
}

export class CreatePlacementQuestionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  prompt!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => PlacementChoiceDto)
  choices!: PlacementChoiceDto[];
}

export class PlacementAnswerDto {
  @IsUUID()
  questionId!: string;

  @IsUUID()
  choiceId!: string;
}

export class SubmitPlacementDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PlacementAnswerDto)
  answers!: PlacementAnswerDto[];
}
