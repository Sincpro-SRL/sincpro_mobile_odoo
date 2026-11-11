import { Command } from "@sincpro/client-framework";
import {
  Feature,
  odooBoundedContext,
} from "@sincpro/mobile-odoo/infrastructure/framework";

export class CommandDeleteServer extends Command<void> {}

/** Forgets the Odoo server kept. */
@odooBoundedContext.feature(CommandDeleteServer)
export class DeleteServer extends Feature<CommandDeleteServer, void> {
  async execute(): Promise<void> {
    await this.servers.delete();
    this.logger.info("Odoo server deleted");
  }
}
