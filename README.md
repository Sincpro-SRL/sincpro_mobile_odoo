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
import { createTheme, defineAppShell } from "@sincpro/mobile";
import { odooModule, OdooProvider } from "@sincpro/mobile-odoo";

export const shell = defineAppShell({
  theme: createTheme({ primary: "#714B67" }),
  domains: [odooModule /* ...tus dominios */],
  providers: [OdooProvider],
});
```

Pide `@sincpro/mobile` 2.2 o superior: cada operación del core es un Command de
`commonBoundedContext` y el portal entrega los mensajes de la página a sus handlers
(`dispatchWebViewMessage`), así que el ciclo de impresión corre como Commands, con su span.

## API

- `odooModule` / `OdooModule` — módulo de dominio (key `ODOO`, shared): su `boundedContexts()`
  es `[odooBoundedContext]`.
- `odooBoundedContext` — sus casos de uso, armado como el backend
  (`infrastructure/dependencies.ts` + `infrastructure/framework.ts`):
  - sesión: `CommandLogin`, `CommandLogout`, `CommandRestoreSession`
    (`await odooBoundedContext.execute(new CommandLogin(user, password))`);
  - servidor: `CommandSaveServer`, `CommandServerParams`, `CommandDeleteServer`;
  - un archivo por caso de uso en `services/<agregado>/`; lo que comparten los de una carpeta
    va en su `common.ts` (`services/session/common.ts`);
  - `CommandForgetOdooUser`: el cliente olvida al usuario. Lo ejecuta el event handler
    `OnOdooLoggedOut` (`entrypoints/queue/`) cuando llega `OdooLoggedOutEvent`.
- `OdooLoggedInEvent` (`odoo.auth.v3.logged_in`, sin contraseña) y `OdooLoggedOutEvent`
  (`odoo.auth.v2.logged_out`, no espera sesión): una app los escucha registrando un caso de uso
  para el evento (`@ticketsBoundedContext.feature([CommandX, OdooLoggedInEvent])`) o un event
  handler (`@ticketsBoundedContext.handler([OdooLoggedInEvent])`).
- `getOdooClient()` — cliente Odoo (JSON-RPC y HTTP). Cada error declara su tipo de falla:
  `UserError` → `domain`, `ValidationError` → `invalid`, `AccessDenied` → `unauthenticated`,
  `AccessError` → `permission_denied`, `MissingError` → `not_found`, otro código JSON-RPC →
  `kindOfJsonRpcCode`, HTTP → `kindOfHttpStatus`, sin red → `unavailable` (`NETWORK_DOWN`),
  timeout o servidor inalcanzable → `unavailable`. Un `CircuitBreaker("odoo")` (`odooCircuit`)
  deja de llamar 30 s después de cinco llamadas seguidas sin respuesta.
- `OdooProvider` / `useOdoo()` — contexto de Odoo para la UI.
- `EOdooRepository` — enum de repositorios.

### Credenciales

La contraseña no viaja en ningún evento ni en ninguna línea de log. Sí queda guardada en el
teléfono — en `odoo_auth` (SQLite) y en memoria del cliente — porque el cliente vuelve a
iniciar sesión cuando la de Odoo vence (cada 50 s sin uso). Es un riesgo conocido: el stack no
usa `expo-secure-store`, y agregarlo obliga a recompilar las apps; se decide aparte.

## Desarrollo

Todo es vía Makefile:

```bash
make init           # entorno + dependencias
make format         # auto-fix: eslint --fix + prettier + typecheck
make verify-format  # gate de CI: format + falla si quedó algo (cubre lint + formato + tipos)
make build          # compila a ./dist (tsc + tsc-alias)
```

Imports internos absolutos (`@sincpro/mobile-odoo/...`), resueltos a relativo en el build.
