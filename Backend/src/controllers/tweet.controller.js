import { isValidObjectId } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Tweet } from '../models/tweet.model.js';

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const userId = req.user?._id;

  // Validate content
  if (!content || content.trim() === '') {
    throw new ApiError(400, 'Tweet content is required');
  }

  // Validate user
  if (!userId || !isValidObjectId(userId)) {
    throw new ApiError(401, 'User is not authorized');
  }

  const tweetRes = await Tweet.create({
    owner: userId,
    content: content,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, 'Tweet created successfully', tweetRes));
});

const getAllTweetbyUser = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId || !isValidObjectId(userId)) {
    throw new ApiError(401, 'User is not authorized');
  }

  const tweets = await Tweet.find({ owner: userId }).sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, 'Tweets fetched successfully', tweets));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const userId = req.user?._id;
  const { tweetId } = req.params;
  // Validate tweetId
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, 'Invalid tweet ID');
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, 'Tweet not found');
  }

  if (tweet.owner.toString() !== userId.toString()) {
    throw new ApiError(403, 'You are not authorized to update this tweet');
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    { content },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, 'Tweet updated successfully', updatedTweet));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { tweetId } = req.params;
  // Validate tweetId
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, 'Invalid tweet ID');
  }

  const tweetRes = await Tweet.findByIdAndDelete({
    _id: tweetId,
    owner: userId,
  });

  if (!tweetRes) {
    throw new ApiError(
      404,
      'Tweet not found or you are not authorized to delete this tweet'
    );
  }
  return res
    .status(200)
    .json(new ApiResponse(200, 'Tweet deleted successfully'));
});

export { createTweet, getAllTweetbyUser, updateTweet, deleteTweet };
