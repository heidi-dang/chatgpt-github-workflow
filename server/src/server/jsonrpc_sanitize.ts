<<<<<<< HEAD
export function sanitizeToolCallResult(result: any) {
  if (
    result &&
    typeof result === "object" &&
    result.__schema === "v2-object-result" &&
    Array.isArray((result as any).content) &&
    (result as any).content.length === 0
  ) {
    delete (result as any).content;
  }
  return result;
}

/**
 * Mutates JSON-RPC payload(s) in-place.
 * Supports single response object or batch array.
 */
export default function sanitizeJsonRpcPayload(payload: any) {
  const sanitizeOne = (msg: any) => {
    if (!msg || typeof msg !== "object") return;

    // Standard JSON-RPC response shape: { jsonrpc, id, result? , error? }
    if (msg.result && typeof msg.result === "object") {
      sanitizeToolCallResult(msg.result);
    }

    // Some transports may wrap under { responses: [...] } or similar.
    // Safe no-op if not present.
    const maybeResponses = (msg as any).responses;
    if (Array.isArray(maybeResponses)) {
      for (const r of maybeResponses) sanitizeOne(r);
=======
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
>>>>>>> a7b5215 (fix(mcp): sanitize v2 tool results at transport output)
    }
  };

  if (Array.isArray(payload)) {
<<<<<<< HEAD
    for (const msg of payload) sanitizeOne(msg);
    return payload;
  }

  sanitizeOne(payload);
  return payload;
}
=======
    payload.forEach(normalizeOne);
  } else {
    normalizeOne(payload);
  }
  return payload;
}

export default sanitizeJsonRpcPayload;
>>>>>>> a7b5215 (fix(mcp): sanitize v2 tool results at transport output)
