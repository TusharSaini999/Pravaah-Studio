import mongoose, { Schema } from 'mongoose';
import aggregatePaginate from 'mongoose-aggregate-paginate-v2';

const playlistSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Playlist name is required'],
      trim: true,
      minlength: [3, 'Playlist name must be at least 3 characters long'],
      maxlength: [100, 'Playlist name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Playlist description is required'],
      trim: true,
      minlength: [5, 'Playlist description must be at least 5 characters long'],
      maxlength: [500, 'Playlist description cannot exceed 500 characters'],
    },
    video: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Video',
      },
    ],
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Playlist owner is required'],
    },
  },
  {
    timestamps: true,
  }
);

// plugin
playlistSchema.plugin(aggregatePaginate);

export const Playlist = mongoose.model('Playlist', playlistSchema);
