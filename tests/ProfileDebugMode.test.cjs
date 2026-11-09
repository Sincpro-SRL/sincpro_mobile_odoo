const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const profile = fs.readFileSync(
  path.join(
    path.dirname(module.filename),
    "../sincpro_mobile_odoo/ui/screens/profile/profile.tsx",
  ),
  "utf8",
);

test("the debug switch only shows once debug mode is on", () => {
  // Debug mode opens the event history, where a print can be sent again: it stays hidden.
  const row = profile.indexOf('label="Modo Debug"');
  const guard = profile.lastIndexOf("{debugMode && (", row);
  assert.ok(
    guard > 0 && row - guard < 200,
    "the Modo Debug row must sit inside {debugMode && (...)}",
  );
});

test("the six taps only turn debug mode on", () => {
  assert.match(
    profile,
    /onActivate=\{\(\) => \{\s*if \(!debugMode\) void toggleDebugMode\(\);/,
  );
});
