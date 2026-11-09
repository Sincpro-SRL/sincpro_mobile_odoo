const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const { createSourceLoader } = require("./load-source.cjs");

const screen = fs.readFileSync(
  path.join(
    path.dirname(module.filename),
    "../sincpro_mobile_odoo/ui/screens/odoo_portal/odoo_portal.screen.tsx",
  ),
  "utf8",
);

test("the portal keeps the WebView cache instead of downloading Odoo on every visit", () => {
  assert.doesNotMatch(screen, /useDefaultCache/);
  assert.doesNotMatch(screen, /hardRefreshKey/);
  assert.match(screen, /ref=\{webViewRef\}/);
  assert.match(screen, /label="Odoo"/);
});

test("the library listens to its own reload event, not one named after a host", () => {
  assert.doesNotMatch(screen, /tickets:/);
  assert.match(
    screen,
    /UIEventBus\.on<OdooPortalReloadRequest>\(\s*ODOO_PORTAL_RELOAD_EVENT,/,
  );
  assert.match(screen, /webViewRef\.current\?\.clearCacheAndReload\(\);/);
  assert.match(screen, /webViewRef\.current\?\.reload\(\);/);
});

test("the portal leaves the failure toast to the WebView", () => {
  assert.doesNotMatch(screen, /useToast/);
  assert.doesNotMatch(screen, /Reintentando automáticamente/);
});

test("reloadOdooPortal asks the mounted portal to reload, with or without cache", () => {
  const emitted = [];
  const load = createSourceLoader({
    "@sincpro/mobile/infrastructure/ui/UIEventBus": {
      UIEventBus: { emit: (event, payload) => emitted.push([event, payload]) },
    },
  });
  const { reloadOdooPortal, ODOO_PORTAL_RELOAD_EVENT } = load(
    "sincpro_mobile_odoo/ui/screens/odoo_portal/odoo_portal.reload.ts",
  );

  reloadOdooPortal();
  reloadOdooPortal({ clearCache: true });

  assert.deepEqual(emitted, [
    [ODOO_PORTAL_RELOAD_EVENT, { clearCache: false }],
    [ODOO_PORTAL_RELOAD_EVENT, { clearCache: true }],
  ]);
  assert.equal(ODOO_PORTAL_RELOAD_EVENT, "odoo.portal.reload");
});
