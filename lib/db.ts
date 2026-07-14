import fs from 'fs/promises'
import path from 'path'

// Path to store our JSON database file in the workspace root
const DB_FILE = path.join(process.cwd(), 'db.json')

// Helper to read database safely
async function readDb(): Promise<Record<string, string>> {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    const err = error as { code?: string }
    if (err.code === 'ENOENT') {
      // Create empty db file if it doesn't exist yet
      await fs.writeFile(DB_FILE, JSON.stringify({}), 'utf-8')
      return {}
    }
    throw error
  }
}

// Helper to write database
async function writeDb(data: Record<string, string>): Promise<void> {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export const db = {
  async get(key: string): Promise<string | null> {
    const data = await readDb()
    return data[key] || null
  },

  async set(key: string, value: string): Promise<'OK' | null> {
    const data = await readDb()
    data[key] = value
    await writeDb(data)
    return 'OK'
  }
}
