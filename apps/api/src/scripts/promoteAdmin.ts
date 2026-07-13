/** Promote an existing user to admin (also marks email verified so they can log in):
 *    pnpm --filter api promote-admin you@example.com
 */
try {
  process.loadEnvFile();
} catch {
  /* no .env file */
}
import { eq } from "drizzle-orm";
import { createDb } from "../db/index.js";
import { users } from "../db/schema/index.js";

async function main() {
  const email = process.argv[2]?.toLowerCase();
  const url = process.env.DATABASE_URL;
  if (!email || !url) {
    console.error("Usage: DATABASE_URL=... pnpm --filter api promote-admin <email>");
    process.exit(1);
  }

  const db = createDb(url);
  const [updated] = await db
    .update(users)
    .set({ role: "admin", emailVerifiedAt: new Date() })
    .where(eq(users.email, email))
    .returning({ id: users.id, email: users.email, role: users.role });

  if (!updated) {
    console.error(`No user found with email ${email} — register the account first.`);
    process.exit(1);
  }
  console.log(`✅ ${updated.email} is now an admin`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
