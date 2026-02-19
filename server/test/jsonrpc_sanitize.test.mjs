import { expect } from 'chai';
import sanitizeJsonRpcPayload from '../dist/src/server/jsonrpc_sanitize.js';

function clone(v) { return JSON.parse(JSON.stringify(v)); }

describe('sanitizeJsonRpcPayload (compiled)', () => {
  it('removes empty content for v2 single response', () => {
    const resp = { result: { __schema: 'v2-object-result', content: [], foo: 1 } };
    const out = sanitizeJsonRpcPayload(clone(resp));
    expect(out.result.content).to.be.undefined;
    expect(out.result.foo).to.equal(1);
  });

  it('preserves non-empty content for v2', () => {
    const resp = { result: { __schema: 'v2-object-result', content: ['x'], foo: 1 } };
    const out = sanitizeJsonRpcPayload(clone(resp));
    expect(out.result.content).to.deep.equal(['x']);
  });

  it('preserves non-v2 payload', () => {
    const resp = { result: { __schema: 'v1', content: [], foo: 1 } };
    const out = sanitizeJsonRpcPayload(clone(resp));
    expect(out.result.content).to.deep.equal([]);
  });

  it('handles batch responses', () => {
    const batch = [
      { result: { __schema: 'v2-object-result', content: [] } },
      { result: { __schema: 'v2-object-result', content: ['a'] } },
      { result: { __schema: 'v1', content: [] } }
    ];
    const out = sanitizeJsonRpcPayload(clone(batch));
    expect(out[0].result.content).to.be.undefined;
    expect(out[1].result.content).to.deep.equal(['a']);
    expect(out[2].result.content).to.deep.equal([]);
  });
});
