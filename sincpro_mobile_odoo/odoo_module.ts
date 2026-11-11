import type { HearingContext } from "@sincpro/client-framework";
import type { IMigration } from "@sincpro/mobile/domain/database";
import { DomainModule } from "@sincpro/mobile/framework/domain_module";
import type { CronWorker } from "@sincpro/mobile/infrastructure/workers";
import OdooCrons from "@sincpro/mobile-odoo/entrypoints/cron";
import OdooMigrations, {
  DATABASE_TABLES,
} from "@sincpro/mobile-odoo/entrypoints/db/migrations";
import OdooRepositoryRegistry from "@sincpro/mobile-odoo/entrypoints/db/repositories";
import { odooBoundedContext } from "@sincpro/mobile-odoo/services";

export class OdooModule extends DomainModule {
  readonly key = "ODOO";
  readonly name = "Odoo";
  override readonly shared = true;

  override repositories(): Record<string, object> {
    return OdooRepositoryRegistry;
  }

  override migrations(): IMigration[] {
    return OdooMigrations;
  }

  /** Its use cases — `ForgetOdooUser` is registered for `OdooLoggedOutEvent`: it hears it. */
  override boundedContexts(): readonly HearingContext[] {
    return [odooBoundedContext];
  }

  override crons(): CronWorker[] {
    return OdooCrons;
  }

  override persistOnReset(): string[] {
    return [DATABASE_TABLES.SERVERS];
  }
}

export const odooModule = new OdooModule();
