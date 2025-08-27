import net from 'node:net';
import { unlinkSync, existsSync } from 'node:fs';
import PayloadEncoder from './buffers.mjs';

export default class UDSocket extends net.Socket {
  constructor(options = { timeoutMs: 5000, encoderOptions: undefined }) {
    super();
    this.timeoutMs = options.timeoutMs;
    this.encoder = new PayloadEncoder(options.encoderOptions);
    this.ACKQueue = {};
    this.counter = 0n;
    this.processor = this._processResponse;
    this.on('data', this._receive);
  }

  rpc(data) {
    const id = `${process.pid}-${this.counter++}`;
    this._send({ id, data });
    return new Promise((res, rej) => this._addToACKQueue(id, res, rej));
  }

  handle(fn) { this.handler = fn }

  _addToACKQueue(id, resolve, reject) {
    this.ACKQueue[id] = {
      resolve,
      reject,
      timeout: setTimeout(() => reject(new Error("RPC timeout")), this.timeoutMs)
    }
  }

  _send(data) {
    if (this.closed) throw new Error("Socket is closed");
    const string = typeof data === 'string' ? data : JSON.stringify(data);
    const payload = this.encoder.encode(string);
    this.write(payload);
  }

  _receive(chunk) {
    this.encoder.decode(chunk, this.processor.bind(this));
  }

  _processResponse(message) {
    const response = JSON.parse(message);
    const promise = this.ACKQueue[response.id];
    if (!promise) return;
    if (response.error == null) promise.resolve(response.data);
    else if (response.error instanceof Object) promise.reject(response.error);
    else promise.reject(new Error(response.error));
    delete this.ACKQueue[response.id];
  }
}

export class UDSocketServer extends net.Server {
  constructor(connectionListener, clientOptions = undefined) {
    const wrap = (fn) => (sock) => fn(this._wrapSocket(sock, clientOptions));
    super(connectionListener ? wrap(connectionListener) : undefined);
    //cast for all 3 listener types of 'connection' event
    ["on", "once", "addListener"].forEach(m =>
      this[m] = (event, fn) => super[m](event, event === "connection" ? wrap(fn) : fn)
    );
  }

  start(path, cb) {
    if (existsSync(path)) unlinkSync(path);
    this.listen(path, cb);
  }

  //essentially cast net.Socket to UDSocket
  _wrapSocket(socket, clientOptions) {
    const tmp = new UDSocket(clientOptions);
    Object.setPrototypeOf(socket, UDSocket.prototype);
    Object.assign(socket, {
      timeoutMs: tmp.timeoutMs,
      encoder: tmp.encoder,
      ACKQueue: tmp.ACKQueue,
      counter: tmp.counter,
      processor: this._processRequest.bind(this, socket),
    });
    socket.removeListener("data", socket._receive);
    socket.on("data", socket._receive);
    return socket;
  }

  /**
   * @param {UDSocket} socket
   * @param {string} message
   */
  _processRequest(socket, message) {
    if (!socket.handler) return;
    const request = JSON.parse(message);
    try {
      const result = socket.handler(request.data);
      if (!(result instanceof Promise)) {
        request.data = result;
        return socket._send(request);
      }
      result.then(data => {
        request.data = data;
        socket._send(request);
      }).catch(err => this._handleError(socket, err, request));
    } catch (err) { this._handleError(socket, err, request) };
  }

  _handleError(socket, err, response) {
    if (err instanceof Error) response.error = { code: err.code, message: err.message };
    else response.error = err;
    socket._send(response);
  }
}