/**
 * Seeds a couple of sample leads for local development. Does not run the
 * pipeline — use the dashboard's "Run pipeline" button (or POST
 * /api/leads/:id/run) once OPENAI_API_KEY is configured, so seeding never
 * accidentally spends API credits.
 */
import "@/lib/env";
import { db } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";

const SAMPLE_LEADS = [
  {
    companyName: "Procore",
    domain: "procore.com",
    homepageUrl: "https://www.procore.com",
    source: "seed",
    notes: "Construction management software — serves general contractors, owners, and specialty contractors.",
  },
  {
    companyName: "Vercel",
    domain: "vercel.com",
    homepageUrl: "https://vercel.com",
    source: "seed",
    notes: "Frontend cloud platform — serves individual developers, startups, and enterprise platform teams.",
  },
];

async function main() {
  for (const lead of SAMPLE_LEADS) {
    await db.insert(leads).values(lead).onConflictDoNothing({ target: leads.domain });
  }
  console.log(`Seeded ${SAMPLE_LEADS.length} lead(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
