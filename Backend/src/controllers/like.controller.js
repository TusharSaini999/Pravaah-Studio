import { isValidObjectId } from 'mongoose';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Like } from '../models/like.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const addLikeOnVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(videoId) || !isValidObjectId(userId)) {
    throw new ApiError(400, 'Invalid data');
  }

  const like = await Like.findOneAndUpdate(
    { video: videoId, likeBy: userId }, // match condition
    { $setOnInsert: { video: videoId, likeBy: userId } },
    { upsert: true, new: true }
  );

  res
    .status(200)
    .json(new ApiResponse(200, 'Like processed successfully', like));
});

const addLikeOnTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(tweetId) || !isValidObjectId(userId)) {
    throw new ApiError(400, 'Invalid data');
  }

  const like = await Like.findOneAndUpdate(
    { tweet: tweetId, likeBy: userId }, // condition
    { $setOnInsert: { tweet: tweetId, likeBy: userId } },
    { upsert: true, new: true }
  );

  res
    .status(200)
    .json(new ApiResponse(200, 'Like processed successfully', like));
});

const addLikeOnComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(commentId) || !isValidObjectId(userId)) {
    throw new ApiError(400, 'Invalid data');
  }

  const like = await Like.findOneAndUpdate(
    { comment: commentId, likeBy: userId }, // condition
    { $setOnInsert: { comment: commentId, likeBy: userId } },
    { upsert: true, new: true }
  );

  res
    .status(200)
    .json(new ApiResponse(200, 'Like processed successfully', like));
});

const getLikeVideo = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  if (!userId || !isValidObjectId(userId)) {
    throw new ApiError(404, 'Unauthrized Req');
  }

  const likeVideo = await Like.find({
    likeBy: userId,
    video: { $type: 'objectId' },
  })
    .populate({
      path: 'video',
      select: 'title thumbnail owner',
      populate: {
        path: 'owner',
        select: 'fullName userName avatar',
      },
    })
    .sort({ createdAt: -1 })
    .lean();

  if (!likeVideo) {
    throw new ApiError(500, 'Something went to wrong');
  }

  res.status(200).json(new ApiResponse(200, 'Get Data Succesfully', likeVideo));
});

export { addLikeOnComment, addLikeOnTweet, addLikeOnVideo, getLikeVideo };
