import mongoose from "mongoose";
export const connectDB = async () => {
    await mongoose.connect(process.env.MONGO_URI as string, { dbName: "blog" });
    console.log("Connected to Mongodb SUCCESSFULLY");
};