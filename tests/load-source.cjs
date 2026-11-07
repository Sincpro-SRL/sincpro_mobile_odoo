const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

function createSourceLoader(mocks = {}) {
  const root = path.resolve(path.dirname(module.filename), "..");
  const cache = new Map();

  function load(file) {
    const base = path.resolve(root, file);
    const filename = [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      path.join(base, "index.ts"),
    ].find(
      (candidate) =>
        fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
    );
    if (!filename) throw new Error(`Source not found: ${file}`);
    if (cache.has(filename)) return cache.get(filename).exports;

    const compiled = new Module(filename, module);
    compiled.filename = filename;
    compiled.paths = Module._nodeModulePaths(path.dirname(filename));
    compiled.require = (specifier) => {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      if (specifier.startsWith("@sincpro/mobile-odoo/")) {
        return load(
          specifier.replace("@sincpro/mobile-odoo/", "sincpro_mobile_odoo/"),
        );
      }
      if (specifier.startsWith(".")) {
        return load(path.resolve(path.dirname(filename), specifier));
      }
      return require(specifier);
    };
    cache.set(filename, compiled);
    const { outputText } = ts.transpileModule(
      fs.readFileSync(filename, "utf8"),
      {
        fileName: filename,
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
          experimentalDecorators: true,
        },
      },
    );
    compiled._compile(outputText, filename);
    return compiled.exports;
  }

  return load;
}

module.exports = { createSourceLoader };
