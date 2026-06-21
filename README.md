# @sincpro/mobile-odoo

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
make init      # entorno + dependencias
make check     # lint + typecheck
make build     # compila a ./lib (tsc + tsc-alias)
make format    # ordena imports + formatea
```

Imports internos absolutos (`@sincpro/mobile-odoo/...`), resueltos a relativo en el build.
