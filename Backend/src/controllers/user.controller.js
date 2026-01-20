import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import fileUpload from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/apiResponse.js';

const registerUser = asyncHandler(async (req, res) => {
  // Get user data
  let { fullName, email, userName, password } = req.body;
  console.log(fullName, email, userName, password);

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

  console.log(existingUser);

  if (existingUser) {
    if (existingUser.email === email) {
      throw new ApiError(409, 'Email is already registered.');
    }
    if (existingUser.userName === userName) {
      throw new ApiError(409, 'Username is already taken.');
    }
  }

  console.log('This is req.files:', req.files);

  // Get uploaded files
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  // Validate avatar image
  if (!avatarLocalPath) {
    throw new ApiError(400, 'Avatar image is required.');
  }

  //Upload the Image to Cloudinary
  const avatarCloud = await fileUpload(avatarLocalPath);
  const coverImageCloud = await fileUpload(coverImageLocalPath);

  //Validate Image Upload
  if (!avatarCloud) {
    throw new ApiError(400, 'Avatar image is required.');
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
  const createdUser = User.findById(user._id).select('-password -refreshToken');

  if (!createdUser) {
    throw new ApiError(500, 'Something went wrong while registring the user');
  }

  //Response to User
  return res
    .status(201)
    .json(new ApiResponse(200, 'User Created', createdUser));
});

export { registerUser };
