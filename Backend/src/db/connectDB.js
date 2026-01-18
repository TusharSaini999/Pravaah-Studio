import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';
async function connectDB() {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    if (connectionInstance) {
      console.log(
        `DB connected successfully!!`
      );
    }
  } catch (error) {
    console.log('DB Connection Fail: ', error);
    throw error;
  }
}

export default connectDB;
