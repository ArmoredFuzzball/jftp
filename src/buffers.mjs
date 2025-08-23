export default class PayloadEncoder {
  constructor(headerBytes = 4, maxPayloadBytes = 1024 * 1024) {
    this.HEADER_BYTES = headerBytes;
    this.POOL_SIZE = (maxPayloadBytes + headerBytes) * 4;
    this.MAX_PAYLOAD_SIZE = maxPayloadBytes;
    this.pool = Buffer.allocUnsafe(this.POOL_SIZE);
    this.offset = 0;
    this.buffers = []; // queue of incoming buffers
    this.totalLength = 0; // track available bytes
    this.expectedLength = null; // how long the current payload should be
  }

  /** @param {string} str */
  encode(str) {
    const byteLength = Buffer.byteLength(str);
    if (byteLength > this.MAX_PAYLOAD_SIZE) throw new Error("Payload too large");
    this._enlargePool(byteLength);
    const start = this.offset;
    this.offset += this.HEADER_BYTES + byteLength;
    this.pool.writeUInt32BE(byteLength, start);
    this.pool.write(str, start + this.HEADER_BYTES);
    const payload = this.pool.subarray(start, this.offset);
    return payload;
  }

  _enlargePool(byteLength) {
    if (this.offset + this.HEADER_BYTES + byteLength > this.POOL_SIZE) {
      this.pool = Buffer.allocUnsafe(this.POOL_SIZE);
      this.offset = 0;
    }
    // else this.POOL_SIZE = (this.HEADER_BYTES + byteLength) * 4;
  }

  /**
   * @param {Buffer} chunk
   * @param {function(Buffer)} cb
   */
  decode(chunk, cb) {
    this.buffers.push(chunk);
    this.totalLength += chunk.length;
    while (true) {
      if (this.expectedLength === null) {
        if (this.totalLength < this.HEADER_BYTES) break;
        const header = this._readBytes(this.HEADER_BYTES);
        this.expectedLength = header.readUInt32BE(0);
      }
      if (this.totalLength < this.expectedLength) break;
      const payload = this._readBytes(this.expectedLength);
      cb(payload);
      this.expectedLength = null;
    }
  }

  _readBytes(n) {
    let remaining = n;
    let offset = 0;
    const out = Buffer.allocUnsafe(n);
    while (remaining > 0) {
      const buf = this.buffers[0];
      const take = Math.min(buf.length, remaining);
      buf.copy(out, offset, 0, take);
      if (take < buf.length) this.buffers[0] = buf.slice(take);
      else this.buffers.shift();
      offset += take;
      remaining -= take;
    }
    this.totalLength -= n;
    return out;
  }
}