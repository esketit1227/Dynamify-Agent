import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// drizzle-kit reads this file directly (outside the Next.js runtime), so env
// vars aren't loaded automatically the way they are for the app.
config({ path: ".env" });
config({ path: ".env.local", override: true });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and set it, or export it before running drizzle-kit.",
  );
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
