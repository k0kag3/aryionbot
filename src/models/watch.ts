import mongoose from 'mongoose';

export interface Watch extends mongoose.Document {
  aryionUsername: string;
  channelID: string;
  guildID: string;
  createdBy: string;
  lastUpdate?: string;
}

const schema = new mongoose.Schema({
  aryionUsername: String,
  channelID: String,
  guildID: String,
  createdBy: String,
  lastUpdate: String,
});

const WatchModel = mongoose.model<Watch>('Watch', schema);

export default WatchModel;
