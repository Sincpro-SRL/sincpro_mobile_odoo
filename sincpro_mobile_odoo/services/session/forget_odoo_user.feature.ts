import { Command } from "@sincpro/client-framework";
import { OdooSession } from "@sincpro/mobile-odoo/domain/auth";
import {
  Feature,
  odooBoundedContext,
} from "@sincpro/mobile-odoo/infrastructure/framework";

export class CommandForgetOdooUser extends Command<void> {
  constructor(readonly uid: number) {
    super();
  }
}

/**
 * Odoo's client forgets who signed out, so no request goes on with their credentials:
 * 1. Someone signed in again before this ran (a session is kept): nothing to forget.
 * Final: the client drops the user, the password and Odoo's session. Doing it twice changes
 *    nothing — delivery is at least once.
 */
@odooBoundedContext.feature(CommandForgetOdooUser)
export class ForgetOdooUser extends Feature<CommandForgetOdooUser, void> {
  async execute(command: CommandForgetOdooUser): Promise<void> {
    if (await this.sessions.findById(OdooSession.UUID)) return;
    this.odoo.cleanCredentials();
    this.logger.info("Odoo's client forgot the user", { uid: command.uid });
  }
}
