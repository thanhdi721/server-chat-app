import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
  src: { type: String, required: true },
  alt: { type: String, default: "" }
});

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    likes: {
      type: Number,
      default: 0,
    },
    // Thêm mảng likedBy để lưu danh sách người đã thích bài viết
    likedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    comments: {
      type: Number,
      default: 0,
    },
    images: {
      type: [imageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Add an index for better performance
postSchema.index({ createdAt: -1 });
postSchema.index({ author: 1 });

const Post = mongoose.model("Post", postSchema);

export default Post;