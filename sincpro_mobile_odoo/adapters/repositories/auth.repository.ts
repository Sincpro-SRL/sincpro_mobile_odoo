import { loggerAdapter } from "@sincpro/client-framework";
import { type DocumentCriteria } from "@sincpro/mobile/domain/database";
import { EntityCollection } from "@sincpro/mobile/domain/entity";
import { type IRepository } from "@sincpro/mobile/domain/repositories";
import { DBCursor } from "@sincpro/mobile/infrastructure/database";
import { OdooSession } from "@sincpro/mobile-odoo/domain/auth";
import { EOdooRepository } from "@sincpro/mobile-odoo/domain/repository";
import { DATABASE_TABLES } from "@sincpro/mobile-odoo/entrypoints/db/migrations";

class AuthRepositoryImpl implements IRepository<
  OdooSession,
  EntityCollection<OdooSession>
> {
  public readonly name = EOdooRepository.AUTH;
  public readonly table = DATABASE_TABLES.AUTH;

  async save(
    entity: OdooSession | OdooSession[] | EntityCollection<OdooSession>,
  ): Promise<void> {
    loggerAdapter.debug("Saving Odoo session to database");

    await DBCursor.mutateDatabase(`DELETE FROM ${this.table}`);

    const sessions = Array.isArray(entity)
      ? entity
      : entity instanceof EntityCollection
        ? entity.toArray()
        : [entity];
    const session = sessions[0];

    if (session) {
      await DBCursor.mutateDatabase(
        `INSERT INTO ${this.table} (uuid, data, uid, user, db) VALUES (?, ?, ?, ?, ?)`,
        OdooSession.UUID,
        session.asJSON(),
        session.uid,
        session.user,
        session.db,
      );
      loggerAdapter.info("Odoo session saved to repository", {
        uid: session.uid,
        uuid: OdooSession.UUID,
      });
    } else {
      loggerAdapter.warn("No session to save");
    }
  }

  async findById(uuid: string): Promise<OdooSession | null> {
    loggerAdapter.debug(`Finding Odoo session with UUID: ${uuid}`);

    const row = await DBCursor.getFirstAsync<{ uuid: string; data: string }>(
      `SELECT uuid, data FROM ${this.table} WHERE uuid = ?`,
      uuid,
    );

    if (!row) {
      loggerAdapter.info("No Odoo session found in database");
      return null;
    }

    loggerAdapter.info("Odoo session loaded successfully");
    return OdooSession.fromJSON(row.data);
  }

  async findByIds(ids: string[]): Promise<EntityCollection<OdooSession>> {
    const sessions: OdooSession[] = [];
    for (const id of ids) {
      const session = await this.findById(id);
      if (session) sessions.push(session);
    }
    return new EntityCollection(sessions);
  }

  async findAll(): Promise<EntityCollection<OdooSession>> {
    loggerAdapter.info("Finding all Odoo sessions");
    const rows = await DBCursor.getAllAsync<{ uuid: string; data: string }>(
      `SELECT uuid, data FROM ${this.table}`,
    );

    if (rows.length === 0) {
      return new EntityCollection<OdooSession>([]);
    }

    const sessions = rows.map((row) => OdooSession.fromJSON(row.data));
    return new EntityCollection<OdooSession>(sessions as any[]);
  }

  async upsert(
    entity: OdooSession | OdooSession[] | EntityCollection<OdooSession>,
  ): Promise<void> {
    await this.save(entity);
  }

  async publish(): Promise<void> {}

  async findByCriteria(
    criteria: DocumentCriteria<OdooSession>,
  ): Promise<EntityCollection<OdooSession>> {
    return (await this.findAll()).findByCriteria(criteria);
  }

  async remove(entity: OdooSession | OdooSession[]): Promise<void> {
    loggerAdapter.info("Clearing Odoo session from database");
    await DBCursor.mutateDatabase(`DELETE FROM ${this.table}`);
    loggerAdapter.info("Odoo session cleared successfully");
  }
}

export const AuthRepository = new AuthRepositoryImpl();
