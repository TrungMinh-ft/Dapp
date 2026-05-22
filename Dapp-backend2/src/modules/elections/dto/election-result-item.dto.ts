import { ApiProperty } from "@nestjs/swagger";

export class ElectionResultItemDto {
  @ApiProperty({ example: 0 })
  index: number;

  @ApiProperty({ example: "Nguyen Van A" })
  name: string;

  @ApiProperty({ example: 12 })
  voteCount: number;

  @ApiProperty({ example: 40 })
  percentage: number;
}
