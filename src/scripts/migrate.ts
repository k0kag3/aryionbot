import assert from 'assert';
import mongoose from 'mongoose';
import WatchModel from '../models/watch';
import AryionUserModel, {AryionUser} from '../models/aryionUser';
import SubscriptionModel from '../models/subscription';
import {verifyUser} from '../aryion';
import {canonicalId} from '../util';

console.log('v1');

const MONGODB_URL = process.env.MONGODB_URL;
assert(MONGODB_URL, 'MONGODB_URL is missing');
console.log(MONGODB_URL);

async function main() {
  console.log('Migration started');
  const watches = await WatchModel.find();
  console.log(watches.length);
  for (const watch of watches) {
    console.log('watch', watch);

    const {username, avatarUrl} = await verifyUser(watch.aryionUsername);
    const id = canonicalId(watch.aryionUsername);
    const aryionUser =
      (await AryionUserModel.findOne({
        id,
      })) ||
      (await AryionUserModel.create({
        id,
        username,
        avatarUrl,
        lastUpdate: watch.lastUpdate,
      } as AryionUser));
    console.log('aryionUser', aryionUser);

    const sub = await SubscriptionModel.create({
      aryionUser,
      channelId: watch.channelID,
      guildId: watch.guildID,
    });

    console.log('sub', sub);
  }
}

mongoose.connect(MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

main().catch((err) => console.log(err));
