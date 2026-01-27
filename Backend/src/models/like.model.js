import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
      default: null,
    },
    tweet: {
      type: Schema.Types.ObjectId,
      ref: "Tweet",
      default: null,
    },
    likeBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required to like content"],
    },
  },
  {
    timestamps: true,
  }
);


likeSchema.pre("validate", function (next) {
  const targets = [this.comment, this.video, this.tweet].filter(Boolean);

  if (targets.length === 0) {
    return next(
      new Error("Like must be associated with a comment, video, or tweet")
    );
  }

  if (targets.length > 1) {
    return next(
      new Error("Like can be associated with only one item at a time")
    );
  }

  next();
});

export const Like = mongoose.model("Like", likeSchema);
