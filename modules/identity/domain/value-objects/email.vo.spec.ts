import { Email } from './email.vo';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

describe('Email value object', () => {
  it('normalizes valid emails to lowercase, trimmed form', () => {
    const email = Email.create('  User@Example.COM  ');
    expect(email.getValue()).toBe('user@example.com');
  });

  it('rejects malformed email addresses', () => {
    expect(() => Email.create('not-an-email')).toThrow(DomainException);
  });

  it('treats two emails with different casing as equal', () => {
    const a = Email.create('user@example.com');
    const b = Email.create('USER@EXAMPLE.COM');
    expect(a.equals(b)).toBe(true);
  });
});
