/** Connection options for BullMQ's underlying ioredis client. */
export interface RedisConnectionOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: Record<string, never>;
}

/**
 * Parses a `redis://` or `rediss://` connection string into the options BullMQ
 * expects. Keeping this as a plain options object (rather than a shared ioredis
 * instance) lets BullMQ manage the blocking-connection settings it requires for
 * workers.
 *
 * Supports an optional `/<db>` path (database index) and enables TLS for the
 * `rediss://` scheme, so managed/TLS Redis URLs work out of the box.
 */
export function buildRedisConnection(redisUrl: string | undefined): RedisConnectionOptions {
  if (!redisUrl) {
    throw new Error('REDIS_URL is not set. Copy backend/.env.example to backend/.env.');
  }

  const url = new URL(redisUrl);
  const connection: RedisConnectionOptions = {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
  };
  if (url.username) {
    connection.username = decodeURIComponent(url.username);
  }
  if (url.password) {
    connection.password = decodeURIComponent(url.password);
  }

  const dbIndex = url.pathname.replace(/^\//, '');
  if (dbIndex && !Number.isNaN(Number(dbIndex))) {
    connection.db = Number(dbIndex);
  }
  if (url.protocol === 'rediss:') {
    connection.tls = {};
  }

  return connection;
}
