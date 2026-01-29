import { Comment } from '../models/comment.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  if (!videoId) {
    throw new ApiError(400, 'VideoID is must be req');
  }
  const comments = await Comment.find({ video: videoId })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('owner', 'username avatarUrl')
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(200, 'Comments fetched successfully', {
      comments,
      page,
      limit,
    })
  );
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;
  const ownerId = req.user._id;
  if (!videoId) {
    throw new ApiError(400, 'VideoId is must be req');
  }
  if (!content) {
    throw new ApiError(400, 'Content Must be Req');
  }
  const addRes = await Comment.create({
    content,
    video: videoId,
    owner: ownerId,
  });
  res
    .status(201)
    .json(new ApiResponse(true, 'Comment added successfully', addRes));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { newContent } = req.body;
  const ownerId = req.user._id;
  if (!commentId) {
    throw new ApiError(400, 'CommentId Must be Req');
  }
  if (!newContent) {
    throw new ApiError(400, 'Content Must be Req');
  }
  const addRes = await Comment.findByIdAndUpdate(
    {
      _id: commentId,
      ownerId: ownerId,
    },
    { content: newContent },
    { new: true }
  );
  res.status(200).json(
    new ApiResponse(200, 'Comment Updated', {
      addRes,
    })
  );
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const ownerId = req.user._id;
  if (!commentId) {
    throw new ApiError(400, 'Comment Id must be req');
  }
  const deleteRes = await Comment.findByIdAndDelete({
    _id: commentId,
    ownerId: ownerId,
  });
  res.status(200).json(
    new ApiResponse(200, 'Comment Deleted', {
      deleteRes,
    })
  );
});

export { getVideoComments, addComment, updateComment, deleteComment };
