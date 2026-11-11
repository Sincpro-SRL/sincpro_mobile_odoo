const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const root = path.join(path.dirname(module.filename), "../sincpro_mobile_odoo");

/** Every source file under `dir`, relative to the package. */
function sources(dir) {
  return fs
    .readdirSync(path.join(root, dir), { recursive: true })
    .filter((file) => /\.tsx?$/.test(file))
    .map((file) => path.join(dir, file));
}

const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("services holds only use cases, one per file; what a folder shares is its common.ts", () => {
  for (const file of sources("services")) {
    const name = path.basename(file);
    if (name === "index.ts" || name === "common.ts") continue;
    assert.match(
      name,
      /\.(feature|app_service)\.ts$/,
      `${file} is not a use case`,
    );
    const registrations = read(file).match(
      /@odooBoundedContext\.(feature|appService)\(/g,
    );
    assert.equal(registrations?.length, 1, `${file} holds one use case`);
  }
});

test("nothing uses what @sincpro/mobile 2.2 removed", () => {
  const removed =
    /services\/(printer|bluetooth|network|event|database_table|webview)\.service|framework\/replaceable|\bNetworkAdapter\.getStatus/;
  for (const file of sources(".")) {
    assert.doesNotMatch(read(file), removed, file);
  }
});
