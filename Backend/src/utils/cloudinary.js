import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';


const fileUpload = async (localFilePath) => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  try {
    if (!localFilePath) {
      throw new Error('File not found');
    }

    const uploadRes = await cloudinary.uploader.upload(localFilePath, {
      folder: 'Pravaah',
      resource_type: 'auto',
    });

    fs.unlinkSync(localFilePath);

    return uploadRes;
  } catch (error) {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    console.error('Cloudinary Upload Error:', error);
    return null;
  }
};

export default fileUpload;
