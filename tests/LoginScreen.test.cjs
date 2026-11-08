const assert = require("node:assert/strict");
const { afterEach, mock, test } = require("node:test");
const React = require("react");
const { createRoot } = require("test-renderer");

const { createSourceLoader } = require("./load-source.cjs");

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];

afterEach(async () => {
  await act(async () => {
    for (const renderer of mounted.splice(0)) renderer.unmount();
  });
});

function setup(serverParams = null) {
  const navigation = { navigate: mock.fn(), goBack: mock.fn() };
  const odoo = {
    session: null,
    serverParams,
    authIsLoading: false,
    authError: null,
    login: mock.fn(),
    setServerParams: mock.fn(async (server) => {
      odoo.serverParams = server;
    }),
  };
  const load = createSourceLoader({
    "@react-navigation/native": { useNavigation: () => navigation },
    "@sincpro/mobile-odoo/entrypoints/ui/context": { useOdoo: () => odoo },
    "@sincpro/mobile-odoo/ui/components/organisms": {
      get LoginForm() {
        return load("sincpro_mobile_odoo/ui/components/organisms/LoginForm.tsx")
          .default;
      },
    },
    "@sincpro/mobile-ui/Actions": {
      Actions: { Button: "Button" },
    },
    "@sincpro/mobile-ui/Form": {
      Form: {
        InputField: "InputField",
        PasswordInput: "PasswordInput",
        Button: "Button",
      },
    },
    "@sincpro/mobile-ui/Typography": { Typography: { Text: "Text" } },
    "@sincpro/mobile-ui/Feedback": {
      Feedback: { Banner: "Banner" },
      useToast: () => ({ danger: mock.fn() }),
    },
    "@sincpro/mobile-ui/views/AuthFormView": (props) =>
      React.createElement("AuthFormView", props, props.FormNode),
    "react-native": {
      View: "View",
      TouchableOpacity: "TouchableOpacity",
      Alert: { alert: mock.fn() },
    },
  });
  return {
    odoo,
    navigation,
    LoginScreen: load("sincpro_mobile_odoo/ui/screens/login/login.tsx")
      .LoginScreen,
    ServerScreen: load("sincpro_mobile_odoo/ui/screens/server/server.tsx")
      .default,
    LoginForm: load("sincpro_mobile_odoo/ui/components/organisms/LoginForm.tsx")
      .default,
  };
}

async function mount(Component, props = {}) {
  const renderer = createRoot();
  await act(async () => {
    renderer.render(React.createElement(Component, props));
  });
  mounted.push(renderer);
  return renderer;
}

function nodes(renderer, type) {
  return renderer.container.queryAll((instance) => instance.type === type);
}

function node(renderer, type) {
  const matches = nodes(renderer, type);
  assert.equal(matches.length, 1, `Expected one ${type}`);
  return matches[0];
}

test("without a server, login inputs are disabled and informational; configuration is the primary action", async () => {
  const fixture = setup();
  fixture.odoo.authError = "Old authentication error";
  fixture.odoo.authIsLoading = true;
  const renderer = await mount(fixture.LoginScreen);
  for (const type of ["InputField", "PasswordInput"]) {
    const field = node(renderer, type);
    assert.equal(field.props.disabled, true);
    assert.equal(field.props.inputProps.editable, false);
    assert.deepEqual(field.props.inputProps.accessibilityState, {
      disabled: true,
    });
    assert.equal(field.props.error, undefined);
    await act(async () => field.props.inputProps.onBlur());
    assert.equal(node(renderer, type).props.error, undefined);
  }
  const fieldGroup = nodes(renderer, "View").find(
    (view) => view.props.pointerEvents === "none",
  );
  assert.equal(fieldGroup.props.className, "opacity-50");
  assert.equal(node(renderer, "Banner").props.tone, "info");
  assert.equal(nodes(renderer, "TouchableOpacity").length, 0);
  assert.ok(
    !nodes(renderer, "Text").some(
      (text) => text.props.children === "Old authentication error",
    ),
  );
  const button = node(renderer, "Button");
  assert.equal(button.props.title, "Configurar servidor");
  assert.equal(button.props.loading, false);
  assert.ok(!button.props.disabled);
  await act(async () => button.props.onPress());
  assert.deepEqual(fixture.navigation.navigate.mock.calls[0].arguments, [
    "Server",
  ]);
  assert.equal(fixture.odoo.login.mock.callCount(), 0);
});

test("server configuration saves and returns to login with enabled inputs, preserving layout and routes", async () => {
  const fixture = setup();
  const logoSource = { uri: "test-logo" };
  const background = { surface: "brand" };
  const props = { logoSource, background };
  const loginRenderer = await mount(fixture.LoginScreen, props);
  const layout = node(loginRenderer, "AuthFormView");
  assert.equal(layout.props.logoSource, logoSource);
  assert.equal(layout.props.background, background);
  assert.equal(nodes(loginRenderer, "AuthFormView").length, 1);
  await act(async () => node(loginRenderer, "Button").props.onPress());
  assert.deepEqual(fixture.navigation.navigate.mock.calls[0].arguments, [
    "Server",
  ]);

  const serverRenderer = await mount(fixture.ServerScreen, props);
  const serverFields = nodes(serverRenderer, "InputField");
  await act(async () => {
    serverFields[0].props.inputProps.onChangeText("https://server.invalid");
    serverFields[1].props.inputProps.onChangeText("test");
  });
  await act(async () => node(serverRenderer, "Button").props.onPress());
  assert.deepEqual(fixture.odoo.setServerParams.mock.calls[0].arguments, [
    { server: "https://server.invalid", database: "test" },
  ]);
  assert.equal(fixture.navigation.goBack.mock.callCount(), 1);

  await act(async () =>
    loginRenderer.render(React.createElement(fixture.LoginScreen, props)),
  );
  assert.equal(nodes(loginRenderer, "Banner").length, 0);
  for (const type of ["InputField", "PasswordInput"]) {
    const field = node(loginRenderer, type);
    assert.equal(field.props.disabled, false);
    assert.equal(field.props.inputProps.editable, true);
    assert.equal(field.props.error, undefined);
  }
  assert.equal(node(loginRenderer, "Button").props.title, "Ingresar");
  const links = nodes(loginRenderer, "TouchableOpacity");
  await act(async () => {
    links[0].props.onPress();
    links[1].props.onPress();
  });
  assert.deepEqual(
    fixture.navigation.navigate.mock.calls
      .slice(1)
      .map((call) => call.arguments),
    [["ResetAccount"], ["Server"]],
  );
});

test("required errors appear only after touching each field and revalidate on change", async () => {
  const fixture = setup({ server: "https://server.invalid", database: "test" });
  const renderer = await mount(fixture.LoginScreen);
  const email = () => node(renderer, "InputField");
  const password = () => node(renderer, "PasswordInput");
  assert.equal(email().props.error, undefined);
  assert.equal(password().props.error, undefined);
  await act(async () => email().props.inputProps.onChangeText(""));
  assert.equal(email().props.error, undefined);
  await act(async () => email().props.inputProps.onBlur());
  assert.equal(email().props.error, "El correo es requerido");
  assert.equal(password().props.error, undefined);
  await act(async () => email().props.inputProps.onChangeText("test-user"));
  assert.equal(email().props.error, undefined);
  await act(async () => password().props.inputProps.onBlur());
  assert.equal(password().props.error, "La contraseña es requerida");
  await act(async () =>
    password().props.inputProps.onChangeText("test-password"),
  );
  assert.equal(password().props.error, undefined);
  await act(async () => node(renderer, "Button").props.onPress());
  assert.deepEqual(fixture.odoo.login.mock.calls[0].arguments, [
    "test-user",
    "test-password",
  ]);
});

test("submitting an untouched configured form validates both fields without logging in", async () => {
  const fixture = setup({ server: "https://server.invalid", database: "test" });
  const renderer = await mount(fixture.LoginScreen);
  await act(async () => node(renderer, "Button").props.onPress());
  assert.equal(
    node(renderer, "InputField").props.error,
    "El correo es requerido",
  );
  assert.equal(
    node(renderer, "PasswordInput").props.error,
    "La contraseña es requerida",
  );
  assert.equal(fixture.odoo.login.mock.callCount(), 0);
});

test("configured login preserves authentication errors and loading feedback", async () => {
  const fixture = setup({ server: "https://server.invalid", database: "test" });
  fixture.odoo.authError = "Invalid credentials";
  fixture.odoo.authIsLoading = true;
  const renderer = await mount(fixture.LoginScreen);
  assert.equal(node(renderer, "Button").props.loading, true);
  assert.ok(
    nodes(renderer, "Text").some(
      (text) => text.props.children === "Invalid credentials",
    ),
  );
});

test("the legacy readonly prop remains compatible and uses the disabled configuration state", async () => {
  const fixture = setup();
  const configureServer = mock.fn();
  const renderer = await mount(fixture.LoginForm, {
    readonly: true,
    isLoading: false,
    onLogin: mock.fn(),
    onResetAccount: mock.fn(),
    configureServer,
  });
  assert.equal(node(renderer, "InputField").props.disabled, true);
  assert.equal(node(renderer, "PasswordInput").props.disabled, true);
  await act(async () => node(renderer, "Button").props.onPress());
  assert.equal(configureServer.mock.callCount(), 1);
});
