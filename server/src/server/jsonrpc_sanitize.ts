export function sanitizeJsonRpcPayload(payload: any) {
  if (payload == null) return payload;
  const normalizeOne = (resp: any) => {
    try {
      if (resp && typeof resp === 'object' && resp.result && typeof resp.result === 'object') {
        const r = resp.result;
        if (r.__schema === 'v2-object-result' && Array.isArray(r.content) && r.content.length === 0) {
          delete r.content;
        }
      }
    } catch {
      // noop
    }
  };

  if (Array.isArray(payload)) {
    payload.forEach(normalizeOne);
  } else {
    normalizeOne(payload);
  }
  return payload;
}

export default sanitizeJsonRpcPayload;
