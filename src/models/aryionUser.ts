import mongoose from 'mongoose';

export interface AryionUser extends mongoose.Document {
  username: string;
  thumbnailUrl: string;
  lastUpdate?: string;
}

const schema = new mongoose.Schema({
  username: String,
  thumbnailUrl: String,
  lastUpdate: String,
});

const AryionUserModel = mongoose.model<AryionUser>('AryionUser', schema);

export default AryionUserModel;
