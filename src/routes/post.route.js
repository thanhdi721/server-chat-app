import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
  getAllPosts, 
  getPostById, 
  createPost, 
  updatePost, 
  deletePost,
  likePost,
  unlikePost,
  getLikedPosts,
  checkIfLiked
} from "../controllers/post.controller.js";

const router = express.Router();

// Public routes
router.get("/", getAllPosts);
router.get("/:id", getPostById);

// Protected routes
router.post("/", protectRoute, createPost);
router.put("/:id", protectRoute, updatePost);
router.delete("/:id", protectRoute, deletePost);

// Like functionality
router.post("/like/:id", protectRoute, likePost);
router.post("/unlike/:id", protectRoute, unlikePost);
router.get("/liked/me", protectRoute, getLikedPosts);
router.get("/check-like/:id", protectRoute, checkIfLiked);

export default router;