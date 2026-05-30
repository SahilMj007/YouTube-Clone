import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiErrors.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import JWT from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const AccessToken = await user.generateAccessToken();
    const RefreshToken = await user.generateRefreshToken();
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

  if (!email && !userName) {
    throw new ApiError(400, "Email or Username is Required");
  }

  const userExist = await User.findOne({
    $or: [{ email }, { userName }],
  });

  if (!userExist) throw new ApiError(404, "User Not Exist");

  const passwordValid = await userExist.isPasswordCorrect(password);

  if (!passwordValid) throw new ApiError(401, "Incorrect Password");

  const { AccessToken, RefreshToken } = await generateAccessAndRefreshToken(
    userExist._id,
  );

  const loggedInUser = await User.findById(userExist._id).select(
    "-password -refreshToken",
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", AccessToken, options)
    .cookie("refreshToken", RefreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          AccessToken,
          RefreshToken,
        },
        "User logged in Successfully",
      ),
    );
});

export const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    },
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshAccessToken;
  if (!token) throw new ApiError(401, "Unauthorized Request");
  try {
    const decodedToken = JWT.verify(token, process.env.REFRESH_TOKEN_SECRET);
    if (!decodedToken) throw new ApiError(401, "Unauthorized Request");
    const user = await User.findById(decodedToken?._id);
    if (!user) throw new ApiError(401, "Invalid Refresh Token");

    if (token !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is Expired or Used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { AccessToken, RefreshToken } = await generateAccessAndRefreshToken(
      user?._id,
      options,
    );

    return res
      .status(200)
      .cookie("accessToken", AccessToken)
      .cookie("refeshToken", RefreshToken)
      .json(
        new ApiResponse(
          200,
          { AccessToken, RefreshToken },
          "Access Token Refreshed",
        ),
      );
  } catch (error) {
    throw new ApiError(501, error?.message || "Invalid Refresh Token");
  }
});

export const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  if (!oldPassword || !newPassword || !confirmPassword) {
    throw new ApiError(400, "All Fields are Required");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "New & Confirm Password Does Not Match");
  }

  const user_id = req.user?._id;
  const user = await User.findById(user_id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) throw new ApiError(400, "Invalid Password");

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Succefully Changed"));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = req.user;
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Current User Fetched Succesfully"));
});

export const updateDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) throw new ApiError(400, "All Fields are Required");
  const user_id = req.user?._id;
  const user = await User.findByIdAndUpdate(
    user_id,
    {
      $set: { fullName, email },
    },
    { returnDocument: "after" },
  ).select("-password");

  if (!user) {
    throw new ApiError(404, "User Not Found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Details Changed SuccesFully"));
});

export const avatarChange = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) throw new ApiError(404, "Avatar Image is Required");
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(
      401,
      "There Is Some Issue While Updating Avatar On Cloudnary",
    );
  }
  const user_id = req.user?._id;
  const user = await User.findByIdAndUpdate(
    user_id,
    { $set: { avatar: avatar.url } },
    { returnDocument: "affter" },
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Image is Updated Succesfully"));
});

export const coverImageChange = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(404, "coverImage Image is Required");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(
      401,
      "There Is Some Issue While Updating coverImage On Cloudnary",
    );
  }

  const user_id = req.user?._id;
  const user = await User.findByIdAndUpdate(
    user_id,
    { $set: { coverImage: coverImage.url } },
    { returnDocument: "after" },
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image is Updated Succesfully"));
});
