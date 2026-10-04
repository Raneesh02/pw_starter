import { ContactFormData } from '../pages/contact.page';

export const CONTACT_SUBJECTS = {
  customerService: 'customer-service',
  webmaster: 'webmaster',
  return: 'return',
  payments: 'payments',
  warranty: 'warranty',
  statusOfOrder: 'status-of-order',
};

export const VALID_CONTACT: ContactFormData = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  subject: CONTACT_SUBJECTS.customerService,
  message:
    'This is a valid message body with more than fifty characters in length for testing purposes.',
};

export const INVALID_EMAIL_CASES: { id: string; label: string; email: string; error: RegExp }[] = [
  {
    id: 'CN05-01',
    label: 'missing @ symbol',
    email: 'john.doe.example.com',
    error: /email format is invalid/i,
  },
  {
    id: 'CN05-02',
    label: 'missing local part',
    email: '@example.com',
    error: /email format is invalid/i,
  },
  { id: 'CN05-03', label: 'missing domain', email: 'john.doe@', error: /email format is invalid/i },
  {
    id: 'CN05-05',
    label: 'double @ symbol',
    email: 'john@@example.com',
    error: /email format is invalid/i,
  },
  {
    id: 'CN05-06',
    label: 'spaces inside address',
    email: 'john doe@example.com',
    error: /email format is invalid/i,
  },
  {
    id: 'CN05-07',
    label: 'consecutive dots in domain',
    email: 'john.doe@example..com',
    error: /email format is invalid/i,
  },
  {
    id: 'CN05-08',
    label: 'leading dot in local part',
    email: '.john@example.com',
    error: /email format is invalid/i,
  },
  {
    id: 'CN05-09',
    label: 'special characters',
    email: 'john<>@exa!mple.com',
    error: /email format is invalid/i,
  },
  { id: 'CN05-10', label: 'only whitespace', email: '   ', error: /email is required/i },
];

export const MESSAGE_MIN_LENGTH = 50;
export const MESSAGE_MAX_LENGTH = 250; // enforced by the server (422), not the client

export const VALID_MESSAGE_CASES: { id: string; label: string; message: string }[] = [
  { id: 'CN06-01', label: 'exactly 50 characters', message: 'a'.repeat(MESSAGE_MIN_LENGTH) },
  { id: 'CN06-02', label: '51 characters', message: 'a'.repeat(MESSAGE_MIN_LENGTH + 1) },
  {
    id: 'CN06-03',
    label: 'exactly 250 characters (maximum)',
    message: 'a'.repeat(MESSAGE_MAX_LENGTH),
  },
  {
    id: 'CN06-04',
    label: 'HTML, unicode and quotes',
    message:
      '<script>alert(1)</script> é ñ 日本語 😀 "quotes" & <b>bold</b> padding padding padding padding',
  },
];

export const INVALID_MESSAGE_CASES: { id: string; label: string; message: string }[] = [
  { id: 'CN07-01', label: '1 character', message: 'a' },
  {
    id: 'CN07-02',
    label: '49 characters (one below minimum)',
    message: 'a'.repeat(MESSAGE_MIN_LENGTH - 1),
  },
];

export const INVALID_CONTACT = {
  invalidEmail: 'not-an-email',
  shortMessage: 'short',
};
