/**
 * Env loading for standalone scripts (worker, migrate, seed) that run
 * outside the Next.js runtime, which loads .env.local itself. Mirrors
 * Next's precedence: .env.local wins, .env is the fallback.
 */
import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });
