import { ApiProperty } from "@nestjs/swagger";
import { CandidateDto } from "./candidate.dto";

export class ElectionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 0 })
  contractElectionId: number;

  @ApiProperty({ example: "Bầu ban cán sự lớp" })
  title: string;

  @ApiProperty({ example: "1710000000" })
  startTime: string;

  @ApiProperty({ example: "1710003600" })
  endTime: string;

  @ApiProperty({ example: true })
  isPublic: boolean;

  @ApiProperty({ example: false })
  isClosed: boolean;

  @ApiProperty({ example: "0x1234567890abcdef1234567890abcdef12345678" })
  creator: string;

  @ApiProperty({ example: 30 })
  totalVotes: number;

  @ApiProperty({ type: [CandidateDto] })
  candidates: CandidateDto[];
}
