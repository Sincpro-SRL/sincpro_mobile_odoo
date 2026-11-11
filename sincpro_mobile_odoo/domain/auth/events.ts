import { DomainEvent } from "@sincpro/client-framework";

/**
 * A person signed in to Odoo: who, and in which companies — never their password.
 *
 * Context: an event is stored in the queue and its values may reach the logs and the telemetry,
 * so it carries no credential. v2 carried the password; v3 does not, and the rows v2 left in the
 * queue lose it (`odoo_events_without_password`).
 */
export class OdooLoggedInEvent extends DomainEvent {
  static readonly eventName = "odoo.auth.v3.logged_in";
  static readonly label = "Usuario autenticado en Odoo";
  static readonly requiresNetwork = false;

  uid: number = 0;
  user: string = "";
  db: string = "";
  userName: string = "";
  email: string = "";
  companyId: number = 0;
  companyIds: number[] = [];
}

/** A person signed out of Odoo; told after the session ended, so it never waits for one. */
export class OdooLoggedOutEvent extends DomainEvent {
  static readonly eventName = "odoo.auth.v2.logged_out";
  static readonly label = "Usuario cerró sesión en Odoo";
  static readonly requiresNetwork = false;
  static readonly requiresSession = false;

  uid: number = 0;
}
