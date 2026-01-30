import mongoose from 'mongoose';
import { Video } from '../models/video.model.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

  const userId = req.user._id;
  const stats = await Video.aggregate([
    // Only this channel's videos
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },

    //  Lookup likes per video
    {
      $lookup: {
        from: 'likes',
        localField: '_id', // video _id
        foreignField: 'video', // likes.video
        as: 'videoLikes',
      },
    },

    //  Add likes count per video
    {
      $addFields: {
        likesCount: { $size: '$videoLikes' },
      },
    },

    // Group all videos into channel stats
    {
      $group: {
        _id: '$owner',
        totalVideos: { $sum: 1 },
        totalViews: { $sum: '$views' },
        totalLikes: { $sum: '$likesCount' },
      },
    },

    //Lookup subscribers
    {
      $lookup: {
        from: 'subscriptions',
        localField: '_id',
        foreignField: 'channel',
        as: 'subscribers',
      },
    },

    //Count subscribers
    {
      $addFields: {
        totalSubscribers: { $size: '$subscribers' },
      },
    },

    //Clean response
    {
      $project: {
        subscribers: 0,
        likesCount: 0,
      },
    },
  ]);

  if (!stats || stats.length === 0) {
    return res.status(200).json(
      new ApiResponse(200, 'No stats found for this channel', {
        totalVideos: 0,
        totalViews: 0,
        totalLikes: 0,
        totalSubscribers: 0,
      })
    );
  }
  return res
    .status(200)
    .json(new ApiResponse(200, 'Channel stats fetched successfully', stats[0]));
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const userId = req.user._id;
  const videoRes = await Video.find({
    owner: userId,
  }).sort({ createdAt: -1 });
  if (!videoRes || videoRes.length === 0) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, 'No videos found for this channel', { videoRes })
      );
  }
  return res
    .status(200)
    .json(new ApiResponse(200, 'Videos fetched successfully', { videoRes }));
});

export { getChannelStats, getChannelVideos };
