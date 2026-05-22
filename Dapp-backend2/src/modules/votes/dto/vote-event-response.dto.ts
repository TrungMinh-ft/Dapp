import { ApiProperty } from "@nestjs/swagger";

export class VoteEventResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "0x1234567890abcdef1234567890abcdef12345678" })
  voter: string;

  @ApiProperty({
    example:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    nullable: true,
  })
  txHash: string | null;

  @ApiProperty({ example: "2026-03-14T10:00:00.000Z" })
  createdAt: Date;
}
