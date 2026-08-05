import { IsISO8601, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../../shared/dto/pagination.dto';

/**
 * Query contract for paginated account history. Extends the shared
 * pagination contract with an optional date window.
 */
export class ListLedgerEntriesDto extends PaginationDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
