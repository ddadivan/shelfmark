import { createServer, type Server, type Socket } from 'node:net';
import type { PGlite } from '@electric-sql/pglite';

const SSL_REQUEST = 80877103;
const CANCEL_REQUEST = 80877102;
const STARTUP_PROTOCOL = 196608;
/** Frontend messages that end an exchange: Query, Sync, Terminate. */
const EXCHANGE_END = new Set(['Q', 'S', 'X'].map((c) => c.charCodeAt(0)));
const TERMINATE = 'X'.charCodeAt(0);

/**
 * Minimal Postgres wire server in front of ONE PGlite instance (a single backend session), used
 * only by tests.
 *
 * Why not `PGLiteSocketServer`: it queues single protocol messages, so the Parse / Bind / Execute
 * of one pooled connection can interleave with another connection's messages. The shared session
 * then loses the unnamed prepared statement (Prisma P2039 "unnamed prepared statement does not
 * exist", Better Auth "Failed to get session"). Here a connection sends a whole exchange (up to
 * Sync or Query) as one unit, and while a transaction is open the session belongs to that
 * connection until COMMIT / ROLLBACK. Other connections wait their turn, so parallel requests
 * still overlap in the app, only the database session is serialized.
 */
export class ExchangeSocketServer {
  private readonly server: Server;
  private readonly sockets = new Set<Socket>();
  private owner: Socket | null = null;
  private readonly waiters: Array<() => void> = [];
  private host = '127.0.0.1';
  private port = 0;

  constructor(private readonly db: PGlite) {
    this.server = createServer((socket) => this.accept(socket));
  }

  /** `host:port` once started. */
  getServerConn(): string {
    return `${this.host}:${this.port}`;
  }

  async start(host: string): Promise<void> {
    await this.db.waitReady;
    this.host = host;
    await new Promise<void>((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(0, host, () => {
        const address = this.server.address();
        if (address === null || typeof address !== 'object') {
          reject(new Error('Expected address info'));
          return;
        }
        this.port = address.port;
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    for (const socket of this.sockets) {
      socket.destroy();
    }
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }

  private accept(socket: Socket): void {
    this.sockets.add(socket);
    socket.setNoDelay(true);
    let buffer = Buffer.alloc(0);
    let pending: Buffer[] = [];
    let chain: Promise<void> = Promise.resolve();

    const run = (exchange: Buffer): void => {
      chain = chain
        .then(() => this.runExchange(socket, exchange))
        .catch(() => {
          socket.destroy();
        });
    };

    socket.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      for (;;) {
        if (buffer.length >= 8) {
          const code = buffer.readInt32BE(4);
          if (buffer.readInt32BE(0) === 8 && code === SSL_REQUEST) {
            socket.write('N');
            buffer = buffer.subarray(8);
            continue;
          }
          if (buffer.readInt32BE(0) === 16 && code === CANCEL_REQUEST) {
            buffer = buffer.subarray(16);
            continue;
          }
          if (code === STARTUP_PROTOCOL && pending.length === 0) {
            const length = buffer.readInt32BE(0);
            if (buffer.length < length) return;
            run(buffer.subarray(0, length));
            buffer = buffer.subarray(length);
            continue;
          }
        }
        if (buffer.length < 5) return;
        const length = 1 + buffer.readInt32BE(1);
        if (buffer.length < length) return;
        const type = buffer[0];
        const message = buffer.subarray(0, length);
        buffer = buffer.subarray(length);
        if (type === TERMINATE) {
          socket.end();
          return;
        }
        pending.push(message);
        if (EXCHANGE_END.has(type)) {
          run(Buffer.concat(pending));
          pending = [];
        }
      }
    });
    const release = (): void => {
      this.sockets.delete(socket);
      chain = chain.then(() => this.finish(socket, true));
    };
    socket.on('error', () => undefined);
    socket.on('close', release);
  }

  private async runExchange(socket: Socket, exchange: Buffer): Promise<void> {
    await this.acquire(socket);
    try {
      await this.db.runExclusive(() =>
        this.db.execProtocolRawStream(new Uint8Array(exchange), {
          onRawData: (data) => {
            if (socket.writable) socket.write(Buffer.from(data));
          },
        }),
      );
    } finally {
      await this.finish(socket, false);
    }
  }

  private async finish(socket: Socket, closed: boolean): Promise<void> {
    if (this.owner !== socket) return;
    if (this.db.isInTransaction()) {
      if (!closed) return;
      await this.db.exec('ROLLBACK');
    }
    this.owner = null;
    this.waiters.shift()?.();
  }

  private async acquire(socket: Socket): Promise<void> {
    while (this.owner !== null && this.owner !== socket) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
    this.owner = socket;
  }
}
