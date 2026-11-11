const assert = require("node:assert/strict");
const { beforeEach, test } = require("node:test");

const {
  BoundedContext,
  configureProcess,
  Feature,
  Subscriber,
  valuesOf,
} = require("@sincpro/client-framework");
const { memoryLogger } = require("@sincpro/client-framework/testing");

const { createSourceLoader } = require("./load-source.cjs");

beforeEach(() => configureProcess({ logger: { engine: memoryLogger() } }));

/** Odoo's bounded context over dependencies of the test's: what each use case did, in order. */
function odooWith({ keptSession = null } = {}) {
  const calls = [];
  const published = [];
  const odooBoundedContext = new BoundedContext("odoo");
  const dependencies = {
    odoo: {
      database: "db",
      isConfigured: true,
      setServer: () => calls.push("setServer"),
      setUser: () => calls.push("setUser"),
      setUserContext: () => calls.push("setUserContext"),
      cleanCredentials: () => calls.push("cleanCredentials"),
    },
    accounts: { login: async () => 7 },
    profiles: {
      getProfile: async () => ({
        company_id: [1, "Sincpro"],
        company_ids: [1, 2],
        lang: "es_BO",
        email: "ana@example.com",
        name: "Ana",
        tz: "America/La_Paz",
      }),
    },
    sessions: {
      save: async (session) => calls.push(`save:${session.password}`),
      findById: async () => keptSession,
    },
    servers: {
      find: async () => ({ server: "odoo.example.com", database: "db" }),
      save: async () => calls.push("saveServer"),
      update: async () => calls.push("updateServer"),
      delete: async () => calls.push("deleteServer"),
    },
    appSession: {
      authenticateSession: async () => calls.push("authenticated"),
      restoreSession: async () => calls.push("restored"),
      unauthenticateSession: async () => calls.push("unauthenticated"),
    },
    publisher: { publish: async (event) => void published.push(event) },
  };
  for (const [name, dependency] of Object.entries(dependencies))
    odooBoundedContext.addDependency(name, dependency);
  const load = createSourceLoader({
    "@sincpro/mobile-odoo/infrastructure/framework": {
      Feature,
      odooBoundedContext,
    },
    "@sincpro/mobile/domain/events": {
      newEvent: (EventClass, values) => Object.assign(new EventClass(), values),
    },
    "@sincpro/mobile/domain/entity": {
      Entity: class {
        static obj(values) {
          return Object.assign(new this(), values);
        }
      },
    },
  });
  return { odooBoundedContext, load, calls, published };
}

test("signing in keeps the session, starts the app's and tells who signed in — never the password", async () => {
  const odoo = odooWith();
  const { CommandLogin } = odoo.load(
    "sincpro_mobile_odoo/services/session/login.feature.ts",
  );
  const session = await odoo.odooBoundedContext.execute(
    new CommandLogin("ana@example.com", "s3cret"),
  );
  assert.equal(session.uid, 7);
  assert.deepEqual(odoo.calls, [
    "setServer",
    "setUserContext",
    "save:s3cret",
    "authenticated",
  ]);
  const [loggedIn] = odoo.published;
  assert.equal(loggedIn.name, "odoo.auth.v3.logged_in");
  assert.equal(loggedIn.companyId, 1);
  assert.ok(!("password" in loggedIn));
  assert.doesNotMatch(JSON.stringify(valuesOf(loggedIn)), /s3cret/);
});

test("signing out ends the app's session, keeps the server and tells the app", async () => {
  const odoo = odooWith({ keptSession: { uid: 7 } });
  const { CommandLogout } = odoo.load(
    "sincpro_mobile_odoo/services/session/logout.feature.ts",
  );
  await odoo.odooBoundedContext.execute(new CommandLogout());
  assert.deepEqual(odoo.calls, ["unauthenticated", "saveServer"]);
  const [loggedOut] = odoo.published;
  assert.equal(loggedOut.name, "odoo.auth.v2.logged_out");
  assert.equal(loggedOut.uid, 7);
  assert.equal(
    loggedOut.constructor.requiresSession,
    false,
    "it never waits for a session",
  );
});

test("the use case of OdooLoggedOut is heard by the queue and forgets the user, twice the same", async () => {
  const odoo = odooWith();
  odoo.load("sincpro_mobile_odoo/services/session/forget_odoo_user.feature.ts");
  const { OdooLoggedOutEvent } = odoo.load(
    "sincpro_mobile_odoo/domain/auth/events.ts",
  );
  const subscriber = new Subscriber(odoo.odooBoundedContext);
  assert.equal(
    subscriber.eventTypeOf("odoo.auth.v2.logged_out"),
    OdooLoggedOutEvent,
  );

  const event = Object.assign(new OdooLoggedOutEvent(), { uid: 7 });
  await subscriber.handle(event);
  await subscriber.handle(event);
  assert.deepEqual(odoo.calls, ["cleanCredentials", "cleanCredentials"]);
});

test("a logout that arrives after someone signed in again forgets nobody", async () => {
  const odoo = odooWith({ keptSession: { uid: 8 } });
  odoo.load("sincpro_mobile_odoo/services/session/forget_odoo_user.feature.ts");
  const { OdooLoggedOutEvent } = odoo.load(
    "sincpro_mobile_odoo/domain/auth/events.ts",
  );
  const [handled] = await new Subscriber(odoo.odooBoundedContext).handle(
    Object.assign(new OdooLoggedOutEvent(), { uid: 7 }),
  );
  assert.ok(!("error" in handled));
  assert.deepEqual(odoo.calls, []);
});

test("without a session kept, the app's session is not restored", async () => {
  const odoo = odooWith();
  const { CommandRestoreSession } = odoo.load(
    "sincpro_mobile_odoo/services/session/restore_session.feature.ts",
  );
  assert.equal(
    await odoo.odooBoundedContext.execute(new CommandRestoreSession()),
    null,
  );
  assert.ok(!odoo.calls.includes("restored"));

  const signedIn = odooWith({
    keptSession: {
      uid: 7,
      user: "ana",
      password: "x",
      companyId: 1,
      companyIds: [1],
    },
  });
  const restore = signedIn.load(
    "sincpro_mobile_odoo/services/session/restore_session.feature.ts",
  );
  const session = await signedIn.odooBoundedContext.execute(
    new restore.CommandRestoreSession(),
  );
  assert.equal(session.uid, 7);
  assert.ok(signedIn.calls.includes("restored"));
});
