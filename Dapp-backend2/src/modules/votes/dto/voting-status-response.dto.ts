import { ApiProperty } from "@nestjs/swagger";

export class VotingStatusResponseDto {
  @ApiProperty({ example: 0 })
  electionId: number;

  @ApiProperty({ example: "0x1234567890abcdef1234567890abcdef12345678" })
  wallet: string;

  @ApiProperty({ example: false })
  hasVoted: boolean;

  @ApiProperty({ example: true })
  isAuthorized: boolean;
}
