import { DomainEvent } from "@sincpro/mobile/domain/event_sourcing";

export class OdooLoggedInEvent extends DomainEvent {
  static readonly name = "odoo.auth.v2.logged_in";
  static readonly label = "Usuario autenticado en Odoo";
  static readonly requiresNetwork = false;

  public readonly name = OdooLoggedInEvent.name;
  public readonly label = OdooLoggedInEvent.label;
  public readonly requiresNetwork = OdooLoggedInEvent.requiresNetwork;

  public uid: number = 0;
  public user: string = "";
  public password: string = "";
  public db: string = "";
  public userName: string = "";
  public email: string = "";
  public companyId: number = 0;
  public companyIds: number[] = [];
}

export class OdooLoggedOutEvent extends DomainEvent {
  static readonly name = "odoo.auth.v2.logged_out";
  static readonly label = "Usuario cerró sesión en Odoo";
  static readonly requiresNetwork = false;

  public readonly name = OdooLoggedOutEvent.name;
  public readonly label = OdooLoggedOutEvent.label;
  public readonly requiresNetwork = OdooLoggedOutEvent.requiresNetwork;

  public uid: number = 0;
}
