import { Entity } from "@sincpro/mobile/domain/entity";
import { EOdooRepository } from "@sincpro/mobile-odoo/domain/repository";

export type OdooSessionID = number;

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface IUserProfileDTO {
  id: number;
  name: string;
  email: string;
  company_id: [number, string];
  company_ids: number[];
  tz: string;
  phone: string | null;
  mobile: string | null;
  street: string | null;
  street2: string | null;
  city: string | null;
  zip: string | null;
  countryId: [number, string] | null;
  vat: string | null;
  lang: string | null;
}

export interface IOdooSessionDTO {
  uid: number;
  db: string;
  user: string;
  password: string;
  profile: IUserProfileDTO;
}

export class OdooSession extends Entity {
  protected readonly REPOSITORY: string | null = EOdooRepository.AUTH;
  public static UUID: string = "SESSION";

  public readonly uuid: string = OdooSession.UUID;
  public uid: number = 0;
  public user: string = "";
  public password: string = "";
  public db: string = "";
  public email: string = "";
  public name: string = "";
  public companyId: number = 0;
  public companyIds: number[] = [];
  public tz: string = "";
  public phone: string | null = null;
  public mobile: string | null = null;
  public street: string | null = null;
  public street2: string | null = null;
  public city: string | null = null;
  public zip: string | null = null;
  public countryId: [number, string] | null = null;
  public vat: string | null = null;
  public lang: string | null = null;
}
