import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

export const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGO_URI}/${DB_NAME}`,
    );
    console.log(
      `MongoDB connected Succefully: ${connectionInstance.connection.host}`,
    );
  } catch (error) {
    console.log("There is Error While Connecting DB:", error);
    process.exit(1);
  }
};
