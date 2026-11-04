// Turns the server's [{ field, message }] list into { field: message } for forms.
export function fieldErrors(error) {
  const errors = {};
  for (const { field, message } of error?.details ?? []) {
    errors[field] ??= message;
  }
  return errors;
}
