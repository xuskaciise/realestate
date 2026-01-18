import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRent extends Document {
  id: string;
  roomId: string;
  tenantId: string;
  guarantorName: string;
  guarantorPhone: string;
  monthlyRent: number;
  months: number;
  totalRent: number;
  startDate: Date;
  endDate: Date;
  contract: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const RentSchema: Schema = new Schema(
  {
    roomId: { type: String, required: true },
    tenantId: { type: String, required: true },
    guarantorName: { type: String, required: true },
    guarantorPhone: { type: String, required: true },
    monthlyRent: { type: Number, required: true },
    months: { type: Number, required: true },
    totalRent: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    contract: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

RentSchema.virtual('id').get(function (this: Document) {
  return (this as any)._id.toHexString();
});

RentSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    const { _id, __v, ...result } = ret;
    return result;
  },
});

const Rent: Model<IRent> =
  mongoose.models.Rent || mongoose.model<IRent>('Rent', RentSchema);

export default Rent;
