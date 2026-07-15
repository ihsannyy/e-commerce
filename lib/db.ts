import Datastore from '@seald-io/nedb'
import path from 'path'

// Path to store our NeDB database file in the workspace root
const DB_FILE = path.join(process.cwd(), 'db.nedb')
// Cache NeDB instance in globalThis to prevent multiple instances
// and disk reads on hot-reload in Next.js development
const globalForNedb = globalThis as unknown as {
  nedb: Datastore | undefined
}

const nedb = globalForNedb.nedb ?? new Datastore({ filename: DB_FILE, autoload: true })

if (process.env.NODE_ENV !== 'production') {
  globalForNedb.nedb = nedb
}

export const db = {
  async get(key: string): Promise<string | null> {
    try {
      const doc = await nedb.findOneAsync({ _id: key })
      return doc ? (doc as unknown as { value: string }).value : null
    } catch (error) {
      console.error('⚠️ Error reading from NeDB:', error)
      return null
    }
  },

  async set(key: string, value: string): Promise<'OK' | null> {
    try {
      // Use upsert to insert or update the key-value document
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
}
