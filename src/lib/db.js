import mongoose from "mongoose"

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL)
        console.log("Connected to MongoDB Successfully")
    } catch (error) {
        console.log("Error connecting to MongoDB", error)
    }
}

