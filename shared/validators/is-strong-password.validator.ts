import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string): boolean {
    if (!password) return false;
    const hasMinLength = password.length >= 12;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    return hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
  }

  defaultMessage(): string {
    return 'Password must be at least 12 characters and include upper, lower, numeric, and special characters';
  }
}

export function IsStrongPassword(options?: ValidationOptions) {
  return function (object: unknown, propertyName: string) {
    registerDecorator({
      target: (object as Function).constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
