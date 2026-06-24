# @sincpro/mobile-odoo

> 🤖 **Agentes de IA:** leé [`AGENTS.md`](AGENTS.md) (orientación del ecosistema, patrones) y [`docs/GOTCHAS.md`](docs/GOTCHAS.md) (trampas conocidas).

Integración **Odoo opcional** para el framework [Sincpro Mobile](https://github.com/Sincpro-SRL/sincpro_mobile). Trae el `OdooClient`, autenticación, servidor y `res.partner` reusables como un módulo de dominio listo para registrar.

## Instalación

```bash
npx expo install @sincpro/mobile @sincpro/mobile-ui @sincpro/mobile-odoo
```

Depende de `@sincpro/mobile` (core) y `@sincpro/mobile-ui` (design system).

## Uso

Registra el `odooModule` al instanciar la app:

```ts
import { createAppShell, createTheme } from "@sincpro/mobile";
import { odooModule, OdooProvider } from "@sincpro/mobile-odoo";

export default createAppShell({
  theme: createTheme({ primary: "#714B67" }),
  domains: [odooModule /* ...tus dominios */],
  ui: {
    /* ... */
  },
  activeDomain: "...",
  providers: [OdooProvider],
});
```

## API

- `odooModule` / `OdooModule` — módulo de dominio (key `ODOO`, shared).
- `getOdooClient()` — cliente HTTP Odoo (JSON-RPC).
- `odooAuthService` — login / sesión.
- `OdooProvider` / `useOdoo()` — contexto de Odoo para la UI.
- `EOdooRepository` — enum de repositorios.

## Desarrollo

Todo es vía Makefile:

```bash
make init           # entorno + dependencias
make format         # auto-fix: eslint --fix + prettier + typecheck
make verify-format  # gate de CI: format + falla si quedó algo (cubre lint + formato + tipos)
make build          # compila a ./dist (tsc + tsc-alias)
```

Imports internos absolutos (`@sincpro/mobile-odoo/...`), resueltos a relativo en el build.
