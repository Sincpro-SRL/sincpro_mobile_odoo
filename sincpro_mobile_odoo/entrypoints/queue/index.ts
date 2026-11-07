import type { Subscriber } from "@sincpro/mobile/event_driven";

import { LoggedOutSubscriber } from "./loggedOut.subscriber";

export const OdooSubscribers: Subscriber[] = [new LoggedOutSubscriber()];
