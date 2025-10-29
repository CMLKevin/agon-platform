import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../controllers/nftController.js';
import {
  mintNFT,
  getAllNFTs,
  getNFTById,
  getUserNFTs,
  listNFT,
  unlistNFT,
  placeBid,
  cancelBid,
  acceptBid,
  buyNFT,
  likeNFT,
  unlikeNFT,
  getCategories
} from '../controllers/nftController.js';

const router = express.Router();

// Public routes
router.get('/', getAllNFTs);
router.get('/categories', getCategories);
router.get('/:id', getNFTById);
router.get('/user/:userId', getUserNFTs);

// Protected routes - require authentication
router.post('/mint', authenticateToken, upload.single('image'), mintNFT);
router.post('/:id/list', authenticateToken, listNFT);
router.post('/:id/unlist', authenticateToken, unlistNFT);
router.post('/:id/bid', authenticateToken, placeBid);
router.post('/:id/accept-bid', authenticateToken, acceptBid);
router.post('/:id/buy', authenticateToken, buyNFT);
router.post('/:id/like', authenticateToken, likeNFT);
router.delete('/:id/unlike', authenticateToken, unlikeNFT);
router.delete('/bids/:bidId', authenticateToken, cancelBid);

export default router;
