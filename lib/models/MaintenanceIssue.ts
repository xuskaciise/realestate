import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMaintenanceIssue extends Document {
  id: string;
  name: string;
  description?: string;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceIssueSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: null },
    price: { type: Number, required: true, min: 0 },
  },
  {
    timestamps: true,
  }
);

MaintenanceIssueSchema.virtual('id').get(function (this: Document) {
  return (this as any)._id.toHexString();
});

MaintenanceIssueSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    const { _id, __v, ...result } = ret;
    return result;
  },
});

const MaintenanceIssue: Model<IMaintenanceIssue> =
  mongoose.models.MaintenanceIssue || mongoose.model<IMaintenanceIssue>('MaintenanceIssue', MaintenanceIssueSchema);

export default MaintenanceIssue;
