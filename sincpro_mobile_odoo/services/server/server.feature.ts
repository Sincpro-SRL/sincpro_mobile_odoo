import { Command } from "@sincpro/client-framework";
import type { IServer } from "@sincpro/mobile-odoo/domain/server";
import {
  Feature,
  odooBoundedContext,
} from "@sincpro/mobile-odoo/infrastructure/framework";

export class CommandSaveServer extends Command<void> {
  constructor(readonly server: IServer) {
    super();
  }
}

export class CommandServerParams extends Command<IServer | null> {}

export class CommandDeleteServer extends Command<void> {}

/** Keeps the Odoo server the app talks to — replacing the one kept — and points the client at it. */
@odooBoundedContext.feature(CommandSaveServer)
export class SaveServer extends Feature<CommandSaveServer, void> {
  async execute(command: CommandSaveServer): Promise<void> {
    await this.servers.update(command.server);
    this.odoo.setServer(command.server);
    this.logger.info("Odoo server saved");
  }
}

/** The Odoo server kept, or `null` when none is. */
@odooBoundedContext.feature(CommandServerParams)
export class ServerParams extends Feature<CommandServerParams, IServer | null> {
  execute(): Promise<IServer | null> {
    return this.servers.find();
  }
}

/** Forgets the Odoo server kept. */
@odooBoundedContext.feature(CommandDeleteServer)
export class DeleteServer extends Feature<CommandDeleteServer, void> {
  async execute(): Promise<void> {
    await this.servers.delete();
    this.logger.info("Odoo server deleted");
  }
}
