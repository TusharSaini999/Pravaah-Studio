import mongoose, { Schema } from 'mongoose';
import aggregatePaginate from 'mongoose-aggregate-paginate-v2';
const videoSchema = new Schema(
  {
    videoFile: {
      type: String, // Cloudinary URL
      required: [true, 'Video file is required'],
    },

    thumbnail: {
      type: String, // Cloudinary URL
      required: [true, 'Thumbnail image is required'],
    },

    title: {
      type: String,
      required: [true, 'Video title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters long'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },

    description: {
      type: String,
      required: [true, 'Video description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters long'],
    },

    duration: {
      type: Number, // Cloudinary (seconds)
      required: [true, 'Video duration is required'],
      min: [1, 'Duration must be greater than 0'],
    },

    views: {
      type: Number,
      default: 0,
      min: [0, 'Views cannot be negative'],
    },

    isPublished: {
      type: Boolean,
      default: true,
    },

    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Video owner is required'],
    },
  },
  {
    timestamps: true,
  }
);

videoSchema.plugin(aggregatePaginate);
export const Video = mongoose.model('Video', videoSchema);
