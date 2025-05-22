import Comment from "../models/comment.model.js";
import Post from "../models/post.message.model.js";
import mongoose from "mongoose";
import User from "../models/user.model.js";
// Hàm format thời gian giống như trong post.controller.js
function formatTimestamp(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return "Vừa đăng";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} phút trước`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} giờ trước`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ngày trước`;
  } else {
    // Format as a date
    return new Date(date).toLocaleDateString("vi-VN");
  }
}

// Get all comments for a post
export const getCommentsByPostId = async (req, res) => {
  try {
    const { postId } = req.params;
    const { parentId } = req.query; // Optional query parameter for getting replies
    
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid post ID format" });
    }
    
    // Check if user is authenticated (optional)
    const currentUserId = req.user ? req.user._id : null;
    
    // Prepare query - get top-level comments if parentId is not provided
    const query = { 
      postId,
      parentComment: parentId || null // If parentId provided, get replies, otherwise get top-level comments
    };
    
    const comments = await Comment.find(query)
      .sort({ createdAt: -1 })
      .populate("author", "-password");
    
    // Format comments for response
    const formattedComments = comments.map(comment => {
      // Check if current user has liked this comment
      const isLiked = currentUserId ? 
        comment.likedBy.some(id => id.toString() === currentUserId.toString()) : 
        false;
      
      return {
        id: comment._id,
        postId: comment.postId,
        author: comment.author,
        content: comment.content,
        likes: comment.likes,
        timestamp: formatTimestamp(comment.createdAt),
        parentComment: comment.parentComment,
        replyCount: comment.replyCount,
        isLiked
      };
    });
    
    res.status(200).json(formattedComments);
  } catch (error) {
    console.error("Error in getCommentsByPostId controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create a new comment
export const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;
    const author = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid post ID format" });
    }
    
    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "Comment content is required" });
    }
    
    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    // If this is a reply, check if parent comment exists
    if (parentCommentId) {
      if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
        return res.status(400).json({ message: "Invalid parent comment ID format" });
      }
      
      const parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({ message: "Parent comment not found" });
      }
      
      // Increment reply count on parent comment
      await Comment.findByIdAndUpdate(parentCommentId, { $inc: { replyCount: 1 } });
    }
    
    // Create new comment
    const newComment = new Comment({
      postId,
      author,
      content,
      parentComment: parentCommentId || null
    });
    
    await newComment.save();
    
    // Increment comments count on the post
    await Post.findByIdAndUpdate(postId, { $inc: { comments: 1 } });
    
    // Get the newly created comment with author details
    const populatedComment = await Comment.findById(newComment._id)
      .populate("author", "-password");
    
    // Format for response
    const formattedComment = {
      id: populatedComment._id,
      postId: populatedComment.postId,
      author: populatedComment.author,
      content: populatedComment.content,
      likes: 0,
      timestamp: "Vừa đăng",
      parentComment: populatedComment.parentComment,
      replyCount: 0,
      isLiked: false
    };
    
    res.status(201).json(formattedComment);
  } catch (error) {
    console.error("Error in createComment controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update a comment
export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Invalid comment ID format" });
    }
    
    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "Comment content is required" });
    }
    
    // Check if comment exists
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }
    
    // Check if user is the author of the comment
    if (comment.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to update this comment" });
    }
    
    // Update comment
    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { content },
      { new: true }
    ).populate("author", "-password");
    
    // Check if current user has liked this comment
    const isLiked = updatedComment.likedBy.some(id => id.toString() === userId.toString());
    
    // Format for response
    const formattedComment = {
      id: updatedComment._id,
      postId: updatedComment.postId,
      author: updatedComment.author,
      content: updatedComment.content,
      likes: updatedComment.likes,
      timestamp: formatTimestamp(updatedComment.createdAt),
      parentComment: updatedComment.parentComment,
      replyCount: updatedComment.replyCount,
      isLiked
    };
    
    res.status(200).json(formattedComment);
  } catch (error) {
    console.error("Error in updateComment controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete a comment
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Invalid comment ID format" });
    }
    
    // Check if comment exists
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }
    
    // Check if user is the author of the comment
    if (comment.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this comment" });
    }
    
    // If this is a parent comment, delete all replies
    const repliesDeleted = await Comment.deleteMany({ parentComment: commentId });
    
    // Delete the comment
    await Comment.findByIdAndDelete(commentId);
    
    // Decrement comments count on the post (including replies that were deleted)
    await Post.findByIdAndUpdate(
      comment.postId, 
      { $inc: { comments: -1 - repliesDeleted.deletedCount } }
    );
    
    // If this was a reply, decrement reply count on parent comment
    if (comment.parentComment) {
      await Comment.findByIdAndUpdate(
        comment.parentComment, 
        { $inc: { replyCount: -1 } }
      );
    }
    
    res.status(200).json({ 
      message: "Comment deleted successfully",
      deletedCount: 1 + repliesDeleted.deletedCount
    });
  } catch (error) {
    console.error("Error in deleteComment controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Like a comment
export const likeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Invalid comment ID format" });
    }
    
    // Check if comment exists
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }
    
    // Check if user already liked the comment
    const alreadyLiked = comment.likedBy.some(id => id.toString() === userId.toString());
    if (alreadyLiked) {
      return res.status(400).json({ 
        message: "Comment already liked",
        isLiked: true,
        id: comment._id,
        likes: comment.likes
      });
    }
    
    // Add user to likedBy array and increment likes count
    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { 
        $addToSet: { likedBy: userId },
        $inc: { likes: 1 }
      },
      { new: true }
    );
    
    res.status(200).json({
      id: updatedComment._id,
      likes: updatedComment.likes,
      isLiked: true
    });
  } catch (error) {
    console.error("Error in likeComment controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Unlike a comment
export const unlikeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Invalid comment ID format" });
    }
    
    // Check if comment exists
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }
    
    // Check if user has liked the comment
    const hasLiked = comment.likedBy.some(id => id.toString() === userId.toString());
    if (!hasLiked) {
      return res.status(400).json({ 
        message: "Comment not liked yet",
        isLiked: false,
        id: comment._id,
        likes: comment.likes
      });
    }
    
    // Remove user from likedBy array and decrement likes count
    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { 
        $pull: { likedBy: userId },
        $inc: { likes: -1 }
      },
      { new: true }
    );
    
    res.status(200).json({
      id: updatedComment._id,
      likes: updatedComment.likes,
      isLiked: false
    });
  } catch (error) {
    console.error("Error in unlikeComment controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get comment count for a post
export const getCommentCount = async (req, res) => {
  try {
    const { postId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid post ID format" });
    }
    
    const count = await Comment.countDocuments({ postId });
    
    res.status(200).json({ count });
  } catch (error) {
    console.error("Error in getCommentCount controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const getCommentReplies = async (req, res) => {
    try {
      const { commentId } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(commentId)) {
        return res.status(400).json({ message: "Invalid comment ID format" });
      }
      
      // Check if user is authenticated (optional)
      const currentUserId = req.user ? req.user._id : null;
      
      // Check if the comment exists
      const parentComment = await Comment.findById(commentId);
      if (!parentComment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      // Get all replies for this comment
      const replies = await Comment.find({ parentComment: commentId })
        .sort({ createdAt: -1 })
        .populate("author", "-password");
      
      // Format replies for response
      const formattedReplies = replies.map(reply => {
        // Check if current user has liked this reply
        const isLiked = currentUserId ? 
          reply.likedBy.some(id => id.toString() === currentUserId.toString()) : 
          false;
        
        return {
          id: reply._id,
          postId: reply.postId,
          author: reply.author,
          content: reply.content,
          likes: reply.likes,
          timestamp: formatTimestamp(reply.createdAt),
          parentComment: reply.parentComment,
          replyCount: reply.replyCount,
          isLiked
        };
      });
      
      // Get some information about the parent comment
      const parentInfo = {
        id: parentComment._id,
        author: await User.findById(parentComment.author).select("-password"),
        content: parentComment.content,
        timestamp: formatTimestamp(parentComment.createdAt),
        replyCount: parentComment.replyCount
      };
      
      res.status(200).json({
        parentComment: parentInfo, 
        replies: formattedReplies
      });
    } catch (error) {
      console.error("Error in getCommentReplies controller:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
  
  // Get detailed comment information including author details
  export const getCommentDetail = async (req, res) => {
    try {
      const { commentId } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(commentId)) {
        return res.status(400).json({ message: "Invalid comment ID format" });
      }
      
      // Check if user is authenticated (optional)
      const currentUserId = req.user ? req.user._id : null;
      
      // Get comment with author details
      const comment = await Comment.findById(commentId)
        .populate("author", "-password");
      
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      // Check if parent comment exists and get its details
      let parentCommentDetails = null;
      if (comment.parentComment) {
        const parentComment = await Comment.findById(comment.parentComment)
          .populate("author", "-password");
        
        if (parentComment) {
          parentCommentDetails = {
            id: parentComment._id,
            author: parentComment.author,
            content: parentComment.content,
            timestamp: formatTimestamp(parentComment.createdAt)
          };
        }
      }
      
      // Check if current user has liked this comment
      const isLiked = currentUserId ? 
        comment.likedBy.some(id => id.toString() === currentUserId.toString()) : 
        false;
      
      // Format for response
      const formattedComment = {
        id: comment._id,
        postId: comment.postId,
        author: comment.author,
        content: comment.content,
        likes: comment.likes,
        timestamp: formatTimestamp(comment.createdAt),
        parentComment: comment.parentComment,
        parentCommentDetails: parentCommentDetails,
        replyCount: comment.replyCount,
        isLiked
      };
      
      res.status(200).json(formattedComment);
    } catch (error) {
      console.error("Error in getCommentDetail controller:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

// Check if a comment is liked by the current user
export const checkCommentLiked = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Invalid comment ID format" });
    }
    
    // Check if comment exists
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }
    
    // Check if user has liked the comment
    const isLiked = comment.likedBy.some(id => id.toString() === userId.toString());
    
    // Get user details who liked the comment
    const likedByUsers = await User.find(
      { _id: { $in: comment.likedBy } },
      { _id: 1, username: 1, avatar: 1 }
    );
    
    res.status(200).json({
      id: comment._id,
      isLiked,
      likes: comment.likes,
      likedByUsers: likedByUsers.map(user => ({
        id: user._id,
        username: user.username,
        avatar: user.avatar
      }))
    });
  } catch (error) {
    console.error("Error in checkCommentLiked controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};