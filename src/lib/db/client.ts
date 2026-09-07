import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __dynamifyPgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __dynamifyDb: NodePgDatabase<typeof schema> | undefined;
}

/**
 * Lazily-initialized singleton. We intentionally avoid constructing the pool
 * at module load time so that `next build` (which evaluates route modules
 * without a running DATABASE_URL) doesn't fail — the pool is only opened the
 * first time a query actually runs.
 */
function getDb(): NodePgDatabase<typeof schema> {
  if (!global.__dynamifyDb) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Copy .env.example to .env.local and configure it.",
      );
    }
    global.__dynamifyPgPool = global.__dynamifyPgPool ?? new Pool({ connectionString });
    global.__dynamifyDb = drizzle(global.__dynamifyPgPool, { schema });
  }
  return global.__dynamifyDb;
}

type Db = NodePgDatabase<typeof schema>;

/** Drop-in `db` that defers connecting until the first query. */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const real = getDb();
    return Reflect.get(real as object, prop, receiver);
  },
});

export type Database = Db;
