import debug from 'debug';
import {Watch} from './models/watch';

export const log = debug('aryionbot');

export function canonicalName(watch: Watch) {
  return `${watch.guildID}:${watch.channelID}/${watch.aryionUsername}`;
}
