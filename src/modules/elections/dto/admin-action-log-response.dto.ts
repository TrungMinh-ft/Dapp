import { ApiProperty } from "@nestjs/swagger";

export class AdminActionLogResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "SYNC_ELECTION" })
  action: string;

  @ApiProperty({ example: 12, nullable: true })
  electionId: number | null;

  @ApiProperty({ example: "Triggered from admin dashboard", nullable: true })
  details: string | null;

  @ApiProperty({ example: "2026-03-25T10:00:00.000Z" })
  createdAt: Date;
}
