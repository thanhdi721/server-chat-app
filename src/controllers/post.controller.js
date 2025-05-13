import Post from "../models/post.message.model.js";
import cloudinary from "../lib/cloudinary.js";
import mongoose from "mongoose";

// Get all posts
export const getAllPosts = async (req, res) => {
  try {
    // Lấy thông tin người dùng hiện tại (nếu đã đăng nhập)
    const currentUserId = req.user ? req.user._id : null;
    
    // Lấy tất cả bài viết và populate thông tin tác giả
    const posts = await Post.find()
      .sort({ createdAt: -1 }) // Mới nhất trước
      .populate("author", "-password");
    
    // Biến đổi dữ liệu để phù hợp với định dạng mẫu
    const formattedPosts = posts.map(post => {
      // Kiểm tra xem người dùng hiện tại đã like bài viết này chưa
      // Chỉ khi người dùng đã đăng nhập và ID của họ có trong mảng likedBy
      const isLiked = currentUserId ? 
        post.likedBy.some(likedById => likedById.toString() === currentUserId.toString()) : 
        false;
      
      return {
        id: post._id,
        author: post.author,
        timestamp: formatTimestamp(post.createdAt),
        content: post.content,
        likes: post.likes,
        comments: post.comments,
        images: post.images,
        isLiked: isLiked // Thêm thông tin về việc người dùng hiện tại đã like bài viết này chưa
      };
    });
    
    res.status(200).json(formattedPosts);
  } catch (error) {
    console.error("Error in getAllPosts controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get a specific post by ID
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    // Lấy thông tin người dùng hiện tại (nếu đã đăng nhập)
    const currentUserId = req.user ? req.user._id : null;
    
    const post = await Post.findById(id)
      .populate("author", "-password");
    
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    // Kiểm tra xem người dùng hiện tại đã like bài viết này chưa
    const isLiked = currentUserId ? 
      post.likedBy.some(likedById => likedById.toString() === currentUserId.toString()) : 
      false;
    
   
    
    // Định dạng bài viết để phù hợp với mẫu
    const formattedPost = {
      id: post._id,
      author: post.author,
      timestamp: formatTimestamp(post.createdAt),
      content: post.content,
      likes: post.likes,
      comments: post.comments,
      images: post.images,
      isLiked: isLiked // Thêm thông tin về việc người dùng hiện tại đã like bài viết này chưa
    };
    
    res.status(200).json(formattedPost);
  } catch (error) {
    console.error("Error in getPostById controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create new post
export const createPost = async (req, res) => {
  try {
    const { content, images } = req.body;
    
    // Check if user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated properly" });
    }
    
    const author = req.user;
    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    // Process images if any
    const processedImages = [];
    if (images && Array.isArray(images) && images.length > 0) {
      // Upload each image to Cloudinary
      for (const image of images) {
        try {
          if (image && image.src) {
            if (image.src.startsWith('data:image')) {
              // It's a base64 image, upload it
              const uploadResponse = await cloudinary.uploader.upload(image.src);
              processedImages.push({
                src: uploadResponse.secure_url,
                alt: image.alt || ""
              });
            } else {
              // It's already a URL, just use it
              processedImages.push({
                src: image.src,
                alt: image.alt || ""
              });
            }
          }
        } catch (imageError) {
          console.error("Error processing image:", imageError);
          // Continue with other images if one fails
        }
      }
    }

    const newPost = new Post({
      author,
      content,
      images: processedImages
    });

    const savedPost = await newPost.save();

    // Format for response
    const formattedPost = {
      id: savedPost._id,
      author: {
        ...req.user.toObject(),
        password: undefined
      },
      timestamp: "Vừa đăng",
      content: savedPost.content,
      likes: 0,
      comments: 0,
      images: savedPost.images,
      isLiked: false // New post, not liked yet
    };

    res.status(201).json(formattedPost);
  } catch (error) {
    console.error("Error in createPost controller:", error);
    res.status(500).json({ error: "Internal server error", details: error.toString() });
  }
};

// Update a post
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, images } = req.body;
    
    // Check if post exists and belongs to user
    const post = await Post.findById(id);
    
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    // Verify ownership (post author is the logged-in user)
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this post" });
    }

    // Process new images if any
    const processedImages = [];
    if (images && images.length > 0) {
      // Upload each new image to Cloudinary
      for (const image of images) {
        if (image.src && image.src.startsWith('data:image')) {
          // It's a base64 image, upload it
          const uploadResponse = await cloudinary.uploader.upload(image.src);
          processedImages.push({
            src: uploadResponse.secure_url,
            alt: image.alt || ""
          });
        } else if (image.src) {
          // It's already a URL, just use it
          processedImages.push({
            src: image.src,
            alt: image.alt || ""
          });
        }
      }
    }

    // Update the post
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      { 
        content: content || post.content,
        images: images ? processedImages : post.images,
      },
      { new: true }
    ).populate("author", "-password");

    // Check if the current user has liked this post
    const isLiked = updatedPost.likedBy.some(id => id.toString() === req.user._id.toString());

    // Format for response
    const formattedPost = {
      id: updatedPost._id,
      author: updatedPost.author,
      timestamp: formatTimestamp(updatedPost.createdAt),
      content: updatedPost.content,
      likes: updatedPost.likes,
      comments: updatedPost.comments,
      images: updatedPost.images,
      isLiked: isLiked
    };

    res.status(200).json(formattedPost);
  } catch (error) {
    console.error("Error in updatePost controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete a post
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if post exists and belongs to user
    const post = await Post.findById(id);
    
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    // Verify ownership (post author is the logged-in user)
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this post" });
    }

    // Delete post
    await Post.findByIdAndDelete(id);
    
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error in deletePost controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Like a post
export const likePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    // Validate the post ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID format" });
    }

    const post = await Post.findById(id);
    
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    // Check if user already liked the post - convert ObjectIds to strings for comparison
    const alreadyLiked = post.likedBy.some(id => id.toString() === userId.toString());
    
    if (alreadyLiked) {
      return res.status(400).json({ 
        message: "Post already liked", 
        isLiked: true,
        id: post._id,
        likes: post.likes
      });
    }
    
    // Add user to likedBy array and increment likes count
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      { 
        $addToSet: { likedBy: userId },
        $inc: { likes: 1 }
      },
      { new: true }
    );
    
    // Check if update was successful
    if (!updatedPost) {
      return res.status(500).json({ message: "Failed to update post" });
    }
    

    
    res.status(200).json({ 
      id: updatedPost._id,
      likes: updatedPost.likes,
      isLiked: true
    });
  } catch (error) {
    console.error("Error in likePost controller: ", error);
    res.status(500).json({ error: "Internal server error", details: error.toString() });
  }
};

// Unlike a post
export const unlikePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    // Validate the post ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID format" });
    }
    
    const post = await Post.findById(id);
    
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    // Check if user has liked the post - convert ObjectIds to strings
    const hasLiked = post.likedBy.some(id => id.toString() === userId.toString());
    
    if (!hasLiked) {
      return res.status(400).json({ 
        message: "Post not liked yet", 
        isLiked: false,
        id: post._id,
        likes: post.likes
      });
    }
    
    // Remove user from likedBy array and decrement likes count
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      { 
        $pull: { likedBy: userId },
        $inc: { likes: -1 }
      },
      { new: true }
    );
    
    // Check if update was successful
    if (!updatedPost) {
      return res.status(500).json({ message: "Failed to update post" });
    }
    res.status(200).json({ 
      id: updatedPost._id,
      likes: updatedPost.likes,
      isLiked: false
    });
  } catch (error) {
    console.error("Error in unlikePost controller: ", error);
    res.status(500).json({ error: "Internal server error", details: error.toString() });
  }
};

// Get all posts liked by the current user
export const getLikedPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const likedPosts = await Post.find({ likedBy: userId })
      .sort({ createdAt: -1 })
      .populate("author", "-password");
    
    // Transform the data to match the example format
    const formattedPosts = likedPosts.map(post => ({
      id: post._id,
      author: post.author,
      timestamp: formatTimestamp(post.createdAt),
      content: post.content,
      likes: post.likes,
      comments: post.comments,
      images: post.images,
      isLiked: true // All posts in this list are liked by the user
    }));
    
    res.status(200).json(formattedPosts);
  } catch (error) {
    console.error("Error in getLikedPosts controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Check if user has liked a specific post
export const checkIfLiked = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID format" });
    }
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    const isLiked = post.likedBy.some(likedById => likedById.toString() === userId.toString());
    
    res.status(200).json({ isLiked });
  } catch (error) {
    console.error("Error in checkIfLiked controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Helper function to format timestamps
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