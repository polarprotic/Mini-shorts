const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'reelstream_videos', 
        resource_type: 'video',      // CRITICAL: Tells Cloudinary to expect a video
        allowed_formats: ['mp4', 'mov', 'avi', 'webm']
    }
});

const upload = multer({ storage: storage });
module.exports = upload;