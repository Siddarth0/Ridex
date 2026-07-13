import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

export type Db = PostgresJsDatabase<typeof schema>;
/** A live transaction inside db.transaction(...) */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
/** Accepted by services that work both standalone and inside a transaction */
export type DbConn = Db | Tx;

export function createDb(connectionString: string): Db {
  // Supabase's pooled connections require prepare: false
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema, casing: "snake_case" });
}

export { schema };
