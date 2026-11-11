import { Command } from "@sincpro/client-framework";
import { OdooSession } from "@sincpro/mobile-odoo/domain/auth";
import {
  Feature,
  odooBoundedContext,
} from "@sincpro/mobile-odoo/infrastructure/framework";

export class CommandRestoreSession extends Command<OdooSession | null> {}

/**
 * The session kept on the phone, when the app starts:
 * 1. A client not configured yet points at the saved server and, with a session, at its user
 *    and companies.
 * 2. With a session, the app's session is restored: its queue and crons run again.
 * Final: the session, or `null` when nobody is signed in.
 */
@odooBoundedContext.feature(CommandRestoreSession)
export class RestoreSession extends Feature<
  CommandRestoreSession,
  OdooSession | null
> {
  async execute(): Promise<OdooSession | null> {
    const session = await this.sessions.findById(OdooSession.UUID);
    if (!this.odoo.isConfigured) {
      const server = await this.servers.find();
      if (server) this.odoo.setServer(server);
      if (session) {
        this.odoo.setUser(session.user, session.password);
        this.odoo.setUserContext(
          session.companyId,
          session.companyIds || [],
          session.lang || false,
        );
      }
    }
    if (!session) {
      this.logger.info("No Odoo session kept");
      return null;
    }
    await this.appSession.restoreSession();
    this.logger.info("Odoo session restored", { uid: session.uid });
    return session;
  }
}
