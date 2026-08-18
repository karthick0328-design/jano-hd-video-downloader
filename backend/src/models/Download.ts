import mongoose, { Document, Schema } from 'mongoose';

export type DownloadStatus =
  | 'queued'
  | 'processing'
  | 'merging'
  | 'completed'
  | 'failed';

export interface IDownload extends Document {
  jobId: string;
  sourceUrl: string;
  platform: string;
  title: string;
  quality: string;
  format: string;
  status: DownloadStatus;
  progress: number;
  fileSize?: number;
  filePath?: string;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
}

const downloadSchema = new Schema<IDownload>(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    sourceUrl: { type: String, required: true },
    platform: { type: String, required: true },
    title: { type: String, default: '' },
    quality: { type: String, required: true },
    format: { type: String, required: true },
    status: {
      type: String,
      enum: ['queued', 'processing', 'merging', 'completed', 'failed'],
      default: 'queued',
      index: true,
    },
    progress: { type: Number, default: 0 },
    fileSize: { type: Number, default: 0 },
    filePath: { type: String },
    errorMessage: { type: String },
    completedAt: { type: Date },
    expiresAt: { type: Date, index: true },
  },
  {
    timestamps: true,
  }
);

export const Download = mongoose.model<IDownload>('Download', downloadSchema);
