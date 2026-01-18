import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadResult = await cloudinary.uploader
  .upload(
    'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg',
    {
      public_id: 'shoes',
    }
  )
  .catch((error) => {
    console.log(error);
  });

const fileUpload = async (localFilePath) => {
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