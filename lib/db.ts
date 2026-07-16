import Datastore from '@seald-io/nedb'
import path from 'path'

const isVercel = process.env.VERCEL === '1'
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

// Global in-memory storage fallback for Vercel (prevents crashing, resets on cold-start)
const globalForMemoryDb = globalThis as unknown as {
  memoryDb: Map<string, string> | undefined
}
const memoryDb = globalForMemoryDb.memoryDb ?? new Map<string, string>()
if (process.env.NODE_ENV !== 'production') {
  globalForMemoryDb.memoryDb = memoryDb
}

// NeDB setup (only initialized if NOT running on Vercel to avoid Read-Only Filesystem crash)
let nedb: Datastore | null = null
if (!isVercel) {
  const DB_FILE = path.join(process.cwd(), 'db.nedb')
  const globalForNedb = globalThis as unknown as {
    nedb: Datastore | undefined
  }
  nedb = globalForNedb.nedb ?? new Datastore({ filename: DB_FILE, autoload: true })
  if (process.env.NODE_ENV !== 'production') {
    globalForNedb.nedb = nedb
  }
}

// Helper to query Upstash Redis REST API
async function queryUpstash(command: string[]): Promise<unknown> {
  if (!upstashUrl || !upstashToken) return null
  try {
    const response = await fetch(`${upstashUrl.replace(/\/$/, '')}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${upstashToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(command)
    })
    const data = await response.json() as { result: unknown; error?: string }
    if (data.error) {
      console.error('⚠️ Upstash Redis Error:', data.error)
      return null
    }
    return data.result
  } catch (err) {
    console.error('⚠️ Failed to query Upstash Redis:', err)
    return null
  }
}

export const db = {
  async get(key: string): Promise<string | null> {
    // 1. If running on Vercel and Upstash is configured, use it
    if (isVercel && upstashUrl && upstashToken) {
      const result = await queryUpstash(['GET', key])
      return typeof result === 'string' ? result : null
    }

    // 2. If running on Vercel and Upstash is NOT configured, use In-Memory fallback
    if (isVercel) {
      return memoryDb.get(key) || null
    }

    // 3. If running locally, use NeDB
    if (nedb) {
      try {
        const doc = await nedb.findOneAsync({ _id: key })
        return doc ? (doc as unknown as { value: string }).value : null
      } catch (error) {
        console.error('⚠️ Error reading from NeDB:', error)
        return null
      }
    }

    return null
  },

  async set(key: string, value: string): Promise<'OK' | null> {
    // 1. If running on Vercel and Upstash is configured, use it
    if (isVercel && upstashUrl && upstashToken) {
      await queryUpstash(['SET', key, value])
      return 'OK'
    }

    // 2. If running on Vercel and Upstash is NOT configured, use In-Memory fallback
    if (isVercel) {
      memoryDb.set(key, value)
      return 'OK'
    }

    // 3. If running locally, use NeDB
    if (nedb) {
      try {
        await nedb.updateAsync(
          { _id: key },
          { _id: key, value },
          { upsert: true }
        )
        return 'OK'
      } catch (error) {
        console.error('⚠️ Error writing to NeDB:', error)
        return null
      }
    }

    return null
  }
}
