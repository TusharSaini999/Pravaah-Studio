import { isValidObjectId } from 'mongoose';
import { Video } from '../models/video.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import fileUpload from '../utils/cloudinary.js';

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const files = req.files;
  const user = req.user;

  // User validation
  if (!user) {
    throw new ApiError(401, 'Unauthorized: User not found');
  }

  // Title validation
  if (!title || title.trim() === '') {
    throw new ApiError(400, 'Title is required');
  }

  if (title.trim().length < 3) {
    throw new ApiError(400, 'Title must be at least 3 characters long');
  }

  // Description validation
  if (!description || description.trim() === '') {
    throw new ApiError(400, 'Description is required');
  }

  if (description.trim().length < 10) {
    throw new ApiError(400, 'Description must be at least 10 characters long');
  }

  // Files validation
  if (!files) {
    throw new ApiError(400, 'Video and thumbnail files are required');
  }

  const videoFile = files?.video?.[0];
  const thumbnailFile = files?.thumbnail?.[0];

  // Video validation
  if (!videoFile) {
    throw new ApiError(400, 'Video file is required');
  }

  if (!videoFile.mimetype.startsWith('video/')) {
    throw new ApiError(400, 'Invalid file type: Only video files are allowed');
  }

  // Thumbnail validation
  if (!thumbnailFile) {
    throw new ApiError(400, 'Thumbnail image is required');
  }

  if (!thumbnailFile.mimetype.startsWith('image/')) {
    throw new ApiError(
      400,
      'Invalid thumbnail type: Only image files are allowed'
    );
  }

  const localVideoURL = videoFile.path;
  const localThumbnailURL = thumbnailFile.path;

  // Upload files
  const uploadedVideo = await fileUpload(localVideoURL);
  const uploadedThumbnail = await fileUpload(localThumbnailURL);

  if (!uploadedVideo?.url || !uploadedVideo?.duration) {
    throw new ApiError(500, 'Video upload failed');
  }

  if (!uploadedThumbnail?.url) {
    throw new ApiError(500, 'Thumbnail upload failed');
  }

  // Save to DB
  const videoRes = await Video.create({
    videoFile: uploadedVideo.url,
    thumbnail: uploadedThumbnail.url,
    duration: uploadedVideo.duration,
    title: title.trim(),
    description: description.trim(),
    owner: user._id,
  });

  if (!videoRes) {
    throw new ApiError(500, 'Failed to publish video');
  }

  return res.status(201).json(
    new ApiResponse(201, 'Video published successfully', {
      video: videoRes,
    })
  );
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, 'Invalid video ID');
  }
  const video = await Video.findById(videoId).populate(
    'owner',
    'name email avatar'
  );

  if (!video) {
    throw new ApiError(404, 'Video not found');
  }
  return res.status(200).json(
    new ApiResponse(200, 'Video fetched successfully', {
      video,
    })
  );
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;
  const uploadeNewVideo = req.files?.video[0]?.path;
  const uploadeNewThumbnail = req.files?.thumbnail[0]?.path;
  const user = req.user;
  if (
    !isValidObjectId(videoId) &&
    !title &&
    !description &&
    !uploadeNewVideo &&
    !uploadeNewThumbnail
  ) {
    throw new ApiError(400, 'Atleast one field is required to update');
  }

  if (!user) {
    throw new ApiError(401, 'Unauthorized: User not found');
  }

  let updatedData = {};

  if (title) {
    if (title.trim().length < 3) {
      throw new ApiError(400, 'Title must be at least 3 characters long');
    }
    updatedData.title = title;
  }
  if (description) {
    if (description.trim().length < 10) {
      throw new ApiError(
        400,
        'Description must be at least 10 characters long'
      );
    }
    updatedData.description = description;
  }

  if (uploadeNewVideo) {
    const uploadedVideo = await fileUpload(uploadeNewVideo);
    if (!uploadedVideo?.url || !uploadedVideo?.duration) {
      throw new ApiError(500, 'Video upload failed');
    }
    updatedData.videoFile = uploadedVideo.url;
    updatedData.duration = uploadedVideo.duration;
  }

  if (uploadeNewThumbnail) {
    const uploadedThumbnail = await fileUpload(uploadeNewThumbnail);
    if (!uploadedThumbnail?.url) {
      throw new ApiError(500, 'Thumbnail upload failed');
    }
    updatedData.thumbnail = uploadedThumbnail.url;
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    {
      _id: videoId,
      owner: user._id,
    },
    updatedData,
    {
      new: true,
    }
  );

  if (!updatedVideo) {
    throw new ApiError(500, 'Failed to update video');
  }
  return res.status(200).json(
    new ApiResponse(200, 'Video updated successfully', {
      video: updatedVideo,
    })
  );
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const user = req.user;
  if (!isValidObjectId(videoId)){
    throw new ApiError(400, 'Invalid video ID');
  }
  if (!user) {
    throw new ApiError(401, 'Unauthorized: User not found');
  }
  const deletedVideo = await Video.findOneAndDelete({
    _id: videoId,
    owner: user._id,
  });
  if (!deletedVideo) {
    throw new ApiError(404, 'Video not found or unauthorized');
  }
  return res.status(200).json(
    new ApiResponse(200, 'Video deleted successfully', {
      video: deletedVideo,
    })
  );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const user = req.user;
  if (!isValidObjectId(videoId)){
    throw new ApiError(400, 'Invalid video ID');
  }
  if (!user) {
    throw new ApiError(401, 'Unauthorized: User not found');
  }
  const video = await Video.findOne({ _id: videoId, owner: user._id });
  if (!video) {
    throw new ApiError(404, 'Video not found or unauthorized');
  }
  video.isPublished = !video.isPublished;
  await video.save();
  return res.status(200).json(
    new ApiResponse(200, 'Video publish status toggled successfully', {
      video,
    })
  );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
