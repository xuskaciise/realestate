import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHouse extends Document {
  id: string;
  name: string;
  address: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const HouseSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    description: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

// Create virtual id field
HouseSchema.virtual('id').get(function (this: Document) {
  return (this as any)._id.toHexString();
});

// Ensure virtual fields are serialized
HouseSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    const { _id, __v, ...result } = ret;
    return result;
  },
});

const House: Model<IHouse> =
  mongoose.models.House || mongoose.model<IHouse>('House', HouseSchema);

export default House;
