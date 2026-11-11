import { OdooLoggedOutEvent } from "@sincpro/mobile-odoo/domain/auth";
import {
  EventHandler,
  odooBoundedContext,
} from "@sincpro/mobile-odoo/infrastructure/framework";
import { CommandForgetOdooUser } from "@sincpro/mobile-odoo/services/session/forget_odoo_user.feature";

/** Someone signed out of Odoo: Odoo's client forgets them (`CommandForgetOdooUser`). */
@odooBoundedContext.handler([OdooLoggedOutEvent])
export class OnOdooLoggedOut extends EventHandler<OdooLoggedOutEvent> {
  async handle(event: OdooLoggedOutEvent): Promise<void> {
    await this.boundedContext.execute(new CommandForgetOdooUser(event.uid));
  }
}
