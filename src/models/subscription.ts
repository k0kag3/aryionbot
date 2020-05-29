import mongoose from 'mongoose';
import {AryionUser} from './aryionUser';

export interface Subscription extends mongoose.Document {
  aryionUser: AryionUser;
  channelId: string;
  guildId: string;
}

const schema = new mongoose.Schema({
  aryionUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AryionUser',
  },
  channelId: String,
  guildId: String,
});

const SubscriptionModel = mongoose.model<Subscription>('Subscription', schema);

export default SubscriptionModel;
