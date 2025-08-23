import * as net from 'net';

/**
 * Client socket class that mirrors the runtime behavior of the JS UDSocket.
 *
 * Note: many members in the JS source are underscored (private by convention),
 * but are present at runtime and therefore declared here.
 */
export default class UDSocket extends net.Socket {
  constructor();

  /**
   * Send an RPC-style message (JSON) and return a Promise that resolves with response.data
   * or rejects if response.error is present.
   *
   * Generic T allows the caller to type the expected response.
   */
  rpc<T = any>(data: any): Promise<T>;

  /**
   * Install a synchronous handler function for incoming requests.
   * The handler receives request.data and should return a value (synchronously)
   * that will be sent back to the requester.
   */
  handle(fn: (message: JSON) => JSON): void;
}

/**
 * Server that wraps net.Server to present client sockets as UDSocket instances.
 */
export class UDSocketServer extends net.Server {
  /**
   * Optionally accept a connectionListener that receives a UDSocket.
   */
  constructor(connectionListener?: (socket: UDSocket) => void);

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
