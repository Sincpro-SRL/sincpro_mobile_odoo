const assert = require("node:assert/strict");
const { mock, test } = require("node:test");
const axios = require("axios");

const framework = require("@sincpro/client-framework");

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
    "@sincpro/client-framework": { ...framework, loggerAdapter: logger },
    "@sincpro/mobile/adapters/Network.adapter": {
      NetworkAdapter: { getStatus },
    },
    "@sincpro/mobile/domain/events": {
      InternetIsDownEvent: { eventName: "offline" },
      InternetIsUpEvent: { eventName: "online" },
    },
    "@sincpro/mobile/exceptions": exceptions,
    "@sincpro/mobile/infrastructure/logger": {
      errorAttributes: (error) => ({ error: String(error) }),
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
  return { client, transport, getStatus, emit, warn, logger };
}

function emitted(fixture, name) {
  return fixture.emit.mock.calls.filter((call) => call.arguments[0] === name)
    .length;
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
      const timedOut = fixture.warn.mock.calls.filter((call) =>
        /timed out/.test(call.arguments[0]),
      );
      assert.equal(timedOut.length > 0, code !== "ERR_NETWORK");
      if (code !== "ERR_NETWORK") {
        assert.equal(
          timedOut[0].arguments[1].timeout_ms,
          method === "rpc" ? 35000 : 1234,
        );
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
        assert.match(error.message, /503/);
        assert.equal(framework.failureOf(error).kind, "unavailable");
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
      assert.equal(error, original);
      return true;
    });
    assert.equal(emitted(fixture, "offline"), 0);
    assert.ok(fixture.warn.mock.callCount() > 0);
  });

  for (const code of ["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"]) {
    test(`${method}: ${code} is unavailable — the stored queue retries it — and never forces offline`, async () => {
      for (const status of [
        online,
        { isConnected: true, isInternetReachable: null, type: "WIFI" },
        { isConnected: false, isInternetReachable: null, type: "UNKNOWN" },
        new Error("Native network check failed"),
      ]) {
        const fixture = setup([status]);
        fixture.transport.mock.mockImplementation(async () => {
          throw new axios.AxiosError("Transport failed", code);
        });
        await assert.rejects(request(fixture.client), (error) => {
          const failure = framework.failureOf(error);
          assert.equal(failure.kind, "unavailable");
          assert.equal(failure.retryable, true);
          assert.notEqual(failure.reason, "NETWORK_DOWN");
          return true;
        });
        assert.equal(emitted(fixture, "offline"), 0);
        assert.equal(fixture.transport.mock.callCount(), 1);
      }
    });
  }

  test(`${method}: a confirmed offline phone fails NETWORK_DOWN, retried, and the screens hear it`, async () => {
    const fixture = setup([offline]);
    await assert.rejects(request(fixture.client), (error) => {
      const failure = framework.failureOf(error);
      assert.equal(failure.kind, "unavailable");
      assert.equal(failure.reason, "NETWORK_DOWN");
      return true;
    });
    assert.ok(emitted(fixture, "offline") > 0);
    assert.equal(fixture.transport.mock.callCount(), 0);
  });
}

for (const [name, code, type, kind] of [
  ["odoo.exceptions.UserError", 200, exceptions.DomainUserError, "domain"],
  [
    "odoo.exceptions.ValidationError",
    200,
    exceptions.DomainValidationError,
    "invalid",
  ],
  [
    "odoo.exceptions.AccessDenied",
    200,
    exceptions.DomainBackendError,
    "unauthenticated",
  ],
  [
    "odoo.exceptions.AccessError",
    200,
    exceptions.DomainBackendError,
    "permission_denied",
  ],
  [
    "odoo.exceptions.MissingError",
    200,
    exceptions.DomainBackendError,
    "not_found",
  ],
  ["builtins.KeyError", 200, exceptions.DomainBackendError, "internal"],
  [undefined, -32601, exceptions.DomainBackendError, "not_found"],
]) {
  test(`RPC: ${name ?? `code ${code}`} fails ${kind}`, async () => {
    const fixture = setup();
    fixture.transport.mock.mockImplementation(async () => ({
      data: {
        error: {
          code,
          message: "API error",
          data: { name, message: "API detail" },
        },
      },
    }));
    await assert.rejects(methods.rpc(fixture.client), (error) => {
      assert.ok(error instanceof type);
      assert.equal(error.message, "API detail");
      assert.equal(framework.failureOf(error).kind, kind);
      return true;
    });
    assert.equal(emitted(fixture, "offline"), 0);
  });
}

test("the circuit opens after five calls Odoo did not answer, and an answered error never opens it", async () => {
  const fixture = setup();
  fixture.transport.mock.mockImplementation(async () => {
    throw new axios.AxiosError("Transport failed", "ERR_NETWORK");
  });
  for (let call = 0; call < 5; call++) {
    await assert.rejects(
      methods.rpc(fixture.client),
      exceptions.RepeatableFailure,
    );
  }
  await assert.rejects(methods.rpc(fixture.client), (error) => {
    const failure = framework.failureOf(error);
    assert.equal(failure.kind, "unavailable");
    assert.ok(failure.retryAfter > 0, "it says how long to wait");
    return true;
  });
  assert.equal(
    fixture.transport.mock.callCount(),
    5,
    "an open circuit calls nobody",
  );

  const answered = setup();
  answered.transport.mock.mockImplementation(async () => ({
    data: {
      error: { code: 200, message: "x", data: { name: "builtins.KeyError" } },
    },
  }));
  for (let call = 0; call < 7; call++) {
    await assert.rejects(
      methods.rpc(answered.client),
      exceptions.DomainBackendError,
    );
  }
  assert.equal(answered.transport.mock.callCount(), 7);
});

test("no line the client writes carries the password, nor the request's arguments", async () => {
  const fixture = setup();
  fixture.client.setUser("ana@example.com", "s3cret-pass");
  fixture.transport.mock.mockImplementation(async (_url, payload) =>
    payload?.params?.method === "login"
      ? { data: { result: 7 } }
      : {
          data: {
            error: {
              code: 200,
              message: "x",
              data: { name: "builtins.KeyError" },
            },
          },
        },
  );
  await assert.rejects(fixture.client.callModel("res.partner", "read", [[1]]));
  const lines = ["debug", "info", "warn"].flatMap((level) =>
    fixture.logger[level].mock.calls.map((call) =>
      JSON.stringify(call.arguments),
    ),
  );
  assert.ok(lines.length > 0);
  for (const line of lines) {
    assert.doesNotMatch(line, /s3cret-pass/);
    assert.doesNotMatch(line, /ana@example\.com/);
  }
});

test("queryModel never turns an Odoo error into an empty result", async () => {
  const fixture = setup();
  fixture.transport.mock.mockImplementation(async (_url, payload) =>
    payload?.params?.method === "login"
      ? { data: { result: 7 } }
      : {
          data: {
            error: {
              code: 200,
              message: "x",
              data: { name: "builtins.KeyError" },
            },
          },
        },
  );
  await assert.rejects(fixture.client.queryModel("res.partner"), (error) => {
    assert.equal(framework.failureOf(error).kind, "internal");
    return true;
  });
});

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
