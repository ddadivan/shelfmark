import { JSON_RPC_ERROR_CODE } from '../models/json-rpc-error-code.const';
import { JSON_RPC_MESSAGE_KIND } from '../models/json-rpc-message-kind.const';
import { parseMessage } from './parse-message';

const parse = (value: unknown) => parseMessage(JSON.stringify(value));

describe('parseMessage', () => {
  it('answers unparseable JSON with -32700 and id null', () => {
    expect(parseMessage('{"jsonrpc":')).toEqual({
      kind: JSON_RPC_MESSAGE_KIND.Invalid,
      response: { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
    });
    expect(parseMessage('')).toMatchObject({ response: { error: { code: -32700 } } });
  });

  it('refuses batches', () => {
    expect(parse([{ jsonrpc: '2.0', id: 1, method: 'ping' }])).toMatchObject({
      kind: JSON_RPC_MESSAGE_KIND.Invalid,
      response: { id: null, error: { code: JSON_RPC_ERROR_CODE.InvalidRequest } },
    });
  });

  it('refuses non-objects and a missing or wrong jsonrpc', () => {
    for (const value of [1, 'x', null, true]) {
      expect(parse(value)).toMatchObject({ response: { id: null, error: { code: -32600 } } });
    }
    expect(parse({ id: 3, method: 'ping' })).toMatchObject({
      response: { id: 3, error: { code: -32600 } },
    });
    expect(parse({ jsonrpc: '1.0', id: 'a', method: 'ping' })).toMatchObject({
      response: { id: 'a', error: { code: -32600 } },
    });
  });

  it('accepts string and integer ids, refuses null, fractions and objects', () => {
    expect(parse({ jsonrpc: '2.0', id: 'x', method: 'ping' })).toEqual({
      kind: JSON_RPC_MESSAGE_KIND.Request,
      request: { id: 'x', method: 'ping', params: {} },
    });
    expect(parse({ jsonrpc: '2.0', id: 0, method: 'ping' })).toMatchObject({
      request: { id: 0 },
    });
    for (const id of [null, 1.5, { a: 1 }, [1]]) {
      expect(parse({ jsonrpc: '2.0', id, method: 'ping' })).toMatchObject({
        response: { id: null, error: { code: -32600 } },
      });
    }
  });

  it('tells notifications from requests', () => {
    expect(parse({ jsonrpc: '2.0', method: 'notifications/initialized' })).toEqual({
      kind: JSON_RPC_MESSAGE_KIND.Notification,
      method: 'notifications/initialized',
    });
  });

  it('accepts client responses', () => {
    expect(parse({ jsonrpc: '2.0', id: 4, result: {} })).toEqual({
      kind: JSON_RPC_MESSAGE_KIND.Response,
    });
    expect(parse({ jsonrpc: '2.0', id: 4, error: { code: 1, message: 'x' } })).toEqual({
      kind: JSON_RPC_MESSAGE_KIND.Response,
    });
    expect(parse({ jsonrpc: '2.0', result: {} })).toMatchObject({
      response: { error: { code: -32600 } },
    });
    expect(parse({ jsonrpc: '2.0', id: 4, method: 7 })).toMatchObject({
      response: { id: 4, error: { code: -32600 } },
    });
  });

  it('keeps params objects and refuses other params', () => {
    expect(parse({ jsonrpc: '2.0', id: 1, method: 'm', params: { a: 1 } })).toMatchObject({
      request: { params: { a: 1 } },
    });
    for (const params of [[1], 'x', 3, null]) {
      expect(parse({ jsonrpc: '2.0', id: 1, method: 'm', params })).toMatchObject({
        response: { id: 1, error: { code: JSON_RPC_ERROR_CODE.InvalidParams } },
      });
    }
  });
});
