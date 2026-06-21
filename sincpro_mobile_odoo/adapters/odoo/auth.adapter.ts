import { getOdooClient } from "@sincpro/mobile-odoo/infrastructure/OdooClient";

class AuthAdapterImpl {
  async login(user: string, pass: string): Promise<number> {
    const client = getOdooClient();
    client.setUser(user, pass);
    return await client.authenticate();
  }
}

export const AuthAdapter = new AuthAdapterImpl();
