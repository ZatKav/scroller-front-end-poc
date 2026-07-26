import jwt from 'jsonwebtoken';

import {
  CUSTOMER_CREDENTIAL_MAX_AGE_SECONDS,
  generateCustomerCredential,
} from './auth';

describe('generateCustomerCredential', () => {
  const originalSecret = process.env.SCROLLER_CUSTOMER_CREDENTIAL_JWT_SECRET;

  beforeEach(() => {
    process.env.SCROLLER_CUSTOMER_CREDENTIAL_JWT_SECRET = 'customer-credential-test-secret-32-bytes';
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.SCROLLER_CUSTOMER_CREDENTIAL_JWT_SECRET;
    } else {
      process.env.SCROLLER_CUSTOMER_CREDENTIAL_JWT_SECRET = originalSecret;
    }
  });

  it('mints a short-lived credential scoped to one customer and service', () => {
    const token = generateCustomerCredential(42);
    const payload = jwt.verify(token, 'customer-credential-test-secret-32-bytes', {
      algorithms: ['HS256'],
      audience: 'scroller-customer-interactions-db',
      issuer: 'scroller-front-end-poc',
    }) as jwt.JwtPayload;

    expect(payload.sub).toBe('42');
    expect(payload.purpose).toBe('customer-api');
    expect(payload.exp! - payload.iat!).toBe(CUSTOMER_CREDENTIAL_MAX_AGE_SECONDS);
  });

  it('fails closed when the dedicated secret is missing', () => {
    delete process.env.SCROLLER_CUSTOMER_CREDENTIAL_JWT_SECRET;

    expect(() => generateCustomerCredential(42)).toThrow(
      'SCROLLER_CUSTOMER_CREDENTIAL_JWT_SECRET must contain at least 32 bytes',
    );
  });
});
