import { IsUUID } from 'class-validator';

export class CloseSavingsGoalDto {
  @IsUUID()
  savingsGoalId: string;
}
