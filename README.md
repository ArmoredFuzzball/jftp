<h1>JSON Fast Transfer Protocol</h1>
This simple library provides a fast and efficient way to communicate between different Node.js processes using JSON over Unix Domain Sockets.

<h2>Performance</h2>
For small payloads, this library offers extremely high speed communication with minimal overhead, considerably higher bandwidth and lower latency than popular alternatives.
<br>
NOTE: For larger payloads (more than ~40 KB), popular HTTP-based libraries start to quickly outperform this library by a large margin, as their overhead no longer dominates at that scale and actually starts helping.
<br><br>
JFTP is best suited for scenarios where you need high bandwidth and low latency with small JSON payloads (for example, a backend authentication service, which just transmits tokens or user credentials to other services).

<h2>Security</h2>
Unix Domain Sockets are not exposed to the network. Instead, they are files in the file system. This typically makes them more secure than communication over localhost. Care should still be taken to ensure that the folder which contains the Unix Domain Socket file is properly permissioned and accessible only to trusted users. This helps prevent unauthorized access to the communication channel.

<h2>Server Example</h2>

```js
import { UDSocketServer } from 'jftp';
const SOCKET_PATH = './secure_directory/my_socket.sock';

const server = new UDSocketServer();

// Handle incoming connections
server.on('connection', (socket) => {
  console.log('Client connected');

  // Handle incoming messages
  socket.handle((message) => {
    console.log('Received message:', message);
    return { anything: 'Hello from server!' };
  });

  // Handle socket errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Listen for incoming connections
server.start(SOCKET_PATH, () => console.log(`Server listening on ${SOCKET_PATH}`));
```

<h2>Client Example</h2>

```js
import UDSocket from 'jftp';
const SOCKET_PATH = './secure_directory/my_socket.sock';

const socket = new UDSocket();

// Send a message and wait for a response
socket.rpc({ anything: 'Hello from client!' })
  .then(response => {
    console.log('Received response:', response);
  })
  .catch(error => {
    //currently not implemented, promise will never reject
  });

// Handle socket errors
socket.on('error', (error) => {
  console.error('Socket error:', error);
});

// Connect to the server
socket.connect(SOCKET_PATH, () => console.log("Connected to the server"));
```