import { type BoundedContext, Publisher } from "@sincpro/client-framework";
import { orchestrator } from "@sincpro/mobile/framework/orchestrator";
import { eventDelivery } from "@sincpro/mobile/infrastructure/events/delivery";
import { AuthAdapter } from "@sincpro/mobile-odoo/adapters/odoo/auth.adapter";
import { UserAdapter } from "@sincpro/mobile-odoo/adapters/odoo/user.adapter";
import { AuthRepository } from "@sincpro/mobile-odoo/adapters/repositories/auth.repository";
import { ServerRepository } from "@sincpro/mobile-odoo/adapters/repositories/server.repository";
import {
  getOdooClient,
  type OdooClient,
} from "@sincpro/mobile-odoo/infrastructure/OdooClient";

/** The app's session: what turns its queue and crons on for a signed-in person, and off. */
export type AppSession = Pick<
  typeof orchestrator,
  "authenticateSession" | "restoreSession" | "unauthenticateSession"
>;

/**
 * What every use case of `odooBoundedContext` finds on `this` — the backend's
 * `dependencies.py`: declared once here, never in a Feature.
 */
export interface OdooDependencies {
  odoo: OdooClient;
  accounts: typeof AuthAdapter;
  profiles: typeof UserAdapter;
  sessions: typeof AuthRepository;
  servers: typeof ServerRepository;
  appSession: AppSession;
  /** Bound to each run: what a use case publishes joins its flow. */
  publisher: Publisher;
}

/** Supplies each dependency; an app replaces one with `addDependency(…, { replaces })`. */
export function registerDependencies(
  boundedContext: BoundedContext<OdooDependencies>,
): BoundedContext<OdooDependencies> {
  boundedContext.addDependency("odoo", getOdooClient());
  boundedContext.addDependency("accounts", AuthAdapter);
  boundedContext.addDependency("profiles", UserAdapter);
  boundedContext.addDependency("sessions", AuthRepository);
  boundedContext.addDependency("servers", ServerRepository);
  boundedContext.addDependency("appSession", orchestrator);
  boundedContext.addDependency("publisher", new Publisher(eventDelivery));
  return boundedContext;
}
