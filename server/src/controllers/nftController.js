import db from '../config/database.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'nfts');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'nft-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  },
  fileFilter: fileFilter
});

// Helper function to generate thumbnail
async function generateThumbnail(imagePath) {
  const thumbnailPath = imagePath.replace(/(\.[^.]+)$/, '-thumb$1');
  
  try {
    await sharp(imagePath)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center'
      })
      .toFile(thumbnailPath);
    
    return thumbnailPath;
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    return null;
  }
}

// Export all controller functions
export { mintNFT } from './nftMintController.js';
export { getAllNFTs, getNFTById, getUserNFTs } from './nftQueryController.js';
export { listNFT, unlistNFT } from './nftListingController.js';
export { placeBid, cancelBid, acceptBid, buyNFT } from './nftTradingController.js';
export { likeNFT, unlikeNFT, getCategories } from './nftUtilController.js';
