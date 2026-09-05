'use strict';
const net = require('net');
const { EventEmitter } = require('events');

// Herdr speaks newline-delimited JSON over a Unix socket (macOS/Linux) or a
// named pipe (Windows). net.connect({path}) covers both with one code path,
// which is why this talks to the socket directly instead of shelling out.
//
// Two shapes, because the server treats them differently:
//
//   HerdrApi     one request per connection. The server closes the socket
//                after it answers, so every call reconnects. This is what the
//                herdr CLI does internally.
//   HerdrEvents  a connection that stays open after events.subscribe. Sending
//                a request down this one makes the server hang up.

function connectSocket(socketPath) {
  return new Promise((resolve, reject) => {
    if (!socketPath) {
      reject(new Error('HERDR_SOCKET_PATH is not set; is herdr running?'));
      return;
    }
    const socket = net.connect({ path: socketPath });
    socket.setEncoding('utf8');
    socket.once('connect', () => resolve(socket));
    socket.once('error', reject);
  });
}

// Splits a stream into NDJSON messages.
function lineReader(socket, onMessage) {
  let buffer = '';
  socket.on('data', (chunk) => {
    buffer += chunk;
    let nl;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }
      onMessage(msg);
    }
  });
}

// One request, one connection, closed on the way out.
function requestOnce(method, params = {}, { socketPath = process.env.HERDR_SOCKET_PATH, timeoutMs = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (socket) socket.destroy();
      fn(value);
    };
    const timer = setTimeout(() => finish(reject, new Error('timed out: ' + method)), timeoutMs);
    let socket = null;

    connectSocket(socketPath).then((s) => {
      socket = s;
      lineReader(socket, (msg) => {
        if (msg.error) {
          finish(reject, Object.assign(new Error(msg.error.message || 'herdr error: ' + method), { herdr: msg.error }));
        } else if (msg.result !== undefined) {
          finish(resolve, msg.result);
        }
      });
      socket.on('error', (err) => finish(reject, err));
      socket.on('close', () => finish(reject, new Error('herdr closed the connection during ' + method)));
      socket.write(JSON.stringify({ id: 'mn', method, params }) + '\n');
    }).catch((err) => finish(reject, err));
  });
}

// Stateless handle over requestOnce, so callers can hold "a client".
class HerdrApi {
  constructor(socketPath = process.env.HERDR_SOCKET_PATH) { this.socketPath = socketPath; }
  request(method, params, opts) { return requestOnce(method, params, { socketPath: this.socketPath, ...opts }); }
  async snapshot() { return this.request('session.snapshot', {}); }
  close() { /* nothing is held open */ }
}

// A long-lived subscription. Emits 'event' per pushed message and 'disconnect'
// when herdr goes away.
class HerdrEvents extends EventEmitter {
  constructor(socketPath = process.env.HERDR_SOCKET_PATH) {
    super();
    this.socketPath = socketPath;
    this.socket = null;
    this.closed = false;
  }

  async subscribe(types) {
    const socket = await connectSocket(this.socketPath);
    this.socket = socket;

    const ack = new Promise((resolve, reject) => {
      let acked = false;
      lineReader(socket, (msg) => {
        if (!acked) {
          acked = true;
          if (msg.error) reject(Object.assign(new Error(msg.error.message || 'subscribe failed'), { herdr: msg.error }));
          else resolve(msg.result);
          return;
        }
        this.emit('event', msg);
      });
      socket.on('error', (err) => { if (!acked) { acked = true; reject(err); } else this.emit('error', err); });
      socket.on('close', () => {
        this.socket = null;
        if (!acked) { acked = true; reject(new Error('herdr closed the subscription')); }
        else if (!this.closed) this.emit('disconnect');
      });
      socket.write(JSON.stringify({
        id: 'mn_sub',
        method: 'events.subscribe',
        params: { subscriptions: types.map((type) => ({ type })) },
      }) + '\n');
    });

    return ack;
  }

  close() {
    this.closed = true;
    if (this.socket) this.socket.destroy();
  }
}

module.exports = { HerdrApi, HerdrEvents, requestOnce, connectSocket };
