import mongoose, { Schema } from 'mongoose';
import aggregatePaginate from 'mongoose-aggregate-paginate-v2';

const tweetSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Tweet owner is required'],
    },
    content: {
      type: String,
      required: [true, 'Tweet content cannot be empty'],
      trim: true,
      minlength: [1, 'Tweet must contain at least 1 character'],
      maxlength: [280, 'Tweet cannot exceed 280 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// plugin
tweetSchema.plugin(aggregatePaginate);

export const Tweet = mongoose.model('Tweet', tweetSchema);
