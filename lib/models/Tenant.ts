import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITenant extends Document {
  id: string;
  name: string;
  phone: string;
  address: string;
  profile: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    profile: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

TenantSchema.virtual('id').get(function (this: Document) {
  return (this as any)._id.toHexString();
});

TenantSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    const { _id, __v, ...result } = ret;
    return result;
  },
});

const Tenant: Model<ITenant> =
  mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', TenantSchema);

export default Tenant;
