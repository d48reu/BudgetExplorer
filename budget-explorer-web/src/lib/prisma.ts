import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient
}

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

const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
