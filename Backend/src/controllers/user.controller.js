import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import fileUpload from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/apiResponse.js';
import jwt from 'jsonwebtoken';

//User Authentication
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

const changeCurrentUserPassword = asyncHandler(async (req, res) => {
  // Extract authenticated user ID
  const userId = req.user?._id;

  // Extract password fields from request body
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  // Validate that all password fields are provided
  if (!currentPassword || !newPassword || !confirmNewPassword) {
    throw new ApiError(400, 'All password fields are required.');
  }

  // Ensure new password and confirmation password match
  if (newPassword !== confirmNewPassword) {
    throw new ApiError(400, 'New password and confirmation do not match.');
  }

  // Validate password length constraints
  if (newPassword.length < 8 || newPassword.length > 16) {
    throw new ApiError(400, 'Password must be between 8 and 16 characters.');
  }

  // Prevent reuse of the current password
  if (currentPassword === newPassword) {
    throw new ApiError(
      400,
      'New password must be different from current password.'
    );
  }

  // Fetch user details from the database
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  // Verify the provided current password against stored hash
  const isPasswordValid = await user.isPasswordCorrect(currentPassword);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Current password is incorrect.');
  }

  // Update the user password (hashed via pre-save middleware)
  user.password = newPassword;
  await user.save();

  // Send success response
  res
    .status(200)
    .json(new ApiResponse(200, 'Password updated successfully.', {}));
});

const forgotPasswordReqSend = asyncHandler(async (req, res) => {
  //Taken the User Email or UserId from the req body
  //Get the userEmail form the DB to Check the user is valid or not
});

//User Profile
const updateUserProfilePicture = asyncHandler(async (req, res) => {
  // Extract authenticated user ID
  const userId = req.user?._id;

  // Extract local file paths from multipart request
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  // Ensure at least one image is provided for update
  if (!avatarLocalPath && !coverImageLocalPath) {
    throw new ApiError(
      400,
      'Please provide at least one image (avatar or cover image) to update.'
    );
  }

  let avatarCloud;
  let coverImageCloud;
  const updateQuery = {};

  // Upload avatar image to cloud storage if provided
  if (avatarLocalPath) {
    avatarCloud = await fileUpload(avatarLocalPath);
    if (!avatarCloud?.url) {
      throw new ApiError(500, 'Failed to upload avatar image.');
    }
    updateQuery.avatar = avatarCloud?.url;
  }

  // Upload cover image to cloud storage if provided
  if (coverImageLocalPath) {
    coverImageCloud = await fileUpload(coverImageLocalPath);
    if (!coverImageCloud?.url) {
      throw new ApiError(500, 'Failed to upload cover image.');
    }
    updateQuery.coverImage = coverImageCloud?.url;
  }

  // Update user document and return updated record
  const userData = await User.findByIdAndUpdate(
    userId,
    {
      $set: { updateQuery },
    },
    {
      new: true,
    }
  ).select('-password -refreshToken');

  // Handle user not found scenario
  if (!userData) {
    throw new ApiError(404, 'User not found.');
  }

  // Send success response with updated user data
  return res
    .status(200)
    .json(
      new ApiResponse(200, 'Profile image updated successfully.', { userData })
    );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  // Extract fields from request body
  const { fullName, email } = req.body;

  // Get user ID from authenticated request
  const userId = req.user?._id;

  // Validate that at least one field is provided
  if (!fullName && !email) {
    throw new ApiError(
      400,
      'At least one field (fullName or email) is required to update.'
    );
  }

  // Prepare dynamic update object
  const updateData = {};

  // Add fullName if provided
  if (fullName) {
    updateData.fullName = fullName.trim();
  }

  // Add email if provided
  if (email) {
    updateData.email = email.trim();
  }

  // Update user document and return the updated record
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select('-password -refreshToken'); // Exclude sensitive fields

  // Handle unexpected update failure
  if (!updatedUser) {
    throw new ApiError(
      500,
      'Failed to update account details. Please try again later.'
    );
  }

  // Send success response with updated user data
  return res
    .status(200)
    .json(
      new ApiResponse(200, 'Account details updated successfully.', updatedUser)
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(
    new ApiResponse(200, 'Current user fetched successfully.', {
      user: req.user,
    })
  );
});


export {
  registerUser,
  loginUser,
  logout,
  accessTokenGenerator,
  getCurrentUser,
  updateAccountDetails,
  updateUserProfilePicture,
  changeCurrentUserPassword,
  forgotPasswordReqSend,
};
