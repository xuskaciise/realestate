import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMaintenanceRequest extends Document {
  id: string;
  tenantId?: string;
  roomId?: string;
  issueIds: string[]; // Array of maintenance issue IDs
  totalPrice: number;
  status: string; // Pending, In Progress, Completed, Cancelled
  notes?: string;
  createdBy?: mongoose.Types.ObjectId; // User ID who created this request
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceRequestSchema: Schema = new Schema(
  {
    tenantId: { type: String, default: null },
    roomId: { type: String, default: null },
    issueIds: [{ type: String, required: true }],
    totalPrice: { type: Number, required: true, min: 0 },
    status: { type: String, required: true, default: 'Pending' },
    notes: { type: String, default: null },
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      default: null,
      index: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

MaintenanceRequestSchema.virtual('id').get(function (this: Document) {
  return (this as any)._id.toHexString();
});

MaintenanceRequestSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    const { _id, __v, ...result } = ret;
    return result;
  },
});

const MaintenanceRequest: Model<IMaintenanceRequest> =
  mongoose.models.MaintenanceRequest || mongoose.model<IMaintenanceRequest>('MaintenanceRequest', MaintenanceRequestSchema);

export default MaintenanceRequest;
