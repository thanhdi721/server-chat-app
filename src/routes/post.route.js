import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
  getAllPosts, 
  getPostById, 
  createPost, 
  updatePost, 
  deletePost 
} from "../controllers/post.controller.js";

const router = express.Router();

// Public routes
router.get("/", getAllPosts);
router.get("/:id", getPostById);

// Protected routes
router.post("/", protectRoute, createPost);
router.put("/:id", protectRoute, updatePost);
router.delete("/:id", protectRoute, deletePost);

export default router;