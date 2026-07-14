import Redis from 'ioredis'

let redis: Redis | null = null
let useMemoryFallback = false

const memoryStore = new Map<string, string>()
const memorySets = new Map<string, Set<string>>()

try {
  redis = new Redis({
    maxRetriesPerRequest: 0,
    connectTimeout: 200,
    lazyConnect: true,
    enableOfflineQueue: false, // Fail immediately instead of queueing offline commands
    retryStrategy: () => null // Disable reconnection retries
  })

  redis.on('error', () => {
    if (!useMemoryFallback) {
      console.warn('⚠️ Redis not running. Falling back to in-memory database.')
      useMemoryFallback = true
    }
  })
} catch {
  console.warn('⚠️ Failed to initialize Redis. Falling back to in-memory database.')
  useMemoryFallback = true
}

export const db = {
  async get(key: string): Promise<string | null> {
    if (useMemoryFallback || !redis) {
      return memoryStore.get(key) || null
    }
    try {
      return await redis.get(key)
    } catch {
      useMemoryFallback = true
      return memoryStore.get(key) || null
    }
  },

  async set(key: string, value: string): Promise<'OK' | null> {
    if (useMemoryFallback || !redis) {
      memoryStore.set(key, value)
      return 'OK'
    }
    try {
      return await redis.set(key, value)
    } catch {
      useMemoryFallback = true
      memoryStore.set(key, value)
      return 'OK'
    }
  },

  async sadd(key: string, member: string): Promise<number> {
    if (useMemoryFallback || !redis) {
      if (!memorySets.has(key)) {
        memorySets.set(key, new Set())
      }
      const set = memorySets.get(key)!
      const wasAdded = !set.has(member)
      set.add(member)
      return wasAdded ? 1 : 0
    }
    try {
      return await redis.sadd(key, member)
    } catch {
      useMemoryFallback = true
      if (!memorySets.has(key)) {
        memorySets.set(key, new Set())
      }
      const set = memorySets.get(key)!
      const wasAdded = !set.has(member)
      set.add(member)
      return wasAdded ? 1 : 0
    }
  },

  async srem(key: string, member: string): Promise<number> {
    if (useMemoryFallback || !redis) {
      const set = memorySets.get(key)
      if (!set || !set.has(member)) return 0
      set.delete(member)
      return 1
    }
    try {
      return await redis.srem(key, member)
    } catch {
      useMemoryFallback = true
      const set = memorySets.get(key)
      if (!set || !set.has(member)) return 0
      set.delete(member)
      return 1
    }
  },

  async scard(key: string): Promise<number> {
    if (useMemoryFallback || !redis) {
      return memorySets.get(key)?.size || 0
    }
    try {
      return await redis.scard(key)
    } catch {
      useMemoryFallback = true
      return memorySets.get(key)?.size || 0
    }
  },

  async smembers(key: string): Promise<string[]> {
    if (useMemoryFallback || !redis) {
      const set = memorySets.get(key)
      return set ? Array.from(set) : []
    }
    try {
      return await redis.smembers(key)
    } catch {
      useMemoryFallback = true
      const set = memorySets.get(key)
      return set ? Array.from(set) : []
    }
  }
}
