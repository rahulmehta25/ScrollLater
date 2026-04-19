/**
 * Seed a demo user + 3 entries + 1 queued audio_job into the scrolllater Cloud SQL database.
 *
 * Usage:
 *   ./scripts/db-proxy.sh               # in another terminal
 *   npx tsx scripts/seed-scrolllater.ts
 */
import { Pool } from "pg";
import "dotenv/config";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example and run scripts/db-proxy.sh first.",
  );
}

const pool = new Pool({ connectionString: DATABASE_URL, max: 3 });

const DEMO_USER = {
  auth_provider_uid: "demo-scrolllater-001",
  email: "demo@scrolllater.app",
  display_name: "Scroll Later Demo",
};

const DEMO_ENTRIES = [
  {
    url: "https://stratechery.com/2024/the-anthropic-opportunity/",
    title: "The Anthropic Opportunity",
    content: "(demo seed) Ben Thompson on why Anthropic's safety positioning is also a product story.",
    original_input: "https://stratechery.com/2024/the-anthropic-opportunity/",
    ai_summary: "Ben Thompson argues Anthropic's safety brand is also its positioning wedge.",
    ai_category: "tech",
    ai_tags: ["ai", "business-model"],
    ai_confidence_score: 0.91,
  },
  {
    url: "https://www.lennysnewsletter.com/p/pm-career-ladder",
    title: "The Modern PM Career Ladder",
    content: "(demo seed) Lenny's framework for IC -> Staff PM tracks.",
    original_input: "https://www.lennysnewsletter.com/p/pm-career-ladder",
    ai_summary: "Lenny lays out a skill-by-scope grid for product managers from L3 to L7.",
    ai_category: "career",
    ai_tags: ["product", "career"],
    ai_confidence_score: 0.84,
  },
  {
    url: "https://vercel.com/blog/how-we-built-web-analytics-speed-insights",
    title: "How We Built Web Analytics",
    content: "(demo seed) Vercel on edge-network sampling for Web Analytics.",
    original_input: "https://vercel.com/blog/how-we-built-web-analytics-speed-insights",
    ai_summary: "Vercel describes the edge-sampling architecture powering Web Analytics.",
    ai_category: "engineering",
    ai_tags: ["observability", "edge"],
    ai_confidence_score: 0.88,
  },
];

async function main() {
  const userRes = await pool.query(
    `INSERT INTO users (auth_provider_uid, email, display_name)
     VALUES ($1,$2,$3)
     ON CONFLICT (auth_provider_uid) DO UPDATE SET last_login_at = now()
     RETURNING id`,
    [DEMO_USER.auth_provider_uid, DEMO_USER.email, DEMO_USER.display_name],
  );
  const userId = userRes.rows[0].id;

  let entryInserted = 0;
  const entryIds: string[] = [];
  for (const e of DEMO_ENTRIES) {
    const res = await pool.query(
      `INSERT INTO entries (user_id, url, title, content, original_input,
         ai_summary, ai_category, ai_tags, ai_confidence_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [
        userId,
        e.url,
        e.title,
        e.content,
        e.original_input,
        e.ai_summary,
        e.ai_category,
        e.ai_tags,
        e.ai_confidence_score,
      ],
    );
    entryIds.push(res.rows[0].id);
    entryInserted += 1;
  }

  let jobInserted = 0;
  if (entryIds.length > 0) {
    const jobRes = await pool.query(
      `INSERT INTO audio_jobs (entry_id, status)
       VALUES ($1, 'queued')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [entryIds[0]],
    );
    jobInserted = jobRes.rowCount ?? 0;
  }

  console.log(
    `Seeded: user=${userId} entries=${entryInserted} queued_audio_jobs=${jobInserted}`,
  );
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
