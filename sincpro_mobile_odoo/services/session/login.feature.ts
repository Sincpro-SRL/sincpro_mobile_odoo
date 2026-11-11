import { Command } from "@sincpro/client-framework";
import { newEvent } from "@sincpro/mobile/domain/events";
import {
  OdooLoggedInEvent,
  OdooSession,
} from "@sincpro/mobile-odoo/domain/auth";
import {
  Feature,
  odooBoundedContext,
} from "@sincpro/mobile-odoo/infrastructure/framework";
import { pointAtSavedServer } from "@sincpro/mobile-odoo/services/session/common";

export class CommandLogin extends Command<OdooSession> {
  constructor(
    readonly user: string,
    readonly password: string,
  ) {
    super();
  }
}

/**
 * Signs a person in to Odoo:
 * 1. The client points at the saved server, when there is one.
 * 2. Odoo authenticates the user and answers their profile; the client takes its companies and
 *    language.
 * 3. The session is kept on the phone — with the password, which the client needs to sign in
 *    again when Odoo's session expires (`OdooSession`).
 * 4. The app's session starts: its queue and crons run for a signed-in person.
 * Final: `OdooLoggedInEvent` tells the app who signed in, without the password; the session is
 *    the answer.
 */
@odooBoundedContext.feature(CommandLogin)
export class Login extends Feature<CommandLogin, OdooSession> {
  async execute(command: CommandLogin): Promise<OdooSession> {
    await pointAtSavedServer(this.servers, this.odoo);

    const uid = await this.accounts.login(command.user, command.password);
    const profile = await this.profiles.getProfile(uid);
    this.odoo.setUserContext(
      profile.company_id[0],
      profile.company_ids,
      profile.lang || false,
    );

    const session = OdooSession.obj<OdooSession>({
      uid,
      db: this.odoo.database!,
      user: command.user,
      password: command.password,
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
    await this.sessions.save(session);
    this.span.set({ "odoo.uid": uid, "odoo.company_id": session.companyId });
    this.logger.info("Signed in to Odoo", {
      uid,
      company_id: session.companyId,
    });

    await this.appSession.authenticateSession();
    await this.publisher.publish(
      newEvent(OdooLoggedInEvent, {
        uid: session.uid,
        user: session.user,
        db: session.db,
        userName: session.name,
        email: session.email,
        companyId: session.companyId,
        companyIds: session.companyIds,
      }),
    );
    return session;
  }
}
