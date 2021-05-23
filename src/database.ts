import { AryionUserNotFoundError, verifyUser } from "aryjs";
import formatISO from "date-fns/formatISO";
import subDays from "date-fns/subDays";
import { DuplicatedSubscriptionError } from "./errors";
import AryionUserModel, { AryionUser } from "./models/aryionUser";
import SubscriptionModel from "./models/subscription";
import { canonicalId, log } from "./util";

export async function cleanUpOrphanedUsers() {
  const allUsers = await AryionUserModel.find();
  await Promise.all(
    allUsers.map(async (user) => {
      if (await SubscriptionModel.findOne({ aryionUser: user })) return;
      console.log("Remove orphaned user", user.username);
      return user.remove();
    })
  );
}

export async function getSubscriptionsForUser(aryionUser: AryionUser) {
  return await SubscriptionModel.find({ aryionUser }).populate("aryionUser");
}

export async function getSubscriptionsForChannel(channelId: string) {
  return await SubscriptionModel.find({ channelId }).populate("aryionUser");
}

export async function getAllAryionUsers() {
  return await AryionUserModel.find();
}

export async function findAryionUser(aryionUsername: string) {
  const id = canonicalId(aryionUsername);
  return await AryionUserModel.findOne({ id });
}

export async function findOrCreateAryionUser(aryionUsername: string) {
  const id = canonicalId(aryionUsername);

  const aryionUser = await findAryionUser(id);
  if (aryionUser) return aryionUser;

  const { username, avatarUrl } = await verifyUser(aryionUsername);
  const newAryionUser = await AryionUserModel.create({
    id,
    username,
    avatarUrl,
    lastUpdate: formatISO(subDays(new Date(), 3)),
  });

  return newAryionUser;
}

export async function subscribe(
  aryionUsername: string,
  channelId: string,
  guildId: string
) {
  const aryionUser = await findOrCreateAryionUser(aryionUsername);
  if (await SubscriptionModel.exists({ aryionUser, channelId })) {
    throw new DuplicatedSubscriptionError(aryionUsername);
  }

  const sub = new SubscriptionModel({
    aryionUser,
    channelId,
    guildId,
  });
  log(sub);
  return await sub.save();
}

export async function unsubscribe(aryionUsername: string, channelId: string) {
  const aryionUser = await findAryionUser(aryionUsername);
  if (!aryionUser) throw new AryionUserNotFoundError(aryionUsername);

  const sub = await SubscriptionModel.findOne({
    aryionUser,
    channelId,
  });
  if (!sub) throw new Error("There is not subscription found");

  await sub.remove();

  if (!(await SubscriptionModel.findOne({ aryionUser }))) {
    console.log("Also remove", aryionUser.username);
    await aryionUser.remove();
  }
}

export async function removeSubscriptionForChannel(channelId: string) {
  const invalidSubs = await SubscriptionModel.deleteMany({ channelId });
  await cleanUpOrphanedUsers();
  return invalidSubs;
}

export async function removeSubscriptionForGuild(guildId: string) {
  const invalidSubs = await SubscriptionModel.deleteMany({ guildId });
  await cleanUpOrphanedUsers();
  return invalidSubs;
}
