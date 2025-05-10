import Post from "../models/post.message.model.js";
import cloudinary from "../lib/cloudinary.js";

// Get all posts
export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 }) // Most recent first
      .populate("author", "-password");

    // Transform the data to match the example format
    const formattedPosts = posts.map(post => ({
      id: post._id,
      author: post.author,
      timestamp: formatTimestamp(post.createdAt),
      content: post.content,
      likes: post.likes,
      comments: post.comments,
      images: post.images
    }));

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
    const post = await Post.findById(id)
      .populate("author", "-password");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Format post to match example
    const formattedPost = {
      id: post._id,
      author: post.author,
      timestamp: formatTimestamp(post.createdAt),
      content: post.content,
      likes: post.likes,
      comments: post.comments,
      images: post.images
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
    console.log("Saved post:", savedPost);

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
      images: savedPost.images
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

    // Format for response
    const formattedPost = {
      id: updatedPost._id,
      author: updatedPost.author,
      timestamp: formatTimestamp(updatedPost.createdAt),
      content: updatedPost.content,
      likes: updatedPost.likes,
      comments: updatedPost.comments,
      images: updatedPost.images
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