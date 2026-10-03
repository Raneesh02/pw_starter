export interface UserCredentials {
  email: string;
  password: string;
}

export const USERS = {
  customer: {
    email: 'customer@practicesoftwaretesting.com',
    password: 'welcome01',
  },
  admin: {
    email: 'admin@practicesoftwaretesting.com',
    password: process.env.ADMIN_PASSWORD ?? '',
  },
  guest: {
    email: 'guest@example.com',
    firstName: 'Guest',
    lastName: 'User',
  },
};

export const LOGIN = {
  wrongPassword: 'not-the-password',
  invalidCredentialsError: 'Invalid email or password',
};
