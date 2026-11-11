import type { IServer } from "@sincpro/mobile-odoo/domain/server";
import type { OdooClient } from "@sincpro/mobile-odoo/infrastructure/OdooClient";

/**
 * Points Odoo's client at the server kept on the phone, when there is one — the first step of
 * signing in and of restoring a session. Answers the server.
 */
export async function pointAtSavedServer(
  servers: { find(): Promise<IServer | null> },
  odoo: OdooClient,
): Promise<IServer | null> {
  const server = await servers.find();
  if (server) odoo.setServer(server);
  return server;
}
