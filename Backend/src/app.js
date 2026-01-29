import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { SIZE_LIMIT, URL_LIMIT } from './constants.js';
const app = express();

app.use(
  cors({
    origin: process.env.CORS_URL,
    optionsSuccessStatus: 200,
  })
);

app.use(
  express.json({
    limit: SIZE_LIMIT,
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: URL_LIMIT,
    parameterLimit: 1000,
  })
);

app.use(express.static('public'));

app.use(cookieParser());

//Routes
import userRouter from './routes/user.route.js';
import videoRouter from './routes/video.route.js';
import tweetRouter from './routes/tweet.route.js';
import commentRoute from './routes/comment.route.js';
import likeRoute from './routes/like.route.js';
import playlistRoute from './routes/playlist.route.js';

//Routes Declaration
app.use('/api/v1/users', userRouter);
app.use('/api/v1/video', videoRouter);
app.use('/api/v1/tweet', tweetRouter);
app.use('/api/v1/comment', commentRoute);
app.use('/api/v1/like', likeRoute);
app.use('/api/vi/playlist', playlistRoute);

export { app };
