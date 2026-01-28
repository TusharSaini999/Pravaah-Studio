import { Router } from 'express';
import { verifyJwt } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/multer.middleware.js';
import {
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
} from '../controllers/video.controller.js';

const router = Router();

router.route('/publishAVideo').post(
  verifyJwt,
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  publishAVideo
);

router.route('/getVideo/:videoId').get(verifyJwt, getVideoById);

router.route('/updateVideo/:videoId').patch(
  verifyJwt,
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  updateVideo
);

router.route('/deleteVideo/:videoId').delete(verifyJwt, deleteVideo);

router
  .route('/togglePublishStatus/:videoId')
  .patch(verifyJwt, togglePublishStatus);

export default router;
