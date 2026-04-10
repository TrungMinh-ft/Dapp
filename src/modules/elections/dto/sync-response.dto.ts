import { ApiProperty } from "@nestjs/swagger";

export class SyncResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: "Sync completed" })
  message: string;
}
