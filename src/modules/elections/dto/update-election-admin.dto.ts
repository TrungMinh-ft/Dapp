import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UpdateElectionAdminDto {
  @ApiPropertyOptional({ example: "OIP-42" })
  @IsOptional()
  @IsString()
  proposalCode?: string;

  @ApiPropertyOptional({
    example: "Governance proposal for treasury protection and staged execution.",
  })
  @IsOptional()
  @IsString()
  description?: string;
}
