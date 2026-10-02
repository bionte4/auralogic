import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis | null;

  constructor() {
    const url = process.env.REDIS_URL?.trim();
    if (!url) {
      this.client = null;
      return;
    }
    this.client = new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false, lazyConnect: true });
    this.client.on('error', (error: Error) => {
      this.logger.error(error.message);
    });
  }

  async getJson<T>(key: string, accept: (value: unknown) => value is T): Promise<T | null> {
    if (!this.client) {
      return null;
    }
    try {
      const raw = await this.client.get(key);
      if (!raw) {
        return null;
      }
      const parsed: unknown = JSON.parse(raw);
      return accept(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.client) {
      return;
    }
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Redis write failed.');
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client) {
      return;
    }
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Redis delete failed.');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      this.client.disconnect();
    }
  }
}

export function courseStructureKey(courseId: string): string {
  return `course:structure:${courseId}`;
}

export function progressKey(userId: string, courseId: string): string {
  return `progress:${userId}:${courseId}`;
}
