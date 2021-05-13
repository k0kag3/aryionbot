import debug from "debug";
import { Subscription } from "./models/subscription";

export const log = debug("aryionbot");

export function debugNameForSub(sub: Subscription) {
  return `${sub.guildId}:${sub.channelId}/${sub.aryionUser.username}`;
}

export function canonicalId(username: string): string {
  return username.toLowerCase();
}
