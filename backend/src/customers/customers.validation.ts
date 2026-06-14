type FieldValidator = (value: unknown) => string | null;

function validateNonEmptyString(field: string): FieldValidator {
  return (value: unknown): string | null => {
    if (typeof value !== "string" || value.trim() === "") return `${field} must be a non-empty string`;
    return null;
  };
}

const FIELD_VALIDATORS: Record<string, FieldValidator> = {
  email: validateNonEmptyString("email"),
  name: validateNonEmptyString("name"),
  phone: validateNonEmptyString("phone"),
};

export function validateCreateCustomer(body: Record<string, unknown>): string[] {
  return Object.entries(FIELD_VALIDATORS)
    .map(([field, validate]) => validate(body[field]))
    .filter((error): error is string => error !== null);
}
