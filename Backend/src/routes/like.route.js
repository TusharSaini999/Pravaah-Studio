import { Router } from 'express';
import { verifyJwt } from '../middlewares/auth.middleware';
import {
  addLikeOnTweet,
  addLikeOnVideo,
  addLikeOnComment,
  getLikeVideo,
} from '../controllers/like.controller';

const router = Router();

router.use(verifyJwt);

router.route('/addLikeOnVideo/:videoId').post(addLikeOnVideo);
router.route('/addLikeOnTweet/:TweetId').post(addLikeOnTweet);
router.route('/addLikeOnComment/:CommentId').post(addLikeOnComment);
router.route('/getLikedVideo').get(getLikeVideo);

export default router;
