import mongoose, { Schema } from 'mongoose';

const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId, //One Which is Subscriber
      ref: 'User',
      required: true,
    },
    channel: {
      type: Schema.Types.ObjectId, //One who is Subscribe
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
