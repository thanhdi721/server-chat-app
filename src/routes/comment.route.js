import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
  getCommentsByPostId,
  createComment,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
  getCommentCount,
  getCommentReplies,
  getCommentDetail,
  checkCommentLiked
} from "../controllers/comment.controllers.js";

const router = express.Router();

// Get comments for a post (public route)
router.get("/post/:postId", getCommentsByPostId);

// Get comment count for a post (public route)
router.get("/count/:postId", getCommentCount);

// Protected routes
router.post("/post/:postId", protectRoute, createComment);
router.put("/:commentId", protectRoute, updateComment);
router.delete("/:commentId", protectRoute, deleteComment);

// Get all replies for a specific comment (public route)
router.get("/replies/:commentId", getCommentReplies);

// Get detailed info for a specific comment (public route)
router.get("/detail/:commentId", getCommentDetail);

// Like functionality
router.post("/like/:commentId", protectRoute, likeComment);
router.post("/unlike/:commentId", protectRoute, unlikeComment);
router.get("/check-like/:commentId", protectRoute, checkCommentLiked);

export default router;