import { serverErrorKey, serverErrorKeys } from './server-error-key';

describe('serverErrorKey', () => {
  it('maps required and blank messages to the required key', () => {
    expect(serverErrorKey('This field is required.')).toBe('applicationForm.errors.required');
    expect(serverErrorKey('This field may not be blank.')).toBe('applicationForm.errors.required');
    expect(serverErrorKey('This field may not be null.')).toBe('applicationForm.errors.required');
  });

  it('maps the backend website message to the invalid url key', () => {
    expect(serverErrorKey('Enter a valid http or https address.')).toBe('common.invalidUrl');
  });

  it('maps the length message to the too long key', () => {
    expect(serverErrorKey('Ensure this field has no more than 120 characters.')).toBe(
      'applicationForm.errors.tooLong',
    );
  });

  it('maps every other message to the invalid key', () => {
    expect(serverErrorKey('Must be text.')).toBe('applicationForm.errors.invalid');
    expect(serverErrorKey('"unknown" is not a valid choice.')).toBe('applicationForm.errors.invalid');
    expect(serverErrorKey('Date has wrong format. Use one of these formats instead: YYYY-MM-DD.')).toBe(
      'applicationForm.errors.invalid',
    );
  });
});

describe('serverErrorKeys', () => {
  it('removes duplicate keys', () => {
    expect(serverErrorKeys(['This field is required.', 'This field may not be blank.'])).toEqual([
      'applicationForm.errors.required',
    ]);
  });
});
