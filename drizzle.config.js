import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load .env.local so `npm run db:push` picks up DATABASE_URL without hardcoding
// credentials in this (committed) file.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./configs/schema.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
