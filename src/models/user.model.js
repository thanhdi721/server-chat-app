import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    password: { type: String, required: true },
    profilePic: { type: String, default: "" }, // Changed to match the rest of the code
}, { timestamps: true })

const User = mongoose.model("User", userSchema)

export default User