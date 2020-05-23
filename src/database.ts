import formatISO from 'date-fns/formatISO';
import subDays from 'date-fns/subDays';

import {userExists} from './aryion';
import WatchModel from './models/watch';
import {DuplicatedWatchError, AryionUserNotFoundError} from './errors';
import {log} from './util';

export async function getWatches(options: any = {}) {
  return await WatchModel.find(options);
}

export async function removeWatches(options: any) {
  return await WatchModel.deleteMany(options);
}

export async function watchUser(
  aryionUsername: string,
  channelID: string,
  guildID: string,
  authorID: string,
) {
  if (await WatchModel.exists({aryionUsername, channelID})) {
    throw new DuplicatedWatchError(
      `${aryionUsername} has already been watched`,
    );
  }
  if (!(await userExists(aryionUsername))) {
    throw new AryionUserNotFoundError(
      `${aryionUsername} cannot be found on Eka's Portal`,
    );
  }
  const watch = new WatchModel({
    aryionUsername,
    channelID,
    guildID,
    createdBy: authorID,
    lastUpdate: formatISO(subDays(new Date(), 3)),
  });
  log(watch);
  return await watch.save();
}

export async function unwatchUser(aryionUsername: string, channelID: string) {
  const watch = await WatchModel.findOne({aryionUsername, channelID});
  if (watch) {
    await watch.remove();
  }
}
