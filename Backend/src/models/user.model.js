import mongoose, { Schema } from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
const userSchema = new Schema(
  {
    userName: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [20, 'Username cannot exceed 20 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
        'Please enter a valid email address',
      ],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
    },

    refreshToken: {
      type: String,
      default: null,
    },

    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      index: true,
      minlength: [3, 'Full name must be at least 3 characters long'],
    },

    avatar: {
      type: String,
      required: [true, 'Avatar image is required'],
    },

    coverImage: {
      type: String,
      default: '',
    },

    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Video',
        required: [true, 'Watch history reference is required'],
      },
    ],
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCheck=async function (password) {
    return await bcrypt.compare(password,this.password)
}

userSchema.methods.genrateAccessToken=function (){
    return jwt.sign(
        {
            _id:this._id,
            email:this.email,
            userName:this.userName,
            fullName:this.fullName,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.method.genrateRefreshToken=function(){
    return jwt.sign(
        {
            _id:this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

userSchema.plugin(uniqueValidator, {
  message: '{PATH} already exists.',
});

export const User = mongoose.model('User', userSchema);
