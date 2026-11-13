import { ContractError } from './contract-error';
import { expectError } from './expect-error';

describe('expectError', () => {
  it('passes for the expected status, and for the expected code when one is named', async () => {
    await expectError(Promise.reject(new ContractError(404, 'Gone')), { status: 404 });
    await expectError(Promise.reject(new ContractError(404, 'Gone')), {
      status: 404,
      code: 'Gone',
    });
  });

  it('fails when the call succeeds', async () => {
    await expect(expectError(Promise.resolve(1), { status: 400 }, 'save')).rejects.toThrow(
      'save succeeded, expected HTTP 400',
    );
  });

  it('fails for another status or another code', async () => {
    await expect(
      expectError(Promise.reject(new ContractError(409, null)), { status: 404 }),
    ).rejects.toThrow('expected HTTP 404');
    await expect(
      expectError(Promise.reject(new ContractError(404, 'A')), { status: 404, code: 'B' }),
    ).rejects.toThrow('expected code "B"');
  });

  it('fails for a rejection without an HTTP status, such as a plain Error', async () => {
    await expect(
      expectError(Promise.reject(new Error('Mock: failed')), { status: 404 }),
    ).rejects.toThrow('failed without an HTTP status (Mock: failed)');
  });
});
