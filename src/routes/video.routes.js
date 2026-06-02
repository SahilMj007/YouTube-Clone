import express from "express";
import { getAllVideos, publishVideo } from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middlerware.js";
import { verifyJwt } from "../middlewares/auth.middileware.js";
const videoRouter = express.Router();

videoRouter.post(
  "/upload/video",
  verifyJwt,
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  publishVideo,
);

videoRouter.post("/getAllVideos", verifyJwt, getAllVideos);

export default videoRouter;
