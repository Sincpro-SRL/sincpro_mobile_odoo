const assert = require("node:assert/strict");
const { mock, test } = require("node:test");
const axios = require("axios");

const { createSourceLoader } = require("./load-source.cjs");

const exceptions = createSourceLoader()(
  "node_modules/@sincpro/mobile/dist/exceptions.js",
);
const online = { isConnected: true, isInternetReachable: true, type: "WIFI" };
const offline = {
  isConnected: false,
  isInternetReachable: false,
  type: "NONE",
};
const methods = {
  http: (client) =>
    client.httpRequest({
      method: "GET",
      url: "https://server.invalid",
      timeout: 1234,
    }),
  server: (client) =>
    client.httpRequestToServer("GET", "/health", undefined, {}, 1234),
  rpc: (client) => client.call("common", "version", []),
};

function setup(statuses = [online]) {
  let statusIndex = 0;
  const getStatus = mock.fn(async () => {
    const status = statuses[Math.min(statusIndex++, statuses.length - 1)];
    if (status instanceof Error) throw status;
    return status;
  });
  const transport = mock.fn(async () => ({
    status: 200,
    data: { result: 42 },
  }));
  const emit = mock.fn();
  const warn = mock.fn();
  const logger = { warn, info: mock.fn(), debug: mock.fn() };
  const load = createSourceLoader({
    "@sincpro/mobile/adapters/Network.adapter": {
      NetworkAdapter: { getStatus },
    },
    "@sincpro/mobile/domain/events": {
      InternetIsDownEvent: { name: "offline" },
      InternetIsUpEvent: { name: "online" },
    },
    "@sincpro/mobile/exceptions": exceptions,
    "@sincpro/mobile/infrastructure/logger": {
      ...logger,
      loggerOdooClient: logger,
    },
    "@sincpro/mobile/infrastructure/ui/UIEventBus": { UIEventBus: { emit } },
    axios: {
      isAxiosError: axios.isAxiosError,
      create: () => ({ post: transport, request: transport }),
      request: transport,
    },
  });
  const { OdooClient } = load(
    "sincpro_mobile_odoo/infrastructure/OdooClient.ts",
  );
  const client = new OdooClient();
  client.setServer({ server: "https://server.invalid", database: "test" });
  client.setUser("test", "test");
  return { client, transport, getStatus, emit, warn };
}

function emitted(fixture, name) {
  return fixture.emit.mock.calls.filter((call) => call.arguments[0] === name)
    .length;
}

function loadEventBus(fixture) {
  const logger = { warn: mock.fn(), info: mock.fn(), debug: mock.fn() };
  return createSourceLoader({
    "../../adapters/repositories/domain_event.repository": {
      DomainEventRepository: {},
    },
    "../../adapters/repositories/domain_event_dead_letter.repository": {
      DomainEventDeadLetterRepository: {},
    },
    "../../domain/events": {
      InternetIsDownEvent: { name: "offline" },
      InternetIsUpEvent: { name: "online" },
    },
    "../../exceptions": exceptions,
    "../../infrastructure/event_chain": { runWithChain: mock.fn() },
    "../../infrastructure/logger": {
      isConsoleDebug: () => false,
      loggerQueueProcessor: logger,
    },
    "../../infrastructure/ui/activity": {
      declaresUi: mock.fn(),
      publishActivity: mock.fn(),
    },
    "../../infrastructure/ui/UIEventBus": {
      UIEventBus: { emit: fixture.emit },
    },
    // Since mobile 1.2.0 the EventBus pauses polling in the background through AppState;
    // without AppState it skips that listener, which these tests do not exercise.
    "react-native": {},
  })("node_modules/@sincpro/mobile/dist/infrastructure/workers/EventBus.js")
    .EventBus;
}

for (const [method, request] of Object.entries(methods)) {
  for (const code of ["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"]) {
    test(`${method}: ${code} with Internet active rejects without forcing offline`, async () => {
      const fixture = setup();
      const original = new axios.AxiosError("Transport failed", code);
      fixture.transport.mock.mockImplementation(async () => {
        throw original;
      });
      await assert.rejects(request(fixture.client), (error) => {
        assert.ok(error instanceof exceptions.RepeatableFailure);
        assert.ok(!(error instanceof exceptions.DomainNetworkError));
        assert.equal(error.cause, original);
        assert.equal(error.code, code);
        assert.match(
          error.message,
          code === "ERR_NETWORK" ? /servidor/ : /Tiempo de espera/,
        );
        return true;
      });
      const warnings = fixture.warn.mock.calls
        .map((call) => call.arguments.join(" "))
        .join(" ");
      assert.equal(warnings.includes("timeout"), code !== "ERR_NETWORK");
      if (code !== "ERR_NETWORK") {
        assert.match(warnings, method === "rpc" ? /35000ms/ : /1234ms/);
      }
      assert.equal(emitted(fixture, "offline"), 0);
      assert.equal(fixture.transport.mock.callCount(), 1);
      assert.equal(fixture.getStatus.mock.callCount(), 2);
    });
  }

  test(`${method}: adapter-confirmed offline blocks transport`, async () => {
    for (const status of [
      offline,
      { isConnected: true, isInternetReachable: false, type: "WIFI" },
      { isConnected: false, isInternetReachable: null, type: "NONE" },
    ]) {
      const fixture = setup([status]);
      await assert.rejects(request(fixture.client), /Sin conexión a Internet/);
      assert.equal(emitted(fixture, "offline"), 1);
      assert.equal(emitted(fixture, "online"), 0);
      assert.equal(fixture.transport.mock.callCount(), 0);
    }
  });

  test(`${method}: connectivity lost during transport is confirmed before offline`, async () => {
    const fixture = setup([online, offline]);
    fixture.transport.mock.mockImplementation(async () => {
      throw new axios.AxiosError("Network Error", "ERR_NETWORK");
    });
    await assert.rejects(request(fixture.client), /Sin conexión a Internet/);
    assert.equal(fixture.getStatus.mock.callCount(), 2);
    assert.equal(emitted(fixture, "offline"), 1);
  });

  test(`${method}: unknown connectivity permits requests without inventing network events`, async () => {
    for (const status of [
      { isConnected: true, isInternetReachable: null, type: "WIFI" },
      { isConnected: false, isInternetReachable: null, type: "UNKNOWN" },
    ]) {
      const fixture = setup([status]);
      await request(fixture.client);
      assert.equal(fixture.transport.mock.callCount(), 1);
      assert.equal(fixture.emit.mock.callCount(), 0);
      fixture.transport.mock.mockImplementation(async () => {
        throw new axios.AxiosError("Network Error", "ERR_NETWORK");
      });
      await assert.rejects(
        request(fixture.client),
        /No se pudo conectar al servidor/,
      );
      assert.equal(fixture.emit.mock.callCount(), 0);
    }
  });

  test(`${method}: adapter failure is logged, but transport errors are not hidden`, async () => {
    const fixture = setup([new Error("Native network check failed")]);
    fixture.transport.mock.mockImplementation(async () => {
      throw new axios.AxiosError("Network Error", "ERR_NETWORK");
    });
    await assert.rejects(
      request(fixture.client),
      /No se pudo conectar al servidor/,
    );
    assert.equal(fixture.transport.mock.callCount(), 1);
    assert.equal(fixture.emit.mock.callCount(), 0);
    assert.ok(
      fixture.warn.mock.calls.some((call) =>
        /Could not determine/.test(call.arguments[0]),
      ),
    );
  });

  test(`${method}: HTTP API failures keep their existing error semantics and do not force offline`, async () => {
    const fixture = setup();
    const original = new axios.AxiosError(
      "Service unavailable",
      "ERR_BAD_RESPONSE",
      {},
      null,
      {
        status: 503,
        data: {},
      },
    );
    fixture.transport.mock.mockImplementation(async () => {
      throw original;
    });
    await assert.rejects(request(fixture.client), (error) => {
      if (method === "server") {
        assert.ok(error instanceof exceptions.DomainBackendError);
        assert.match(error.message, /Service unavailable/);
      } else {
        assert.equal(error, original);
      }
      return true;
    });
    assert.equal(emitted(fixture, "offline"), 0);
    assert.equal(fixture.getStatus.mock.callCount(), 1);
  });

  test(`${method}: non-Axios failures remain visible without forcing offline`, async () => {
    const fixture = setup();
    const original = new Error("Invalid URL");
    fixture.transport.mock.mockImplementation(async () => {
      throw original;
    });
    await assert.rejects(request(fixture.client), (error) => {
      assert.equal(
        method === "server"
          ? error instanceof exceptions.DomainBackendError
          : error === original,
        true,
      );
      return true;
    });
    assert.equal(emitted(fixture, "offline"), 0);
    assert.ok(fixture.warn.mock.callCount() > 0);
  });

  for (const code of ["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"]) {
    test(`${method}: EventBus retries ${code} without switching online or unknown connectivity to offline`, async () => {
      for (const status of [
        online,
        { isConnected: true, isInternetReachable: null, type: "WIFI" },
        { isConnected: false, isInternetReachable: null, type: "UNKNOWN" },
        new Error("Native network check failed"),
      ]) {
        const fixture = setup([status]);
        const EventBus = loadEventBus(fixture);
        fixture.transport.mock.mockImplementation(async () => {
          throw new axios.AxiosError("Transport failed", code);
        });
        await assert.rejects(
          EventBus.executeSubscribers({ name: "test" }, [
            {
              getEvent: (event) => event,
              process: () => request(fixture.client),
            },
          ]),
          exceptions.RepeatableFailure,
        );
        assert.equal(EventBus.internetConnected, true);
        assert.equal(emitted(fixture, "offline"), 0);
        assert.equal(fixture.transport.mock.callCount(), 1);
      }
    });
  }

  test(`${method}: EventBus keeps confirmed offline failures retryable and marks connectivity offline`, async () => {
    const fixture = setup([offline]);
    const EventBus = loadEventBus(fixture);
    await assert.rejects(
      EventBus.executeSubscribers({ name: "test" }, [
        {
          getEvent: (event) => event,
          process: () => request(fixture.client),
        },
      ]),
      exceptions.RepeatableFailure,
    );
    assert.equal(EventBus.internetConnected, false);
    assert.ok(emitted(fixture, "offline") > 0);
    assert.equal(fixture.transport.mock.callCount(), 0);
  });
}

for (const [name, type] of [
  ["odoo.exceptions.UserError", exceptions.DomainUserError],
  ["odoo.exceptions.ValidationError", exceptions.DomainValidationError],
  ["odoo.exceptions.AccessError", exceptions.DomainBackendError],
]) {
  test(`RPC preserves the API exception mapping for ${name}`, async () => {
    const fixture = setup();
    fixture.transport.mock.mockImplementation(async () => ({
      data: {
        error: {
          code: 1,
          message: "API error",
          data: { name, message: "API detail" },
        },
      },
    }));
    await assert.rejects(methods.rpc(fixture.client), (error) => {
      assert.ok(error instanceof type);
      assert.equal(error.message, "API detail");
      return true;
    });
    assert.equal(emitted(fixture, "offline"), 0);
  });
}

test("queryModel does not silently turn authentication network failures into an empty result and can retry", async () => {
  const fixture = setup();
  let attempt = 0;
  const result = { length: 1, records: [{ id: 7 }] };
  fixture.transport.mock.mockImplementation(async () => {
    attempt++;
    if (attempt === 1)
      throw new axios.AxiosError("Network Error", "ERR_NETWORK");
    return { data: { result: attempt === 2 ? 7 : result } };
  });
  await assert.rejects(
    fixture.client.queryModel("res.partner"),
    exceptions.RepeatableFailure,
  );
  assert.deepEqual(await fixture.client.queryModel("res.partner"), result);
  assert.equal(fixture.transport.mock.callCount(), 3);
  assert.equal(emitted(fixture, "offline"), 0);
});
