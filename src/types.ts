import { Tracer } from "tracer";
import { LevelCache } from "./modules/cache";

export interface RSSKoaContext {
  cache: LevelCache;
}

export type LoggerInterface = Tracer.Logger<string>;
