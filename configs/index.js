import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "./schema";

// Server-only connection string. This module must only be imported from server
// code (server actions / route handlers) so the URL never reaches the browser.
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, {schema});