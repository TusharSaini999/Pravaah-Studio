import { isValidObjectId } from 'mongoose';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { Like } from '../models/like.model';
import { asyncHandler } from '../utils/asyncHandler';

const addLikeOnVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  if (
    !videoId ||
    !isValidObjectId(videoId) ||
    !userId ||
    isValidObjectId(userId)
  ) {
    throw new ApiError(400, 'Something went wrong');
  }

  const likeRes = await Like.create({
    video: videoId,
    likeby: userId,
  });

  if (!likeRes) {
    throw new ApiError(200, 'Something went to wrong');
  }

  res.status(200).json(new ApiResponse(200, 'Like Succesfully', {}));
});

const addLikeOnTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const userId = req.user._id;

  if (
    !tweetId ||
    !isValidObjectId(tweetId) ||
    !userId ||
    isValidObjectId(userId)
  ) {
    throw new ApiError(400, 'Something went wrong');
  }

  const likeRes = await Like.create({
    tweet: tweetId,
    likeby: userId,
  });

  if (!likeRes) {
    throw new ApiError(200, 'Something went to wrong');
  }

  res.status(200).json(new ApiResponse(200, 'Like Succesfully', {}));
});

const addLikeOnComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  if (
    !commentId ||
    !isValidObjectId(commentId) ||
    !userId ||
    isValidObjectId(userId)
  ) {
    throw new ApiError(400, 'Something went wrong');
  }

  const likeRes = await Like.create({
    tweet: commentId,
    likeby: userId,
  });

  if (!likeRes) {
    throw new ApiError(200, 'Something went to wrong');
  }

  res.status(200).json(new ApiResponse(200, 'Like Succesfully', {}));
});

const getLikeVideo = asyncHandler(async (req, res) => {
  const { userId } = req.user._id;
  if (!userId || isValidObjectId(userId)) {
    throw new ApiError(404, 'Unauthrized Req');
  }

  const likeVideo = await Like.find({
    likeBy: userId,
    video: { $exists: true, $ne: null },
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

export {
    addLikeOnComment,
    addLikeOnTweet,
    addLikeOnVideo,
    getLikeVideo
}
