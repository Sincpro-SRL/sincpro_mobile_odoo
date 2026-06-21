import { IMigration } from "@sincpro/mobile/domain/database";
import { DBCursor } from "@sincpro/mobile/infrastructure/database";

export const enum DATABASE_TABLES {
  AUTH = "odoo_auth",
  SERVERS = "servers",
}

async function createAuthTable(): Promise<void> {
  await DBCursor.execAsync(`
    CREATE TABLE IF NOT EXISTS ${DATABASE_TABLES.AUTH} (
      uuid TEXT PRIMARY KEY NOT NULL,
      data TEXT NOT NULL,
      uid INTEGER NOT NULL,
      user TEXT NOT NULL,
      db TEXT NOT NULL
    )
  `);
}

async function createServerTable(): Promise<void> {
  await DBCursor.execAsync(`
    CREATE TABLE IF NOT EXISTS ${DATABASE_TABLES.SERVERS} (
      server TEXT NOT NULL,
      database TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

const MIGRATIONS: IMigration[] = [
  { name: DATABASE_TABLES.AUTH, migrationFn: createAuthTable },
  { name: DATABASE_TABLES.SERVERS, migrationFn: createServerTable },
];

export default MIGRATIONS;
