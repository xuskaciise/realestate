import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  id: string;
  fullname: string;
  username: string;
  password: string;
  type: string;
  status: string;
  profile: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    fullname: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    type: { type: String, required: true },
    status: { type: String, required: true },
    profile: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

UserSchema.virtual('id').get(function (this: Document) {
  return (this as any)._id.toHexString();
});

UserSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    const { _id, __v, ...result } = ret;
    return result;
  },
});

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
