import { BillCategory } from '../../../domain/enums/bill-category.enum';

export class ListBillersQuery {
  constructor(readonly category: BillCategory) {}
}
