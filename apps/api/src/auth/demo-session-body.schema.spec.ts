import { demoSessionBodySchema } from './demo-session-body.schema';

const validate = demoSessionBodySchema['~standard'].validate;

describe('demoSessionBodySchema', () => {
  it('accepts a user id', () => {
    expect(validate({ userId: 'abc' })).toEqual({ value: { userId: 'abc' } });
  });

  it('drops extra fields', () => {
    expect(validate({ userId: 'abc', isDemo: true })).toEqual({ value: { userId: 'abc' } });
  });

  it.each([undefined, null, 'x', {}, { userId: '' }, { userId: 5 }])('rejects %j', (value) => {
    expect(validate(value)).toMatchObject({ issues: [{ path: ['userId'] }] });
  });
});
