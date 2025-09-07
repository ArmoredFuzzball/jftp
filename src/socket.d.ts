import * as net from 'net';

/** Options for the payload encoder/decoder */
export interface EncoderOptions {
  /**
   * Number of digits used to represent the maximum byte-length of a message in decimal form (default 7).
   * 
   * E.g. 7 digits allows messages up to 9,999,999 bytes (under 10MB).
   */
  headerSize?: number;
}

/** Options for UDSocket and UDSocketServer */
export interface Options {
  /** Number of milliseconds to wait for an ACK before rejecting the rpc Promise (default 5000). */
  timeoutMs?: number;
  /** Options object passed to the internal encoder/decoder */
  encoderOptions?: EncoderOptions;
  /** Options object passed to the internal net.Socket constructor */
  socketOptions?: net.SocketConstructorOpts;
}

/**
 * A client socket that connects to a unix domain socket server and can send/receive JSON messages.
 */
export default class UDSocket extends net.Socket {
  constructor(options?: Options);

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
  rpc(data?: string | Object): Promise<string | Object>;

  /**
   * Install a handler function for incoming requests.
   * The handler receives a JSON request and should return a JSON object or promise that resolves to a JSON object.
   * 
   * Errors can be safely thrown inside the handler and will be sent back to the requester as an error response.
   */
  handle(handler: (data?: string | Object, socket?: UDSocket) => (string | Object | Promise<string | Object>)): void;

  /**
   * Set a custom JSON serializer function for outgoing messages.
   * By default JSON.stringify is used, but this can be replaced with a faster alternative like fast-json-stringify.
   * 
   * The serializer function must take a single Object argument and return a string.
   * 
   * If you want to use fast-json-stringify, you can create a serializer with the createSerializer() helper function exported from this module.
   */
  schema(serializer: (data: Object) => string): void;
}

/**
 * A server that listens on a unix domain socket and accepts UDSocket connections from client processes.
 */
export class UDSocketServer extends net.Server {
  /**
   * Optionally accept a connectionListener that receives a UDSocket.
   */
  constructor(clientOptions?: Options, connectionListener?: (socket: UDSocket) => void);

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

/** Creates a fast-json-stringify serializer for the RPC message format, adding necessary hidden fields to the schema automatically.
 * 
 * The generated serializer can be passed to UDSocket.schema() to replace the default JSON.stringify.
 * 
 * It is recommended to call this function once per schema at startup and reuse the returned serializer functions for all UDSocket instances.
 * 
 * See https://www.npmjs.com/package/fast-json-stringify for more information.
 * 
 * @param json A JSON schema object defining the structure of the messages to be serialized.
 *             This should define the structure of the "data" field only; the "id" and "error" fields are added automatically.
 * @returns A function that takes an Object and returns a string.
 * 
 * @throws If fast-json-stringify is not installed, an error is thrown.
 */
export function createSerializer(json: Object): (data: Object) => string;

// Note: fast-json-stringify is an optional dependency. If it's not installed, the code will fall back to JSON.stringify.
// To use it, install it in your project with: npm i fast-json-stringify
// Then you can create a serializer with createSerializer() and pass it to UDSocket.schema().