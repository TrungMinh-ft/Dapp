import { ApiProperty } from "@nestjs/swagger";
import { ElectionResultItemDto } from "./election-result-item.dto";

export class ElectionResultsResponseDto {
  @ApiProperty({ example: 0 })
  electionId: number;

  @ApiProperty({ example: "Treasury Shield Upgrade" })
  title: string;

  @ApiProperty({ example: 30 })
  totalVotes: number;

  @ApiProperty({ example: "Approve", nullable: true })
  leadingOption: string | null;

  @ApiProperty({ example: 68.5 })
  leadingPercentage: number;

  @ApiProperty({ example: "PASSED", nullable: true })
  resultSummary: string | null;

  @ApiProperty({ type: [ElectionResultItemDto] })
  candidates: ElectionResultItemDto[];
}
