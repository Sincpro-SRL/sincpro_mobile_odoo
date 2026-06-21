import { IUserProfileDTO } from "@sincpro/mobile-odoo/domain/auth/auth";
import { getOdooClient } from "@sincpro/mobile-odoo/infrastructure/OdooClient";

interface IResPartner {
  id: number;
  name: string;
  email: string;
  phone: boolean | string;
  mobile: boolean | string;
  street: boolean | string;
  street2: boolean | string;
  city: boolean | string;
  zip: boolean | string;
  country_id: { id: number; display_name: string } | false;
  vat: boolean | string;
  lang: string;
}

interface IResUser {
  id: number;
  name: string;
  login: string;
  tz: string;
  company_id: [number, string] | false;
  company_ids: number[];
  partner_id: IResPartner;
}

const USER_SPEC_QUERY = {
  id: {},
  name: {},
  login: {},
  company_id: {},
  company_ids: {},
  tz: {},
  partner_id: {
    fields: {
      name: {},
      email: {},
      phone: {},
      mobile: {},
      street: {},
      street2: {},
      city: {},
      zip: {},
      state_id: {
        fields: {
          id: {},
          display_name: {},
        },
      },
      country_id: {
        fields: {
          id: {},
          display_name: {},
        },
      },
      vat: {},
      lang: {},
    },
  },
};

class UserAdapterImpl {
  async getProfile(uid: number): Promise<IUserProfileDTO> {
    const odooClient = getOdooClient();
    const result = await odooClient.queryModel<IResUser>(
      "res.users",
      [["id", "=", uid]],
      USER_SPEC_QUERY,
    );

    if (result.length === 0) {
      throw new Error(`User with id ${uid} not found`);
    }

    const user = result.records[0];
    const partner = user.partner_id;

    const parseStringField = (value: boolean | string): string | null =>
      typeof value === "string" ? value : null;

    return {
      id: user.id,
      name: partner?.name || "",
      email: user.login || "",
      company_id: Array.isArray(user.company_id)
        ? [user.company_id[0], user.company_id[1]]
        : [0, ""],
      company_ids: user.company_ids || [],
      tz: user.tz || "",
      phone: parseStringField(partner?.phone),
      mobile: parseStringField(partner?.mobile),
      street: parseStringField(partner?.street),
      street2: parseStringField(partner?.street2),
      city: parseStringField(partner?.city),
      zip: parseStringField(partner?.zip),
      countryId: partner?.country_id
        ? [partner.country_id.id, partner.country_id.display_name]
        : null,
      vat: parseStringField(partner?.vat),
      lang: partner?.lang || null,
    };
  }
}

export const UserAdapter = new UserAdapterImpl();
