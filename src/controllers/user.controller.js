import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiErrors.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const AccessToken = user.generateAccessToken();
    const RefreshToken = user.generateRefreshToken();
    user.refreshToken = RefreshToken;
    await user.save({ validateBeforeSave: false });
    return { AccessToken, RefreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went Wrong Will Generating Access and Refresh Token",
    );
  }
};

export const registerUser = asyncHandler(async (req, res, next) => {
  const { userName, email, fullName, password } = req.body;
  if (
    [userName, email, fullName, password].some((fields) => {
      return fields?.trim() === "";
    })
  ) {
    throw new ApiError(400, "AllFields are Required");
  }

  const exist = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (exist) {
    throw new ApiError(409, "User Already Registered Please Login");
  }

  const avatarPath = req.files?.avatar[0]?.path;
  //const coverImagePath = req.files?.coverImage[0]?.path;

  let coverImagePath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImagePath = req.files.coverImage[0].path;
  }
  if (!avatarPath) {
    throw new ApiError(400, "Avatar Image is Required");
  }

  const avatar = await uploadOnCloudinary(avatarPath);
  const coverImage = await uploadOnCloudinary(coverImagePath);

  if (!avatar) {
    throw new ApiError(400, "Avatar Image is Required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  if (!createdUser) {
    throw new ApiError(500, "Something Went While Registring the User");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Succesfully"));
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, userName, password } = req.body;

  if (!email || !userName) {
    throw new ApiError(400, "Email or Username is Required");
  }

  const userExist = await User.findOne({
    $or: [{ email }, { userName }],
  });

  if (!userExist) throw new ApiError(404, "User Not Exist");

  const passwordValid = await userExist.isPasswordCorrect(password);

  if (!passwordValid) throw new ApiError(401, "Incorrect Password");

  const { AccessToken, RefreshToken } = await generateAccessAndRefreshToken(
    user._id,
  );
});
