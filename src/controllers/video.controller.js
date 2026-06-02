import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiErrors.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Video } from "../models/video.model.js";
import ApiResponse from "../utils/ApiResponse.js";

export const publishVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title || !description) {
    throw new ApiError(409, "Title Or Description Both are Required");
  }
  const videoLocalPath = req.files?.video?.[0]?.path;
  if (!videoLocalPath) throw new ApiError(409, "Video is Required");

  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
  if (!thumbnailLocalPath) throw new ApiError(409, "Thumbanil is Required");

  const video = await uploadOnCloudinary(videoLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  if (!video || !thumbnail) {
    throw new ApiError(
      404,
      "Failed to upload video or thumbnail to Cloudinary",
    );
  }

  const videoUpload = await Video.create({
    title,
    description,
    videoFile: video?.url,
    thumbnail: thumbnail?.url,
    duration: video?.duration,
    owner: req.user?._id,
  });

  const uploadedVideo = await Video.findById(videoUpload._id);
  if (!uploadedVideo) {
    throw new ApiError(500, "Something Went While Uploading Video");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, uploadedVideo, "Video is uploaded successfully"),
    );
});
