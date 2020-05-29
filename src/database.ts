import formatISO from 'date-fns/formatISO';
import subDays from 'date-fns/subDays';

import {getUser} from './aryion';
import SubscriptionModel from './models/subscription';
import AryionUserModel from './models/aryionUser';
import {DuplicatedSubscriptionError, AryionUserNotFoundError} from './errors';
import {log} from './util';

export async function getSubscriptions(options: any = {}) {
  return await SubscriptionModel.find(options);
}

export async function getAryionUsers(options: any = {}) {
  return await AryionUserModel.find(options);
}

export async function subscribe(
  aryionUsername: string,
  channelID: string,
  guildID: string,
) {
  const {username} = await getUser(aryionUsername);

  let aryionUser =
    (await AryionUserModel.findOne({username})) ||
    (await AryionUserModel.create({username}));

  if (await SubscriptionModel.exists({aryionUser, channelID})) {
    throw new DuplicatedSubscriptionError(
      `${username} has already been subscribed`,
    );
  }

  // rewind 3 days back
  const lastUpdate = formatISO(subDays(new Date(), 3));
  const sub = new SubscriptionModel({
    aryionUser,
    channelID,
    guildID,
    lastUpdate,
  });
  log(sub);
  return await sub.save();
}

export async function unsubscribe(aryionUsername: string, channelID: string) {
  const aryionUser = await AryionUserModel.findOne({username: aryionUsername});
  if (!aryionUser) throw new AryionUserNotFoundError();

  const sub = await SubscriptionModel.findOne({
    aryionUser,
    channelID,
  });
  if (sub) {
    await sub.remove();
  }
}

export async function removeSubscriptionForChannel(channelId: string) {
  return await SubscriptionModel.deleteMany({channelId});
}

export async function removeSubscriptionForGuild(guildId: string) {
  return await SubscriptionModel.deleteMany({guildId});
}
