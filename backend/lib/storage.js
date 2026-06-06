const path = require('path');
const cloudinary = require('cloudinary').v2;

const hasCloudinaryConfig = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (hasCloudinaryConfig) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

function isCloudStorageEnabled() {
  return hasCloudinaryConfig;
}

async function uploadArtifact(filePath, folder, resourceType = 'auto') {
  if (!hasCloudinaryConfig || !filePath) return null;

  const publicId = `${Date.now()}-${path.basename(filePath, path.extname(filePath))}`;
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    public_id: publicId,
    resource_type: resourceType,
  });

  return {
    provider: 'cloudinary',
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type,
  };
}

module.exports = {
  isCloudStorageEnabled,
  uploadArtifact,
};
