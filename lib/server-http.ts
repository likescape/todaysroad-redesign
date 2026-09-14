/** Enforce limits while reading, not after an unbounded request/response allocation. */
export async function readLimitedBody(body: ReadableStream<Uint8Array> | null, maxBytes: number): Promise<Uint8Array> {
  if (!body) throw new Error("EMPTY_BODY");
  const reader = body.getReader(), chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel(); throw new Error("BODY_TOO_LARGE"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}
