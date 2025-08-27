import * as net from 'net';

/**
 * A client socket that connects to a unix domain socket server and can send/receive JSON messages.
 */
export default class UDSocket extends net.Socket {
  constructor(options?: { timeoutMs?: number; encoderOptions?: { headerSize?: number; maxPayloadSize?: number; poolSize?: number } });

  /**
   * Object containing all pending ACKs, keyed by message ID.
   * Each entry is an object of {resolve, reject, timeout} functions from the internal request Promise.
   * This is used internally to match incoming ACKs to their original requests.
   * 
   * Its length can be used to measure how many requests are currently pending.
   */
  ACKQueue: { [id: string]: [(data?: string | Object) => void, (err: Error | Object | string) => void, NodeJS.Timeout] };

  /**
   * Send an RPC-style message (JSON) to the server process and return a Promise that resolves with JSON data.
   */
  rpc(data?: string | Object): Promise<string | Object | undefined>;

  /**
   * Install a handler function for incoming requests.
   * The handler receives a JSON request and should return a JSON object or promise that resolves to a JSON object.
   * 
   * Errors can be safely thrown inside the handler and will be sent back to the requester as an error response.
   */
  handle(handler: (data?: string | Object) => string | Object | undefined | Promise<string | Object | undefined>): void;
}

/**
 * A server that listens on a unix domain socket and accepts UDSocket connections from client processes.
 */
export class UDSocketServer extends net.Server {
  /**
   * Optionally accept a connectionListener that receives a UDSocket.
   */
  constructor(connectionListener?: (socket: UDSocket) => void, clientOptions?: { timeoutMs?: number; encoderOptions?: { headerSize?: number; maxPayloadSize?: number; poolSize?: number } });

  // Overload .on to match net.Server and add custom UDSocket signature
  on(event: 'connection', listener: (socket: UDSocket) => void): this;
  on(event: 'close', listener: () => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: 'listening', listener: () => void): this;
  on(event: string, listener: (...args: any[]) => void): this;

  /**
   * Start listening on the given unix path. If the socket path exists it will
   * be unlinked (matching the JS behavior).
   */
  start(path: string, cb?: () => void): void;
}
