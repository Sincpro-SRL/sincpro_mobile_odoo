import { loggerAdapter } from "@sincpro/client-framework";
import {
  type DocumentCriteria,
  rowsMatching,
} from "@sincpro/mobile/domain/database";
import { EntityCollection } from "@sincpro/mobile/domain/entity";
import { DBCursor } from "@sincpro/mobile/infrastructure/database";
import { EOdooRepository } from "@sincpro/mobile-odoo/domain/repository";
import { IServer } from "@sincpro/mobile-odoo/domain/server";
import { DATABASE_TABLES } from "@sincpro/mobile-odoo/entrypoints/db/migrations";

class ServerRepositoryImpl {
  public readonly name = EOdooRepository.SERVER;
  public readonly table = DATABASE_TABLES.SERVERS;
  async update(server: IServer): Promise<void> {
    loggerAdapter.debug("Updating singleton server");
    await DBCursor.mutateDatabase(`DELETE FROM ${DATABASE_TABLES.SERVERS}`);
    await DBCursor.mutateDatabase(
      `INSERT INTO ${DATABASE_TABLES.SERVERS} (server, database) VALUES (?, ?)`,
      server.server,
      server.database,
    );
    loggerAdapter.info("Singleton server updated");
  }

  async save(
    entity: IServer | IServer[] | EntityCollection<any>,
  ): Promise<void> {
    const server = Array.isArray(entity)
      ? entity[0]
      : (entity as any).first
        ? (entity as any).first()
        : entity;
    await this.update(server);
  }

  async find(): Promise<IServer | null> {
    loggerAdapter.debug("Fetching singleton server");
    const result = await DBCursor.getFirstAsync<IServer>(
      `SELECT server, database FROM ${DATABASE_TABLES.SERVERS} LIMIT 1`,
    );
    return result ?? null;
  }

  async delete(): Promise<void> {
    loggerAdapter.debug("Deleting singleton server");
    await DBCursor.mutateDatabase(`DELETE FROM ${DATABASE_TABLES.SERVERS}`);
    loggerAdapter.info("Singleton server deleted");
  }

  async remove(entity: IServer | IServer[]): Promise<void> {
    await this.delete();
  }

  async findById(id: number | string): Promise<IServer | null> {
    return this.find();
  }

  async findAll(): Promise<EntityCollection<any>> {
    const result = await this.find();
    return new EntityCollection(
      (result ? [result] : []) as any,
    ) as unknown as EntityCollection<any>;
  }

  async findByCriteria(
    criteria: DocumentCriteria<IServer>,
  ): Promise<EntityCollection<any>> {
    const stored = await this.findAll();
    const matched = rowsMatching(stored.toArray() as IServer[], criteria);
    return new EntityCollection(matched as any);
  }
}

export const ServerRepository = new ServerRepositoryImpl();
