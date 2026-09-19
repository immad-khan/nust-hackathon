import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool | null;
  __arenaNextJsDb?: ReturnType<typeof drizzle> | null;
};

function createDb() {
  if (!databaseUrl) return null;
  try {
    const pool =
      globalForDb.__arenaNextJsPostgresqlPool ??
      new Pool({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 15000,
        idleTimeoutMillis: 30000,
        max: 5,
      });

    // Silently handle background pool errors to prevent crashes
    pool.on("error", () => {});

    if (process.env.NODE_ENV !== "production") {
      globalForDb.__arenaNextJsPostgresqlPool = pool;
    }
    return drizzle(pool);
  } catch {
    return null;
  }
}

// db may be null when no DATABASE_URL is configured — all callers fall back to memory store
export const db = globalForDb.__arenaNextJsDb ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsDb = db;
}

/**
 * Execute a database operation with automatic retry on transient failures
 * (e.g. serverless cold starts, connection drops). Retries up to `maxRetries`
 * times with a short delay between attempts.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 2,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        // Wait before retrying — give the sleeping DB time to wake up
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}
