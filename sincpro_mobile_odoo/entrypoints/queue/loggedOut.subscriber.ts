import { Subscriber } from "@sincpro/mobile/domain/event_sourcing";
import { loggerQueueProcessor } from "@sincpro/mobile/infrastructure/logger";
import { OdooLoggedOutEvent } from "@sincpro/mobile-odoo/domain/auth";

export class LoggedOutSubscriber extends Subscriber {
  public readonly requiresAuth = false;
  listen = [OdooLoggedOutEvent];

  getEvent(event: OdooLoggedOutEvent): OdooLoggedOutEvent {
    return OdooLoggedOutEvent.from(event);
  }

  async process(_event: OdooLoggedOutEvent): Promise<void> {
    loggerQueueProcessor.info("Reacting to Odoo logout event");
  }
}
