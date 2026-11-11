import { IMigration } from "@sincpro/mobile/domain/database";
import { DBCursor } from "@sincpro/mobile/infrastructure/database";

export enum DATABASE_TABLES {
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

/**
 * The login events v2 left in the queue carried the password (`odoo.auth.v2.logged_in`): they
 * keep everything else. Nothing to do on a phone whose queue was never created.
 */
async function removePasswordsFromStoredEvents(): Promise<void> {
  const queue = await DBCursor.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'stored_events'",
  );
  if (!queue) return;
  await DBCursor.execAsync(`
    UPDATE stored_events SET payload = json_remove(payload, '$.password')
    WHERE name = 'odoo.auth.v2.logged_in'
  `);
}

const MIGRATIONS: IMigration[] = [
  { name: DATABASE_TABLES.AUTH, migrationFn: createAuthTable },
  { name: DATABASE_TABLES.SERVERS, migrationFn: createServerTable },
  {
    name: "odoo_events_without_password",
    migrationFn: removePasswordsFromStoredEvents,
  },
];

export default MIGRATIONS;
