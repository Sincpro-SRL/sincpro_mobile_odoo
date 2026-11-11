import {
  OdooLoggedOutEvent,
  OdooSession,
} from "@sincpro/mobile-odoo/domain/auth";
import {
  Feature,
  odooBoundedContext,
} from "@sincpro/mobile-odoo/infrastructure/framework";

/**
 * Odoo's client forgets who signed out, so no request goes on with their credentials:
 * 1. Someone signed in again before this arrived (a session is kept): nothing to forget.
 * Final: the client drops the user, the password and Odoo's session. Doing it twice changes
 *    nothing — delivery is at least once.
 */
@odooBoundedContext.feature(OdooLoggedOutEvent)
export class ForgetOdooUser extends Feature<OdooLoggedOutEvent, void> {
  async execute(event: OdooLoggedOutEvent): Promise<void> {
    if (await this.sessions.findById(OdooSession.UUID)) return;
    this.odoo.cleanCredentials();
    this.logger.info("Odoo's client forgot the user", { uid: event.uid });
  }
}
