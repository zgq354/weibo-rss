import Queue from "np-queue";
import { LoggerInterface } from "../types";
import { logger } from "./logger";

export class ThrottledError extends Error {
  constructor() {
    super();
  }
}

/**
 * Limit the request frequency
 */
export class Throttler {
  name: string = '';
  queue: Queue;
  enable: boolean;
  lastUpdateTime: number;
  retryDelayMs: number;
  logger: LoggerInterface;

  constructor(name = '', log: LoggerInterface = logger) {
    this.name = name;
    this.logger = log;
    this.queue = new Queue({ concurrency: 1 });
    this.retryDelayMs = 600000;
    this.enable = true;
    this.lastUpdateTime = Date.now();
  }

  checkFuncAvailable = () => {
    if (!this.enable && Date.now() - this.lastUpdateTime > this.retryDelayMs) {
      this.enable = true;
      this.logger.info(`[Throttled] reenabled ${this.name}`);
    }
    return this.enable;
  };

  disableFunc = () => {
    this.enable = false;
    this.lastUpdateTime = Date.now();
    this.logger.info(`[Throttled] disabled ${this.name}`);
    return Promise.reject(new ThrottledError());
  };

  runFunc = <T = any>(callback: (disable: () => Promise<void>) => any): Promise<T> => {
    if (!this.checkFuncAvailable()) {
      return Promise.reject(new ThrottledError());
    }
    return this.queue.add(async () => callback(this.disableFunc));
  };
}
