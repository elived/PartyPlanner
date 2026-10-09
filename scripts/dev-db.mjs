/**
 * A local Postgres for development, with no Docker and nothing installed
 * system-wide.
 *
 * `embedded-postgres` unpacks a real PostgreSQL binary into node_modules and
 * runs it against a data directory inside the project (`.pgdata`, gitignored).
 * It is the same server `docker compose up` would give you, so schema
 * behaviour, migrations and SQL are identical — it is only the packaging that
 * differs.
 *
 * Use this OR docker-compose.yml, not both: they bind the same port.
 *
 *   npm run db:local     # leave running in its own terminal
 *   npm run db:migrate   # in a second terminal
 *   npm run dev
 *
 * Production uses a managed Postgres — see the deployment section of README.md.
 */
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(projectRoot, ".pgdata");

// Credentials and port match the DATABASE_URL in .env.example, so a fresh
// checkout needs no configuration at all.
const USER = "postgres";
const PASSWORD = "postgres";
const PORT = 5432;
const DATABASE = "party_planner";

const reset = process.argv.includes("--reset");
if (reset && existsSync(dataDir)) {
  console.info("Removing the existing data directory…");
  rmSync(dataDir, { recursive: true, force: true });
}

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: USER,
  password: PASSWORD,
  port: PORT,
  persistent: true,
});

// `initialise` fails loudly on an already-initialised directory; that is the
// normal case on every run after the first.
if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
  console.info("Initialising a new Postgres data directory…");
  await pg.initialise();
}

await pg.start();

try {
  await pg.createDatabase(DATABASE);
  console.info(`Created database "${DATABASE}".`);
} catch {
  // Already exists — expected on every run after the first.
}

console.info(
  [
    "",
    "  Postgres is running.",
    `  DATABASE_URL="postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DATABASE}?schema=public"`,
    "",
    "  Next:  npm run db:migrate   (once, in another terminal)",
    "         npm run db:seed      (optional demo data)",
    "         npm run dev",
    "",
    "  Ctrl-C to stop. Start over with: npm run db:local -- --reset",
    "",
  ].join("\n"),
);

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  console.info("\nStopping Postgres…");
  await pg.stop().catch(() => {});
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Hold the event loop open; the server runs as a child of this process.
setInterval(() => {}, 1 << 30);
