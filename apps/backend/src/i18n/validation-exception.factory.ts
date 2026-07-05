import { BadRequestException, ValidationError } from '@nestjs/common';

type ValidationMessage = {
  message: string;
  args: Record<string, unknown>;
};

const constraintToTranslationKey: Record<string, string> = {
  isDefined: 'validation.IS_DEFINED',
  isEmpty: 'validation.IS_EMPTY',
  isNotEmpty: 'validation.IS_NOT_EMPTY',
  isPhoneNumber: 'validation.IS_PHONE_NUMBER',
  isUUID: 'validation.IS_UUID',
  isNumber: 'validation.IS_NUMBER',
  isInt: 'validation.IS_INT',
  isEnum: 'validation.IS_ENUM',
  isString: 'validation.IS_STRING',
  isDate: 'validation.IS_DATE',
  isEmail: 'validation.IS_EMAIL',
  isBoolean: 'validation.IS_BOOLEAN',
  isUrl: 'validation.IS_URL',
  isJSON: 'validation.IS_JSON',
  isPositive: 'validation.IS_POSITIVE',
  isOptional: 'validation.IS_OPTIONAL',
  matches: 'validation.MATCHES',
  min: 'validation.MIN',
  minLength: 'validation.MIN_LENGTH',
  max: 'validation.MAX',
  maxLength: 'validation.MAX_LENGTH',
  length: 'validation.LENGTH',
  validateNested: 'validation.VALIDATE_NESTED',
};

export function createValidationException(errors: ValidationError[]): BadRequestException {
  return new BadRequestException({
    message: flattenValidationErrors(errors),
  });
}

function flattenValidationErrors(errors: ValidationError[], parentPath?: string): ValidationMessage[] {
  return errors.flatMap((error) => {
    const property = parentPath ? `${parentPath}.${error.property}` : error.property;
    const messages = Object.entries(error.constraints ?? {}).map(([constraint, rawMessage]) => ({
      message: resolveValidationMessageKey(constraint, rawMessage),
      args: {
        property,
        value: error.value,
      },
    }));

    if (!error.children?.length) return messages;
    return [...messages, ...flattenValidationErrors(error.children, property)];
  });
}

function resolveValidationMessageKey(constraint: string, rawMessage: string): string {
  return rawMessage.startsWith('validation.')
    ? rawMessage
    : (constraintToTranslationKey[constraint] ?? 'validation.INVALID');
}
