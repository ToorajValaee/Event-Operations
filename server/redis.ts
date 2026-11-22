import Redis from 'ioredis';

class CacheService {
  private client: Redis | null = null;
  private isRedisConnected = false;
  private memoryCache = new Map<string, { value: string; expiry: number }>();

  constructor() {
    this.init();
  }

  private init() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.log('ℹ️ REDIS_URL not configured - using local memory cache');
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
      });

      this.client
        .connect()
        .then(() => {
          this.isRedisConnected = true;
          console.log('✅ Connected to Redis cache service');
        })
        .catch((err) => {
          console.warn('⚠️ Redis connection failed, falling back to local memory cache:', err.message);
          this.isRedisConnected = false;
        });

      this.client.on('error', (err) => {
        // Prevent uncaught errors from crashing the app
        this.isRedisConnected = false;
      });
    } catch {
      this.isRedisConnected = false;
    }
  }

  public async get(key: string): Promise<string | null> {
    if (this.isRedisConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch (e) {
        // Fallback to memory
      }
    }

    const item = this.memoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.memoryCache.delete(key);
      return null;
    }
    return item.value;
  }

  public async set(key: string, value: string, ttlSeconds = 300): Promise<void> {
    if (this.isRedisConnected && this.client) {
      try {
        await this.client.set(key, value, 'EX', ttlSeconds);
        return;
      } catch (e) {
        // Fallback to memory
      }
    }

    this.memoryCache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  public async del(key: string): Promise<void> {
    if (this.isRedisConnected && this.client) {
      try {
        await this.client.del(key);
      } catch (e) {}
    }
    this.memoryCache.delete(key);
  }
}

export const cache = new CacheService();
