import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import { Subscription } from '../models/subscription.model.js';
import { ForgotPassword } from '../models/forgot.model.js';
import fileUpload from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/apiResponse.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendMail } from '../utils/sendMail.js';
import mongoose from 'mongoose';
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
  // 1. Extract credentials
  let { userName, email, password } = req.body;

  // 2. Normalize inputs
  userName = userName?.trim();
  email = email?.trim();
  password = password?.trim();

  // 3. Validate username or email
  if (!userName && !email) {
    throw new ApiError(
      400,
      'Please provide either a username or an email address.'
    );
  }

  // 4. Validate password
  if (!password) {
    throw new ApiError(400, 'Password is required.');
  }

  // 5. Find user
  const userData = await User.findOne({
    $or: [{ email }, { userName }],
  });

  // 6. User not found
  if (!userData) {
    throw new ApiError(404, 'Account not found. Please register to continue.');
  }

  // 7. Verify password
  const isPasswordValid = await userData.isPasswordCorrect(password);

  // 8. Incorrect password
  if (!isPasswordValid) {
    throw new ApiError(
      401,
      'Invalid login credentials. Please check your password.'
    );
  }

  // 9. Generate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    userData._id
  );

  // 10. Cookie options
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  };

  // 11. Safe user data
  const safeUserData = await User.findById(userData._id).select(
    '-password -refreshToken'
  );

  // 12. Response
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
  // Get user email from request body
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, 'Email is required for password reset');
  }

  // Check if user exists
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, 'User with this email does not exist');
  }

  // Delete any existing forgot-password tokens for this user
  await ForgotPassword.deleteMany({ userId: user._id });

  // Generate random token
  const token = crypto.randomBytes(32).toString('hex');

  // Hash the token before storing
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Set token expiry (15 minutes from now)
  const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

  // Save the hashed token in DB
  const forgotRes = await ForgotPassword.create({
    userId: user._id,
    forgotToken: hashedToken,
    tokenExpiry,
  });

  if (!forgotRes) {
    throw new ApiError(500, 'Failed to create password reset token');
  }

  // Create reset password URL
  const resetUrl = `${process.env.FRONTEND_RESET_URL}?token=${token}`;

  console.log('User Token Send In Email:', token);
  // Send email with the reset link
  const sendRes = await sendMail({
    to: user.email,
    subject: 'Reset Your Password',
    text: `Hello ${user.fullName || 'User'},\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link will expire in 15 minutes.`,
    html: `<p>Hello ${user.fullName || 'User'},</p>
           <p>Click the link below to reset your password:</p>
           <a href="${resetUrl}">${resetUrl}</a>
           <p>This link will expire in 15 minutes.</p>`,
  });

  if (!sendRes || !sendRes.accepted || sendRes.accepted.length === 0) {
    throw new ApiError(500, 'Failed to send password reset email');
  }

  // Return success response
  return res
    .status(200)
    .json(new ApiResponse(200, 'Password reset email sent successfully', {}));
});

const forgotPasswordTokenVerify = asyncHandler(async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (!token) throw new ApiError(400, 'Reset token is required');
  if (!newPassword || !confirmPassword)
    throw new ApiError(400, 'Both password fields are required');
  if (newPassword !== confirmPassword)
    throw new ApiError(400, 'Passwords do not match');
  if (newPassword.length < 8 || newPassword.length > 16)
    throw new ApiError(400, 'Password must be between 8 and 16 characters');

  // Hash the token for DB comparison
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find the token document
  const tokenDoc = await ForgotPassword.findOne({ forgotToken: hashedToken });
  if (!tokenDoc) throw new ApiError(400, 'Invalid or expired token');
  if (tokenDoc.tokenExpiry < new Date())
    throw new ApiError(400, 'Token has expired');

  // Find the user associated with the token
  const user = await User.findById(tokenDoc.userId);
  if (!user) throw new ApiError(404, 'User not found');

  // Update user password
  user.password = newPassword; // Make sure password is hashed in pre-save hook
  await user.save();

  // Delete token after successful reset
  await ForgotPassword.deleteOne({ _id: tokenDoc._id });

  res.status(200).json({ message: 'Password reset successfully' });
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

const getUserProfile = asyncHandler(async (req, res) => {
  // Validate username parameter
  const { userName } = req.params;

  if (!userName) {
    throw new ApiError(400, 'Username is required');
  }

  // Aggregate user profile with subscription data
  const userProfile = await User.aggregate([
    // Match user by normalized username
    {
      $match: {
        userName: userName.toLowerCase(),
      },
    },
    // Fetch subscribers of the user
    {
      $lookup: {
        from: 'subscriptions',
        localField: '_id',
        foreignField: 'channel',
        as: 'subscribers',
      },
    },
    // Fetch channels the user is subscribed to
    {
      $lookup: {
        from: 'subscriptions',
        localField: '_id',
        foreignField: 'subscriber',
        as: 'subscribedTo',
      },
    },
    // Compute subscription counts and current user subscription status
    {
      $addFields: {
        subscriberCount: {
          $size: '$subscribers',
        },
        subscribedCount: {
          $size: '$subscribedTo',
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.user?._id, '$subscribers.subscriber'],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    // Select only public profile fields
    {
      $project: {
        fullName: 1,
        userName: 1,
        coverImage: 1,
        avatar: 1,
        subscriberCount: 1,
        subscribedCount: 1,
        isSubscribed: 1,
      },
    },
  ]);

  // Handle user not found
  if (!userProfile.length) {
    throw new ApiError(404, 'User profile not found');
  }

  // Send successful response
  return res.status(200).json(
    new ApiResponse(200, 'User profile fetched successfully', {
      profile: userProfile[0],
    })
  );
});

const subscribeUser = asyncHandler(async (req, res) => {
  const subscriberId = req.user._id;
  const { userSubscribeToUserName } = req.body;

  // 1. Get channel user ID from username
  const channelUser = await User.findOne(
    { userName: userSubscribeToUserName },
    { _id: 1 }
  );

  if (!channelUser) {
    return res.status(404).json(new ApiResponse(404, 'User not found'));
  }

  if (subscriberId.equals(channelUser._id)) {
    return res
      .status(400)
      .json(new ApiResponse(400, 'You cannot subscribe to yourself'));
  }

  // 2. Toggle subscription
  const deleted = await Subscription.findOneAndDelete({
    subscriber: subscriberId,
    channel: channelUser._id,
  });

  if (deleted) {
    return res.status(200).json(
      new ApiResponse(200, 'Unsubscribed successfully', {
        subscribed: false,
      })
    );
  }

  const subscribed = await Subscription.create({
    subscriber: subscriberId,
    channel: channelUser._id,
  });

  return res.status(201).json(
    new ApiResponse(201, 'Subscribed successfully', {
      subscribed: true,
      data: subscribed,
    })
  );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: 'videos',
        localField: 'watchHistory',
        foreignField: '_id',
        as: 'watchHistory',
        pipeline: [
          {
            $lookup: {
              from: 'users',
              localField: 'owner',
              foreignField: '_id',
              as: 'owner',
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    avatar: 1,
                    userName: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: '$owner',
              },
            },
          },
        ],
      },
    },
  ]);
  return res
    .status(200)
    .json(new ApiError(200, 'Watch History Fetch', user[0].watchHistory));
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
  forgotPasswordTokenVerify,
  getUserProfile,
  subscribeUser,
  getWatchHistory,
};
