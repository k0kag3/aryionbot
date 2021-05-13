import mongoose from "mongoose";

export interface AryionUser extends mongoose.Document {
  id: string;
  username: string;
  avatarUrl: string;
  lastUpdate?: string;
}

const schema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  avatarUrl: { type: String, required: true },
  lastUpdate: { type: String },
});

const AryionUserModel = mongoose.model<AryionUser>("AryionUser", schema);

export default AryionUserModel;
