import debug from 'debug';
import {Subscription} from './models/subscription';

export const log = debug('aryionbot');

export function canonicalName(sub: Subscription) {
  return `${sub.guildId}:${sub.channelId}/${sub.aryionUser.username}`;
}
