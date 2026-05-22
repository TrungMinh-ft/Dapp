import { ApiProperty } from "@nestjs/swagger";
import { ElectionResponseDto } from "./election-response.dto";

class VoteEventDto {
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

export class ElectionDetailResponseDto extends ElectionResponseDto {
  @ApiProperty({ type: [VoteEventDto] })
  voteEvents: VoteEventDto[];
}
