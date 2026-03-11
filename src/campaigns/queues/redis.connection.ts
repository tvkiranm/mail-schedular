import type { ConnectionOptions } from 'bullmq';

export function createRedisConnection(): ConnectionOptions {
  const redisUrl = (process.env.REDIS_URL ?? '').trim();
  if (redisUrl) {
    return {
      url: redisUrl,
      maxRetriesPerRequest: null,
    };
  }

  const host = process.env.REDIS_HOST ?? '127.0.0.1';
  const port = Number.parseInt(process.env.REDIS_PORT ?? '6379', 10);
  const password = process.env.REDIS_PASSWORD;
  const db = Number.parseInt(process.env.REDIS_DB ?? '0', 10);

  return {
    host,
    port,
    password,
    db,
    maxRetriesPerRequest: null,
  };
}
