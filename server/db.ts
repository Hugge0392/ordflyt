import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure connection pool for Neon serverless with proper lifecycle management
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Connection pool settings to handle Neon's connection lifecycle
  max: 10, // Maximum number of connections in the pool
  maxUses: 7500, // Close connections after 7500 queries to prevent stale connections
  allowExitOnIdle: false, // Keep pool alive
  // maxLifetimeSeconds: 60 * 60, // Commented out - not supported by current PoolConfig type
  idleTimeoutMillis: 30 * 1000, // Close idle connections after 30 seconds
});

// Add error handling for connection pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err);
});

export const db = drizzle({ client: pool, schema });