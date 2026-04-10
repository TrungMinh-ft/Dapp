import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateAdminActionLogDto {
  @ApiProperty({ example: "CREATE_ELECTION" })
  @IsString()
  @MaxLength(64)
  action: string;

  @ApiProperty({ example: 12, required: false, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  electionId?: number;

  @ApiProperty({
    example: "tx=0xabc..., source=frontend-admin-dashboard",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
