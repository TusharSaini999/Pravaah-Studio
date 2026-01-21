import { User } from '../models/user.model.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import jwt from 'jsonwebtoken';

export const verifyJwt = asyncHandler(async (req, _, next) => {
  try {
    // Extract access token from cookies or Authorization header
    const token =
      req.cookies?.accousToken ||
      req.header('Authorization')?.replace('Bearer ', '');

    // If token is not provided, deny access
    if (!token) {
      throw new ApiError(401, 'Access token is required');
    }

    // Verify and decode the JWT
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Fetch the user associated with the token
    const user = await User.findById(decodedToken._id).select(
      '-password -refreshToken'
    );

    // If user does not exist, token is invalid
    if (!user) {
      throw new ApiError(401, 'Invalid access token');
    }

    // Attach authenticated user to the request object
    req.user = user;

    // Proceed to the next middleware or controller
    next();
  } catch (error) {
    
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Access token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Invalid access token');
    }
    throw error;
  }
});
