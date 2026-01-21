import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import fileUpload from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/apiResponse.js';

const genrateAccousAndRefreshToken = async (userId) => {
  try {
    const userData = await User.findById(userId);
    const accousToken = userData.generateAccessToken();
    const refreshToken = userData.generateRefreshToken();
    userData.refreshToken = refreshToken;
    await userData.save({ validateBeforeSave: false });
    return { accousToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, 'Internal Server Error');
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // Get user data
  let { fullName, email, userName, password } = req.body;

  // Trim user data
  fullName = fullName?.trim();
  email = email?.trim();
  userName = userName?.trim();
  password = password?.trim();

  // Validation: empty check
  const requiredFields = { fullName, email, userName, password };

  for (const [field, value] of Object.entries(requiredFields)) {
    if (!value || value === '') {
      throw new ApiError(400, `${field} is required.`);
    }
  }

  // Validation: existing user
  const existingUser = await User.findOne({
    $or: [{ email }, { userName }],
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new ApiError(409, 'Email is already registered.');
    }
    if (existingUser.userName === userName) {
      throw new ApiError(409, 'Username is already taken.');
    }
  }

  // Get uploaded files
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  // Validate avatar image
  if (!avatarLocalPath) {
    throw new ApiError(400, 'Avatar image is required.');
  }

  //Upload the Image to Cloudinary
  const avatarCloud = await fileUpload(avatarLocalPath);
  let coverImageCloud;
  if (coverImageLocalPath) {
    coverImageCloud = await fileUpload(coverImageLocalPath);
  }

  //Validate Image Upload
  if (!avatarCloud) {
    throw new ApiError(400, 'Error to Upload Image');
  }
  //Send Data to Databases
  const user = await User.create({
    fullName,
    avatar: avatarCloud.url,
    coverImage: coverImageCloud?.url || '',
    email,
    userName: userName.toLowerCase(),
    password,
  });

  //Check User Created or Not
  const createdUser = await User.findById(user._id).select(
    '-password -refreshToken'
  );

  if (!createdUser) {
    throw new ApiError(500, 'Something went wrong while registring the user');
  }

  //Response to User
  return res
    .status(201)
    .json(new ApiResponse(200, 'User Created', createdUser));
});

const loginUser = asyncHandler(async (req, res) => {
  // Step 1: Extract username, email, and password from request body
  let { userName, email, password } = req.body;

  // Step 2: Trim whitespace from input values
  userName = userName?.trim();
  email = email?.trim();
  password = password?.trim();

  // Step 3: Ensure either username or email is provided
  if (!userName && !email) {
    throw new ApiError(400, 'Any one is Need to Login UserName / Email');
  }

  // Step 4: Ensure password is provided
  if (!password) {
    throw new ApiError(400, 'Password is Need to Login');
  }

  // Step 5: Find the user by email or username
  const userData = await User.findOne({
    $or: [{ email }, { userName }],
  });

  // Step 6: If user does not exist, throw an error
  if (!userData) {
    throw new ApiError(404, 'User does not Registered');
  }

  // Step 7: Verify the entered password with stored hashed password
  const flag = await userData.isPasswordCorrect(password);

  // Step 8: If password is incorrect, deny access
  if (!flag) {
    throw new ApiError(403, 'Password is Incorret');
  }

  // Step 9: Generate access token and refresh token
  const { accousToken, refreshToken } = await genrateAccousAndRefreshToken(
    userData._id
  );

  // Step 10: Define cookie options for security
  const option = {
    httpOnly: true,
    secure: true,
  };

  // Step 11: Fetch user data again without sensitive fields
  const safeData = await User.findById(userData._id).select(
    '-password -refreshToken'
  );

  // Step 12: Send successful login response with cookies and user data
  return res
    .status(200)
    .cookie('accousToken', accousToken, option)
    .cookie('refreshToken', refreshToken, option)
    .json(
      new ApiResponse(200, 'User Login', {
        userData: safeData,
        accousToken,
        refreshToken,
      })
    );
});

const logout = asyncHandler(async (req, res) => {
  //Get the user which is Add by middelware
  const user = req.user;
  //Get the userId
  const id = user?._id;


  //Find User and Update the RefreshToken
  const DBres = await User.findByIdAndUpdate(
    id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  //Error for the db error
  if (!DBres) {
    throw new ApiError(500, 'Server Error');
  }
  //Clear the Cookie
  const option = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  };

  res
    .status(200)
    .clearCookie('accousToken', option)
    .clearCookie('refreshToken', option)
    .json(new ApiResponse(200, 'User Logout', {}));
});

export { registerUser, loginUser,logout };
