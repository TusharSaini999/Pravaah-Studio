import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import fileUpload from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/apiResponse.js';
import jwt from 'jsonwebtoken';
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const userData = await User.findById(userId);
    const accessToken = userData.generateAccessToken();
    const refreshToken = userData.generateRefreshToken();
    userData.refreshToken = refreshToken;
    await userData.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, 'Internal Server Error');
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // Extract user data
  let { fullName, email, userName, password } = req.body;

  // Normalize input
  fullName = fullName?.trim();
  email = email?.trim();
  userName = userName?.trim();
  password = password?.trim();

  // Validate required fields
  const requiredFields = { fullName, email, userName, password };

  for (const [field, value] of Object.entries(requiredFields)) {
    if (!value) {
      throw new ApiError(400, `${field} is required.`);
    }
  }

  // Check for existing user
  const existingUser = await User.findOne({
    $or: [{ email }, { userName }],
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new ApiError(409, 'An account with this email already exists.');
    }
    if (existingUser.userName === userName) {
      throw new ApiError(409, 'This username is already in use.');
    }
  }

  // Get uploaded files
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  // Validate avatar upload
  if (!avatarLocalPath) {
    throw new ApiError(400, 'Profile avatar image is required.');
  }

  // Upload images to Cloudinary
  const avatarCloud = await fileUpload(avatarLocalPath);
  const coverImageCloud = coverImageLocalPath
    ? await fileUpload(coverImageLocalPath)
    : null;

  // Validate upload success
  if (!avatarCloud?.url) {
    throw new ApiError(500, 'Failed to upload avatar image. Please try again.');
  }

  // Create user
  const user = await User.create({
    fullName,
    avatar: avatarCloud.url,
    coverImage: coverImageCloud?.url || '',
    email,
    userName: userName.toLowerCase(),
    password,
  });

  // Verify user creation
  const createdUser = await User.findById(user._id).select(
    '-password -refreshToken'
  );

  if (!createdUser) {
    throw new ApiError(
      500,
      'User registration failed. Please try again later.'
    );
  }

  // Send response
  return res
    .status(201)
    .json(new ApiResponse(201, 'User registered successfully.', createdUser));
});

const loginUser = asyncHandler(async (req, res) => {
  // Step 1: Extract credentials from request body
  let { userName, email, password } = req.body;

  // Step 2: Normalize input values
  userName = userName?.trim();
  email = email?.trim();
  password = password?.trim();

  // Step 3: Validate username or email
  if (!userName && !email) {
    throw new ApiError(400, 'Username or email is required to log in.');
  }

  // Step 4: Validate password
  if (!password) {
    throw new ApiError(400, 'Password is required to log in.');
  }

  // Step 5: Find user by username or email
  const userData = await User.findOne({
    $or: [{ email }, { userName }],
  });

  // Step 6: Handle user not found
  if (!userData) {
    throw new ApiError(401, 'Invalid login credentials.');
  }

  // Step 7: Verify password
  const isPasswordValid = await userData.isPasswordCorrect(password);

  // Step 8: Handle incorrect password
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid login credentials.');
  }

  // Step 9: Generate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    userData._id
  );

  // Step 10: Cookie options
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  };

  // Step 11: Fetch safe user data
  const safeUserData = await User.findById(userData._id).select(
    '-password -refreshToken'
  );

  // Step 12: Send response
  return res
    .status(200)
    .cookie('accessToken', accessToken, cookieOptions)
    .cookie('refreshToken', refreshToken, cookieOptions)
    .json(
      new ApiResponse(200, 'Login successful.', {
        user: safeUserData,
      })
    );
});

const logout = asyncHandler(async (req, res) => {
  // User added by authentication middleware
  const userId = req.user?._id;

  // If user is not authenticated
  if (!userId) {
    throw new ApiError(401, 'Unauthorized request. User not authenticated.');
  }

  // Remove refresh token from database
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $unset: { refreshToken: 1 },
    },
    { new: true }
  );

  // Database failure
  if (!updatedUser) {
    throw new ApiError(500, 'Failed to log out user. Please try again later.');
  }

  // Cookie options
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  };

  // Clear cookies and respond
  return res
    .status(200)
    .clearCookie('accessToken', cookieOptions)
    .clearCookie('refreshToken', cookieOptions)
    .json(
      new ApiResponse(
        200,
        'Logout successful. User session has been terminated.',
        {}
      )
    );
});

const accessTokenGenerator = asyncHandler(async (req, res) => {
  // Step 1: Get refresh token
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token is missing. Please log in again.');
  }

  // Step 2: Verify refresh token
  let decodedToken;
  try {
    decodedToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(
      401,
      'Refresh token is invalid or has expired. Please log in again.'
    );
  }

  // Step 3: Find user
  const user = await User.findById(decodedToken._id);

  if (!user) {
    throw new ApiError(401, 'User authentication failed.');
  }

  // Step 4: Match refresh token
  if (user.refreshToken !== refreshToken) {
    throw new ApiError(401, 'Unauthorized access. Token mismatch detected.');
  }

  // Step 5: Generate new tokens (rotation)
  const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
    await generateAccessAndRefreshToken(decodedToken._id);

  // Step 6: Cookie options
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  };

  // Step 7: Send response
  return res
    .status(200)
    .cookie('accessToken', newAccessToken, cookieOptions)
    .cookie('refreshToken', newRefreshToken, cookieOptions)
    .json(
      new ApiResponse(200, 'Access token refreshed successfully.', {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      })
    );
});

export { registerUser, loginUser, logout, accessTokenGenerator };
