import type { Subscriber } from "@sincpro/mobile/domain/event_sourcing";

import { LoggedOutSubscriber } from "./loggedOut.subscriber";

export const OdooSubscribers: Subscriber[] = [new LoggedOutSubscriber()];
