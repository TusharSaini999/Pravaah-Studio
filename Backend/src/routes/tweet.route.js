import Router from 'express';
import { verifyJwt } from '../middlewares/auth.middleware.js';
import {
  createTweet,
  getAllTweetbyUser,
  updateTweet,
  deleteTweet,
} from '../controllers/tweet.controller.js';

const router = Router();

router.use(verifyJwt);

router.route('/createTweet').post(createTweet);
router.route('/getAllTweetbyUser').get(getAllTweetbyUser);
router.route('/updateTweet').patch(updateTweet);
router.route('/deleteTweet').delete(deleteTweet);

export default router;
