<h1>JSON Fast Transfer Protocol</h1>
This simple library provides a fast and efficient way to communicate between different Node.js processes using JSON over Unix Domain Sockets.

<h2>Performance</h2>
For small to medium payloads, this library offers extremely high speed communication with minimal overhead, considerably higher bandwidth and lower latency than popular alternatives.
<br>
NOTE: For larger payloads (more than ~96 KB), popular HTTP-based libraries start to quickly outperform this library by a large margin, as their protocol overhead no longer dominates at that scale and actually starts helping.

<h3>Benchmarks</h3>

<table class="center">
  <caption>Performance comparison of Fastify+Fetch and JFTP</caption>
  <thead>
    <tr>
      <th rowspan="2">Payload<br>size (KB)</th>
      <th colspan="2">Req/sec</th>
      <th colspan="2">Latency (ms)</th>
    </tr>
    <tr>
      <th>Fastify</th>
      <th>JFTP</th>
      <th>Fastify</th>
      <th>JFTP</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>0</td><td>28,050</td><td>183,300</td><td>0.07</td><td>0.014</td></tr>
    <tr><td>0.5</td><td>10,700</td><td>131,500</td><td>0.28</td><td>0.02</td></tr>
    <tr><td>1</td><td>10,600</td><td>110,100</td><td>0.29</td><td>0.02</td></tr>
    <tr><td>2</td><td>10,300</td><td>87,250</td><td>0.28</td><td>0.03</td></tr>
    <tr><td>4</td><td>10,300</td><td>62,100</td><td>0.29</td><td>0.04</td></tr>
    <tr><td>8</td><td>9,975</td><td>39,600</td><td>0.29</td><td>0.07</td></tr>
    <tr><td>12</td><td>9,800</td><td>28,800</td><td>0.31</td><td>0.09</td></tr>
    <tr><td>16</td><td>9,300</td><td>22,800</td><td>0.33</td><td>0.13</td></tr>
    <tr><td>24</td><td>8,925</td><td>16,100</td><td>0.41</td><td>0.17</td></tr>
    <tr><td>32</td><td>8,600</td><td>12,400</td><td>0.55</td><td>0.26</td></tr>
    <tr><td>48</td><td>7,875</td><td>8,400</td><td>1.6</td><td>0.36</td></tr>
    <tr><td>64</td><td>6,220</td><td>6,350</td><td>11.7</td><td>0.42</td></tr>
    <tr><td>72</td><td>5,350</td><td>5,800</td><td>14.2</td><td>0.44</td></tr>
    <tr><td>96</td><td>4,300</td><td>4,300</td><td>20.8</td><td>2.4</td></tr>
    <tr><td>128</td><td>3,320</td><td>2,350</td><td>29.8</td><td>42</td></tr>
    <tr><td>256</td><td>1,420</td><td>655</td><td>70.8</td><td>152</td></tr>
  </tbody>
</table>

*Tested under equal conditions with no routing on Node.js v22.18.0*

JFTP is best suited for scenarios where you need high bandwidth and low latency with small to medium JSON payloads (for example, a backend authentication service, which just transmits tokens or user credentials to other services).

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

  // Handle socket disconnect
  socket.on('close', () => {
    console.log('Client disconnected');
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

const socket = new UDSocket(3000); //custom timeout

// Handle socket errors
socket.on('error', (error) => {
  console.error('Socket error:', error);
});

// Connect to the server
socket.connect(SOCKET_PATH, () => {
  console.log("Connected to the server");

  // Send a message and wait for a response
  socket.rpc({ anything: 'Hello from client!' })
    .then(response => {
      console.log('Received response:', response);
    })
    .catch(error => {
      console.error('RPC error:', error);
    });

});
```