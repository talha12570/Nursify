const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'nursify_uploads', // Folder name in Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg', 'heic', 'heif', 'pdf', 'doc', 'docx'],
    resource_type: 'auto', // Automatically detect resource type
    transformation: [{ width: 1000, quality: 'auto' }], // Optional: resize images
  },
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

module.exports = upload;
