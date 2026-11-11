import { BoundedContext, servicesWith } from "@sincpro/client-framework";
import {
  type OdooDependencies,
  registerDependencies,
} from "@sincpro/mobile-odoo/infrastructure/dependencies";

/**
 * Odoo's bounded context and the bases of its use cases — the backend's `framework.py`: a
 * `Feature` or `ApplicationService` extending these finds every dependency on `this`, and
 * registers itself with `@odooBoundedContext.feature(...)`.
 *
 * Context: the instance lives here, not in `services/index.ts`, because a service imports it to
 * register itself and ES modules run their imports first.
 */
export const { Feature, ApplicationService } = servicesWith<OdooDependencies>();

export const odooBoundedContext = registerDependencies(
  new BoundedContext<OdooDependencies>("odoo"),
);
