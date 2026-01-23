import { Router } from 'express';
import {
  loginUser,
  logout,
  registerUser,
  accessTokenGenerator,
  changeCurrentUserPassword,
  updateAccountDetails,
  getCurrentUser,
  updateUserProfilePicture,
  forgotPasswordReqSend,
  forgotPasswordTokenVerify,
} from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJwt } from '../middlewares/auth.middleware.js';

const router = Router();

router.route('/register').post(
  upload.fields([
    {
      name: 'avatar',
      maxCount: 1,
    },
    {
      name: 'coverImage',
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route('/login').post(loginUser);

//verifyJwt for verify user
router.route('/logout').post(verifyJwt, logout);

router.route('/accessTokenGenrater').post(accessTokenGenerator);

router.route('/changePassword').post(verifyJwt, changeCurrentUserPassword);

router.route('/forgotPasswordSendReq').post(forgotPasswordReqSend);

router.route('/forgotPasswordTokenVerify').post(forgotPasswordTokenVerify);

router.route('/updateAccountDetails').post(verifyJwt, updateAccountDetails);

router.route('/getCurrentUser').post(verifyJwt, getCurrentUser);

router.route('/updateProfilePicture').post(
  verifyJwt,
  upload.fields([
    {
      name: 'avatar',
      maxCount: 1,
    },
    {
      name: 'coverImage',
      maxCount: 1,
    },
  ]),
  updateUserProfilePicture
);


export default router;
