import { Router } from 'express';
import { loginUser, logout, registerUser } from '../controllers/user.controller.js';
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

router.route("/login").post(loginUser);

//verifyJwt for verify user
router.route("/logout").post(verifyJwt,logout);

export default router;
