import { buildRedisConnection } from './redis.config';

describe('buildRedisConnection', () => {
  it('parses host and port', () => {
    expect(buildRedisConnection('redis://localhost:6379')).toEqual({
      host: 'localhost',
      port: 6379,
    });
  });

  it('defaults the port to 6379', () => {
    expect(buildRedisConnection('redis://localhost')).toEqual({ host: 'localhost', port: 6379 });
  });

  it('parses credentials and a db index', () => {
    expect(buildRedisConnection('redis://user:secret@host:6380/3')).toEqual({
      host: 'host',
      port: 6380,
      username: 'user',
      password: 'secret',
      db: 3,
    });
  });

  it('enables TLS for the rediss:// scheme', () => {
    expect(buildRedisConnection('rediss://host:6379').tls).toEqual({});
  });

  it('throws when REDIS_URL is not set', () => {
    expect(() => buildRedisConnection(undefined)).toThrow(/REDIS_URL/);
  });
});
