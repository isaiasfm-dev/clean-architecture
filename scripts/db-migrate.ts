// scripts/db-migrate.ts
import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { config as loadDotenv } from "dotenv";

type PsqlOptions = {
  readonly input?: string;
  readonly args?: readonly string[];
};

const envFile = process.env.ENV_FILE ?? ".env.db";
const migrationsDir = process.env.MIGRATIONS_DIR ?? "db/migrations";
const dbService = process.env.DB_SERVICE ?? "postgres";
const firstMigration = process.env.FIRST_MIGRATION ?? "001_init.sql";

loadDotenv({ path: envFile });

const postgresUser = requiredEnv("POSTGRES_USER");
const postgresDb = requiredEnv("POSTGRES_DB");

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function runPsql({ input, args = [] }: PsqlOptions = {}): Promise<string> {
  const dockerArgs = [
    "compose",
    "--env-file",
    envFile,
    "exec",
    "-T",
    dbService,
    "psql",
    "-v",
    "ON_ERROR_STOP=1",
    "-U",
    postgresUser,
    "-d",
    postgresDb,
    ...args,
  ];

  return new Promise((resolve, reject) => {
    const child = spawn("docker", dockerArgs, {
      stdio: ["pipe", "pipe", "inherit"],
    });

    let stdout = "";

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }

      reject(new Error(`psql command failed with exit code ${code ?? "unknown"}`));
    });

    if (input) {
      child.stdin.end(input);
      return;
    }

    child.stdin.end();
  });
}

async function ensureMigrationsTable(): Promise<void> {
  await runPsql({
    input: `
CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  previous_name text REFERENCES schema_migrations(name),
  applied_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE schema_migrations
  ADD COLUMN IF NOT EXISTS previous_name text REFERENCES schema_migrations(name);
`,
  });
}

async function listMigrationFiles(): Promise<string[]> {
  const entries = await readdir(migrationsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();
}

async function isMigrationApplied(migrationName: string): Promise<boolean> {
  const result = await runPsql({
    args: ["-v", `migration_name=${migrationName}`, "-At"],
    input: "SELECT 1 FROM schema_migrations WHERE name = :'migration_name';\n",
  });

  return result.trim() === "1";
}

async function findAppliedPreviousMigration(migrationName: string): Promise<string> {
  const result = await runPsql({
    args: ["-v", `migration_name=${migrationName}`, "-At"],
    input: "SELECT COALESCE(previous_name, '') FROM schema_migrations WHERE name = :'migration_name';\n",
  });

  return result.trim();
}

async function applyMigration(migrationName: string, previousMigration: string): Promise<void> {
  const migrationPath = path.join(migrationsDir, migrationName);
  const sql = await readFile(migrationPath, "utf8");

  await runPsql({
    args: [
      "-v",
      `migration_name=${migrationName}`,
      "-v",
      `previous_migration=${previousMigration}`,
    ],
    input: `
BEGIN;
${sql}

INSERT INTO schema_migrations (name, previous_name)
VALUES (:'migration_name', NULLIF(:'previous_migration', ''));
COMMIT;
`,
  });
}

async function migrate(): Promise<void> {
  await ensureMigrationsTable();

  const migrationFiles = await listMigrationFiles();
  let previousMigration = "";

  for (const migrationName of migrationFiles) {
    if (!previousMigration && migrationName !== firstMigration) {
      throw new Error(`First migration must be ${firstMigration}, found ${migrationName}`);
    }

    if (await isMigrationApplied(migrationName)) {
      const appliedPreviousMigration = await findAppliedPreviousMigration(migrationName);

      if (appliedPreviousMigration !== previousMigration) {
        throw new Error(
          `Migration ${migrationName} depends on ${appliedPreviousMigration || "<none>"}, expected ${previousMigration || "<none>"}`,
        );
      }

      console.log(`Skipping migration ${migrationName}`);
      previousMigration = migrationName;
      continue;
    }

    if (previousMigration && !(await isMigrationApplied(previousMigration))) {
      throw new Error(`Cannot apply ${migrationName} before ${previousMigration}`);
    }

    console.log(`Applying migration ${migrationName}`);
    await applyMigration(migrationName, previousMigration);
    previousMigration = migrationName;
  }
}

migrate().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(message);
  process.exitCode = 1;
});
