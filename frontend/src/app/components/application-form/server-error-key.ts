const REQUIRED_PATTERN = /required|may not be (blank|null|empty)/i;
const URL_PATTERN = /valid url/i;
const MAX_LENGTH_PATTERN = /no more than \d+ characters/i;

export function serverErrorKey(message: string): string {
  if (REQUIRED_PATTERN.test(message)) {
    return 'applicationForm.errors.required';
  }
  if (URL_PATTERN.test(message)) {
    return 'common.invalidUrl';
  }
  return MAX_LENGTH_PATTERN.test(message) ? 'applicationForm.errors.tooLong' : 'applicationForm.errors.invalid';
}

export function serverErrorKeys(messages: readonly string[]): string[] {
  return [...new Set(messages.map(serverErrorKey))];
}
