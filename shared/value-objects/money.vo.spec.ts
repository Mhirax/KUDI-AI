import { Money } from './money.vo';
import { Currency } from '../enums/currency.enum';
import { DomainException } from '../exceptions/domain.exception';

describe('Money value object', () => {
  it('parses decimal strings into exact minor units', () => {
    const money = Money.fromDecimalString('1500.50', Currency.NGN);
    expect(money.getMinorUnits()).toBe(150050n);
    expect(money.toMajorUnitsString()).toBe('1500.50');
  });

  it('pads single-decimal-place amounts correctly', () => {
    const money = Money.fromDecimalString('10.5', Currency.NGN);
    expect(money.getMinorUnits()).toBe(1050n);
  });

  it('adds two amounts of the same currency exactly', () => {
    const a = Money.fromDecimalString('0.10', Currency.NGN);
    const b = Money.fromDecimalString('0.20', Currency.NGN);
    // Exact bigint arithmetic — no floating-point 0.30000000000000004 drift.
    expect(a.add(b).toMajorUnitsString()).toBe('0.30');
  });

  it('throws when adding mismatched currencies', () => {
    const naira = Money.fromDecimalString('100.00', Currency.NGN);
    const dollars = Money.fromDecimalString('100.00', Currency.USD);
    expect(() => naira.add(dollars)).toThrow(DomainException);
  });

  it('throws when subtracting more than the available amount', () => {
    const small = Money.fromDecimalString('10.00', Currency.NGN);
    const large = Money.fromDecimalString('20.00', Currency.NGN);
    expect(() => small.subtract(large)).toThrow(DomainException);
  });

  it('rejects malformed decimal strings', () => {
    expect(() => Money.fromDecimalString('abc', Currency.NGN)).toThrow(DomainException);
    expect(() => Money.fromDecimalString('10.999', Currency.NGN)).toThrow(DomainException);
  });
});
