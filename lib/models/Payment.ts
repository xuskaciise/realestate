import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayment extends Document {
  id: string;
  tenantId: string;
  monthlyRent: number;
  paidAmount: number;
  balance: number;
  status: string;
  paymentDate: Date;
  monthlyServiceId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema = new Schema(
  {
    tenantId: { type: String, required: true },
    monthlyRent: { type: Number, required: true },
    paidAmount: { type: Number, required: true },
    balance: { type: Number, required: true },
    status: { type: String, required: true },
    paymentDate: { type: Date, required: true },
    monthlyServiceId: { type: String, default: null },
    notes: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

PaymentSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

PaymentSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

export default Payment;
