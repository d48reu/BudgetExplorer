const LOCAL_DATABASE_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * Make the remote TLS policy explicit before `pg-connection-string` parses
 * DATABASE_URL. This avoids relying on its deprecated treatment of
 * sslmode=require/prefer/verify-ca as aliases for full certificate and
 * hostname verification.
 */
export function normalizeDatabaseUrl(connectionString: string): string {
  try {
    const url = new URL(connectionString)
    if (LOCAL_DATABASE_HOSTS.has(url.hostname)) return connectionString

    url.searchParams.set('sslmode', 'verify-full')
    return url.toString()
  } catch {
    return connectionString
  }
}
