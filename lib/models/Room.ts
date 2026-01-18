import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRoom extends Document {
  id: string;
  name: string;
  monthlyRent: number;
  houseId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    monthlyRent: { type: Number, required: true },
    houseId: { type: String, required: true },
    status: { type: String, default: 'available' },
  },
  {
    timestamps: true,
  }
);

RoomSchema.virtual('id').get(function (this: Document) {
  return (this as any)._id.toHexString();
});

RoomSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    const { _id, __v, ...result } = ret;
    return result;
  },
});

const Room: Model<IRoom> =
  mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);

export default Room;
