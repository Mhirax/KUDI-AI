import { MoneyHelper } from '../../shared/helpers/money.helper';

describe('MoneyHelper', () => {
  it('converts major units to minor units without float drift', () => {
    expect(MoneyHelper.toMinorUnits(19.99)).toBe(1999);
  });

  it('converts minor units back to major units', () => {
    expect(MoneyHelper.toMajorUnits(1999)).toBe(19.99);
  });
});
