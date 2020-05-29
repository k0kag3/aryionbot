import assert from 'assert';
import mongoose from 'mongoose';
import WatchModel from '../models/watch';
import AryionUserModel from '../models/aryionUser';
import SubscriptionModel from '../models/subscription';
import {getUser} from '../aryion';

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

    const {username} = await getUser(watch.aryionUsername);
    const aryionUser =
      (await AryionUserModel.findOne({
        username,
      })) ||
      (await AryionUserModel.create({username, lastUpdate: watch.lastUpdate}));
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
