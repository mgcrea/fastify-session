export const asBuffer = (maybeBuffer: Buffer | string, encoding: BufferEncoding = "ascii"): Buffer =>
  Buffer.isBuffer(maybeBuffer) ? maybeBuffer : Buffer.from(maybeBuffer, encoding);
