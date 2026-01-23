import mongoose, { Schema } from 'mongoose';

const forgotPasswordSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    forgotToken: {
      type: String,
      required: true,
      unique: true,
    },

    tokenExpiry: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index → auto delete when expired
forgotPasswordSchema.index({ tokenExpiry: 1 }, { expireAfterSeconds: 0 });

export const ForgotPassword = mongoose.model(
  'ForgotPassword',
  forgotPasswordSchema
);
