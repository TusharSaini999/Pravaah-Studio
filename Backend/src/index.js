import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { app } from './app.js';
import connectDB from './db/connectDB.js';

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log('Server Start to Post:', `${process.env.PORT || 8000}`);
    });
    app.on('error', (err) => {
      console.error('Server Error:', err.message);
      process.exit(1);
    });
  })
  .catch((err) => {
    console.log('MongoDB Connection Fail so App not Listen', err.message);
  });
