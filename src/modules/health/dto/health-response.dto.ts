import { ApiProperty } from "@nestjs/swagger";

export class HealthResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: "Backend is running" })
  message: string;
}
