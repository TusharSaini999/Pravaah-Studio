import mongoose, { isValidObjectId } from 'mongoose';
import { Playlist } from '../models/playlist.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const userId = req.user._id;

  // ---- Name validation ----
  if (!name || typeof name !== 'string') {
    throw new ApiError(400, 'Playlist name is required');
  }

  const trimmedName = name.trim();
  if (trimmedName.length < 3) {
    throw new ApiError(400, 'Playlist name must be at least 3 characters long');
  }
  if (trimmedName.length > 100) {
    throw new ApiError(400, 'Playlist name cannot exceed 100 characters');
  }

  // ---- Description validation ----
  if (!description || typeof description !== 'string') {
    throw new ApiError(400, 'Playlist description is required');
  }

  const trimmedDescription = description.trim();
  if (trimmedDescription.length < 5) {
    throw new ApiError(
      400,
      'Playlist description must be at least 5 characters long'
    );
  }
  if (trimmedDescription.length > 500) {
    throw new ApiError(
      400,
      'Playlist description cannot exceed 500 characters'
    );
  }

  const playlistRes = await Playlist.create({
    name: trimmedName,
    description: trimmedDescription,
    owner: userId,
  });

  if (!playlistRes) {
    throw new ApiError(500, 'Something went wrong');
  }

  res
    .status(201)
    .json(new ApiResponse(201, 'Playlist created successfully', playlistRes));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const playlistRes = await Playlist.find({
    owner: userId,
  });
  if (!playlistRes.length) {
    return res.status(200).json(new ApiResponse(200, 'No playlists found', {}));
  }
  res
    .status(200)
    .json(new ApiResponse(200, 'Get Playlist Successfully', { playlistRes }));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  // ---- Validate ID ----
  if (!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, 'Invalid playlist ID');
  }

  const playlistRes = await Playlist.findById(playlistId).populate({
    path: 'video',
    select: 'thumbnail title owner',
    populate: {
      path: 'owner',
      select: 'fullName userName avatar',
    },
  });

  // ---- Not found ----
  if (!playlistRes) {
    throw new ApiError(404, 'Playlist not found');
  }

  res
    .status(200)
    .json(new ApiResponse(200, 'Playlist fetched successfully', playlistRes));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  const userId = req.user._id;

  // ---- Validate IDs ----
  if (
    !playlistId ||
    !isValidObjectId(playlistId) ||
    !videoId ||
    !isValidObjectId(videoId)
  ) {
    throw new ApiError(400, 'Invalid playlist or video ID');
  }

  const addRes = await Playlist.findOneAndUpdate(
    {
      _id: playlistId,
      owner: userId,
    },
    {
      $addToSet: { video: videoId },
    },
    {
      new: true,
    }
  );

  // ---- Not found / unauthorized ----
  if (!addRes) {
    throw new ApiError(404, 'Playlist not found or access denied');
  }

  res
    .status(200)
    .json(new ApiResponse(200, 'Video added to playlist successfully', addRes));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  const userId = req.user._id;

  // ---- Validate IDs ----
  if (
    !playlistId ||
    !isValidObjectId(playlistId) ||
    !videoId ||
    !isValidObjectId(videoId)
  ) {
    throw new ApiError(400, 'Invalid playlist or video ID');
  }

  const deleteRes = await Playlist.findOneAndUpdate(
    {
      _id: playlistId,
      owner: userId,
    },
    {
      $pull: { video: videoId },
    },
    {
      new: true,
    }
  );

  if (!deleteRes) {
    throw new ApiError(404, 'Playlist not found or access denied');
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        'Video removed from playlist successfully',
        deleteRes
      )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const userId = req.user._id;
  if (!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, 'Invalid playlist ID');
  }

  const deleteRes = await Playlist.findOneAndDelete({
    _id: playlistId,
    owner: userId,
  });

  if (!deleteRes) {
    throw new ApiError(404, 'Playlist not found or access denied');
  }

  res
    .status(200)
    .json(new ApiResponse(200, 'Playlist deleted successfully', { deleteRes }));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  const userId = req.user._id;

  if (!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, 'Invalid playlist ID');
  }
  const updateData = {};
  if (name) {
    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      throw new ApiError(
        400,
        'Playlist name must be at least 3 characters long'
      );
    }
    if (trimmedName.length > 100) {
      throw new ApiError(400, 'Playlist name cannot exceed 100 characters');
    }
    updateData.name = trimmedName;
  }
  if (description) {
    const trimmedDescription = description.trim();
    if (trimmedDescription.length < 5) {
      throw new ApiError(
        400,
        'Playlist description must be at least 5 characters long'
      );
    }
    if (trimmedDescription.length > 500) {
      throw new ApiError(
        400,
        'Playlist description cannot exceed 500 characters'
      );
    }
    updateData.description = trimmedDescription;
  }
  const updateRes = await Playlist.findOneAndUpdate(
    {
      _id: playlistId,
      owner: userId,
    },
    updateData,

    { new: true }
  );
  if (!updateRes) {
    throw new ApiError(404, 'Playlist not found or access denied');
  }
  res
    .status(200)
    .json(new ApiResponse(200, 'Playlist updated successfully', { updateRes }));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
