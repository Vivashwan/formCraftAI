import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./configs/schema.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgresql://neondb_owner:CaA2nZHXJ4jU@ep-dark-bar-a5ytug5u.us-east-2.aws.neon.tech/neondb?sslmode=require",
  },
});
