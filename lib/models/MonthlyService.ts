import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMonthlyService extends Document {
  id: string;
  roomId: string;
  month: string;
  waterPrevious: number | null;
  waterCurrent: number | null;
  waterPricePerUnit: number | null;
  waterTotal: number | null;
  electricityPrevious: number | null;
  electricityCurrent: number | null;
  electricityPricePerUnit: number | null;
  electricityTotal: number | null;
  trashFee: number | null;
  maintenanceFee: number | null;
  totalAmount: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const MonthlyServiceSchema: Schema = new Schema(
  {
    roomId: { type: String, required: true },
    month: { type: String, required: true },
    waterPrevious: { type: Number, default: null },
    waterCurrent: { type: Number, default: null },
    waterPricePerUnit: { type: Number, default: null },
    waterTotal: { type: Number, default: null },
    electricityPrevious: { type: Number, default: null },
    electricityCurrent: { type: Number, default: null },
    electricityPricePerUnit: { type: Number, default: null },
    electricityTotal: { type: Number, default: null },
    trashFee: { type: Number, default: null },
    maintenanceFee: { type: Number, default: null },
    totalAmount: { type: Number, required: true },
    notes: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

MonthlyServiceSchema.virtual('id').get(function (this: Document) {
  return (this as any)._id.toHexString();
});

MonthlyServiceSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    const { _id, __v, ...result } = ret;
    return result;
  },
});

const MonthlyService: Model<IMonthlyService> =
  mongoose.models.MonthlyService ||
  mongoose.model<IMonthlyService>('MonthlyService', MonthlyServiceSchema);

export default MonthlyService;
