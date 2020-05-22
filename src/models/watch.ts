import mongoose from 'mongoose';

export interface Watch extends mongoose.Document {
  createdBy: string;
  aryionUsername: string;
  channelID: string;
  lastUpdate?: string;
}

const schema = new mongoose.Schema({
  createdBy: String,
  aryionUsername: String,
  channelID: String,
  lastUpdate: String,
});

const WatchModel = mongoose.model<Watch>('Watch', schema);

export default WatchModel;
