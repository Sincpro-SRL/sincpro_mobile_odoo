import { Command } from "@sincpro/client-framework";
import { newEvent } from "@sincpro/mobile/domain/events";
import {
  OdooLoggedOutEvent,
  OdooSession,
} from "@sincpro/mobile-odoo/domain/auth";
import {
  Feature,
  odooBoundedContext,
} from "@sincpro/mobile-odoo/infrastructure/framework";

export class CommandLogout extends Command<void> {}

/**
 * Signs the person out:
 * 1. The app's session ends: its queue and crons stop and the local data is cleaned; the server
 *    configuration is kept.
 * Final: `OdooLoggedOutEvent` tells the app — and Odoo's client forgets the user when it arrives
 *    (`OnOdooLoggedOut` executes `CommandForgetOdooUser`).
 */
@odooBoundedContext.feature(CommandLogout)
export class Logout extends Feature<CommandLogout, void> {
  async execute(): Promise<void> {
    const session = await this.sessions.findById(OdooSession.UUID);
    const server = await this.servers.find();
    await this.appSession.unauthenticateSession();
    if (server) await this.servers.save(server);
    const uid = session?.uid ?? 0;
    await this.publisher.publish(newEvent(OdooLoggedOutEvent, { uid }));
    this.logger.info("Signed out of Odoo", { uid });
  }
}
