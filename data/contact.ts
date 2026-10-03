import path from 'path';

export const CONTACT = {
  subjects: {
    customerService: 'customer-service',
    webmaster: 'webmaster',
    return: 'return',
    payments: 'payments',
    warranty: 'warranty',
    statusOfOrder: 'status-of-order',
  },
  valid: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    subject: 'return',
    message:
      'This is a valid message with enough characters to pass the minimum length validation.',
  },
  invalidEmail: 'not-an-email',
  shortMessage: 'Too short',
  nonEmptyAttachmentPath: path.join(__dirname, 'files', 'sample-attachment.txt'),
};
