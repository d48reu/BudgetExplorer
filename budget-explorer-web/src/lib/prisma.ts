import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

let prismaInstance: PrismaClient | null = null

/**
 * Local connections skip TLS; remote connections (Neon) require a verified
 * certificate — rejectUnauthorized: false would accept any cert and expose
 * the connection credentials to a machine-in-the-middle.
 */
function sslConfig(connectionString: string) {
  try {
    const host = new URL(connectionString).hostname
    if (host === 'localhost' || host === '127.0.0.1') return undefined
  } catch {
    // Unparseable URL: fall through to verified TLS, the safe default.
  }
  return { rejectUnauthorized: true }
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL!
  const pool = new Pool({
    connectionString,
    ssl: sslConfig(connectionString),
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter }) as unknown as PrismaClient
}

export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma
  if (!prismaInstance) prismaInstance = createPrismaClient()

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaInstance
  }

  return prismaInstance
}

// Preserve the existing import surface while deferring the database connection
// until a query actually reads a Prisma model or method.
const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrisma()
    const value = Reflect.get(client, property, client)
    return typeof value === 'function' ? value.bind(client) : value
  },
})

export default prisma
