import { repos } from "@sincpro/mobile/entrypoints/db";
import { orchestrator } from "@sincpro/mobile/framework/orchestrator";
import { loggerUseCases } from "@sincpro/mobile/infrastructure/logger";
import { EventBus } from "@sincpro/mobile/infrastructure/workers/EventBus";
import { AuthAdapter } from "@sincpro/mobile-odoo/adapters/odoo/auth.adapter";
import { UserAdapter } from "@sincpro/mobile-odoo/adapters/odoo/user.adapter";
import {
  OdooLoggedInEvent,
  OdooLoggedOutEvent,
  OdooSession,
} from "@sincpro/mobile-odoo/domain/auth";
import { EOdooRepository } from "@sincpro/mobile-odoo/domain/repository";
import { getOdooClient } from "@sincpro/mobile-odoo/infrastructure/OdooClient";

class OdooAuthService {
  private get serverRepository() {
    return repos.get(EOdooRepository.SERVER);
  }

  private get authRepository() {
    return repos.get(EOdooRepository.AUTH);
  }

  async login(user: string, pass: string): Promise<OdooSession> {
    const odooClient = getOdooClient();
    const serverParams = await this.serverRepository.find();

    if (serverParams) {
      odooClient.setServer(serverParams);
      loggerUseCases.info("Start login with server params:", serverParams);
    }

    odooClient.setUser(user, pass);

    const uid = await AuthAdapter.login(user, pass);
    const profile = await UserAdapter.getProfile(uid);

    loggerUseCases.info("User logged in successfully", { user, uid });

    odooClient.setUserContext(
      profile.company_id[0],
      profile.company_ids,
      profile.lang || false,
    );

    const session = OdooSession.obj<OdooSession>({
      uid,
      db: odooClient.database!,
      user,
      password: pass,
      companyId: profile.company_id[0],
      companyIds: profile.company_ids,
      email: profile.email,
      name: profile.name,
      tz: profile.tz,
      phone: profile.phone,
      mobile: profile.mobile,
      street: profile.street,
      street2: profile.street2,
      city: profile.city,
      zip: profile.zip,
      countryId: profile.countryId,
      vat: profile.vat,
      lang: profile.lang,
    });

    await this.authRepository.save(session);
    loggerUseCases.info(
      `Odoo session saved to repository odoo uid ${session.uid} local uuid ${session.uuid}`,
    );

    await orchestrator.authenticateSession();

    await EventBus.publish(
      OdooLoggedInEvent.create({
        uid: session.uid,
        user: session.user,
        password: pass,
        db: session.db,
        userName: session.name,
        email: session.email,
        companyId: session.companyId,
        companyIds: session.companyIds,
      }),
    );

    return session;
  }

  async logout(): Promise<void> {
    loggerUseCases.info("Logout start");
    const session = await this.loadSession();

    const serverParams = await this.serverRepository.find();
    await orchestrator.unauthenticateSession();

    if (serverParams) {
      await this.serverRepository.save(serverParams);
    }

    await EventBus.publish(
      OdooLoggedOutEvent.create({
        uid: session?.uid || 0,
      }),
    );

    loggerUseCases.info("Logout completed");
  }

  async loadSession(): Promise<OdooSession | null> {
    loggerUseCases.info("Loading Odoo session from DB");
    const session = await this.authRepository.findById(OdooSession.UUID);
    loggerUseCases.info("Session loaded", session?.uid, session?.email);
    const odooClient = getOdooClient();

    if (!odooClient.isConfigured) {
      const server = await this.serverRepository.find();
      if (server) {
        odooClient.setServer(server);
      }
      if (session) {
        odooClient.setUser(session.user, session.password);
        odooClient.setUserContext(
          session.companyId,
          session.companyIds || [],
          session.lang || false,
        );
      }
    }

    loggerUseCases.info(
      "Loading session from DB",
      session?.uid,
      session?.email,
    );

    await orchestrator.restoreSession();

    return session;
  }
}

export const odooAuthService = new OdooAuthService();
