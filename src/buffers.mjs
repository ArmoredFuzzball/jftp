export default class PayloadEncoder {
  constructor(options = { headerSize: undefined }) {
    this.HEADER_BYTES = options.headerSize ?? 7;
    this.buffer = Buffer.alloc(0); // leftover bytes between pushes
  }

  /** @param {string} str */
  encode(str) {
    const byteLength = Buffer.byteLength(str, 'ascii');
    const header = byteLength.toString().padStart(this.HEADER_BYTES, '0');
    return header + str;
  }

  /**
   * @param {Buffer} chunk
   * @param {function(Buffer): void} cb
   * @returns {void}
   */
  decode(chunk, cb) {
    //-fast path for a single complete message
    const messageTotal = this.HEADER_BYTES + this._parseHeader(chunk);
    if (chunk.length === messageTotal) {
      const payloadBuf = chunk.subarray(this.HEADER_BYTES, messageTotal);
      return cb(payloadBuf);
    }
    //-medium path for n complete messages with leftover
    while (true) {
      const messageTotal = this.HEADER_BYTES + this._parseHeader(chunk);
      // stop if incomplete or invalid
      if (messageTotal > 0 && chunk.length > messageTotal) {
        const payloadBuf = chunk.subarray(this.HEADER_BYTES, messageTotal);
        cb(payloadBuf);
        chunk = chunk.subarray(messageTotal);
      } else break;
    }
    //-slow path for incomplete messages
    // append incoming chunk to our leftover buffer
    this.buffer = Buffer.concat([this.buffer, chunk]);
    // process as many full messages as possible
    while (true) {
      // need at least HEADER_BYTES to know payload length
      if (this.buffer.length < this.HEADER_BYTES) return;
      // read header as ASCII digits
      const messageTotal = this.HEADER_BYTES + this._parseHeader(this.buffer);
      // do we have the full payload yet?
      if (this.buffer.length < messageTotal) return; // wait for more data
      // extract payload (make a copy to avoid retaining a huge buffer)
      const payloadBuf = this.buffer.subarray(this.HEADER_BYTES, messageTotal);
      // advance buffer (slice returns a new view; reassign to leftover copy)
      this.buffer = this.buffer.subarray(messageTotal);
      cb(payloadBuf);
    }
  }

  /**
   * Parses ASCII digits from a buffer starting at 0 for headerBytes length
   * @param {Buffer} buffer
   */
  _parseHeader(buffer) {
    let len = 0;
    //loop through each digit in the header
    for (let i = 0; i < this.HEADER_BYTES; i++) {
      // assuming ASCII '0'..'9'
      //add the new digit to the end of the number
      len = len * 10 + (buffer[i] - 48);
    }
    return len;
  }
}