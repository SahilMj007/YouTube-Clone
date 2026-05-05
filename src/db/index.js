import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGO_URI}/${DB_NAME}`,
    );
    console.log("Mongo DB Connected on:", connectionInstance.connection.host);
  } catch (error) {
    console.error("There is Error While Connectinf With DB(in001):", error);
    process.exit(1);
  }
};

export default connectDB;
