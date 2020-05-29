import mongoose from 'mongoose';
import {AryionUser} from './aryionUser';

export interface Subscription extends mongoose.Document {
  channelId: string;
  guildId: string;
  aryionUser: AryionUser;
}

const schema = new mongoose.Schema({
  channelId: {type: String, required: true},
  guildId: {type: String, required: true},
  aryionUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AryionUser',
    required: true,
  },
});

const SubscriptionModel = mongoose.model<Subscription>('Subscription', schema);

export default SubscriptionModel;
