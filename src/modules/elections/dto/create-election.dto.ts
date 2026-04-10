import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class CreateElectionDto {
  @ApiProperty({ example: "Bầu ban cán sự lớp" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: ["Nguyen Van A", "Tran Thi B", "Le Van C"],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  candidates: string[];

  @ApiProperty({ example: 1710000000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  startTime: number;

  @ApiProperty({ example: 1710003600 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  endTime: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isPublic: boolean;
}
