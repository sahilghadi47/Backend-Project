import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError as Error } from "../utils/ApiError.js";
import { ApiResponse as Response } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend

    const { fullName, email, password, userName } = req.body;

    // validation - not empty
    if (
        [fullName, email, password, userName].some(
            (field) => field.trim() == ""
        )
    ) {
        throw new Error(400, "All fields are required");
    }
    // check if user already exists: username, email
    const existedUser = await User.findOne({
        $or: [{ email }, { userName }],
    });
    if (existedUser) {
        throw new Error(409, "User with email or username already exists");
    }
    // check for images, check for avatar
    // get local path of images
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    // upload them to cloudinary, avatar
    if (!avatarLocalPath) {
        throw new Error(400, "Avatar is required");
    }
    if (!coverImageLocalPath) {
        throw new Error(400, "Cover Image is required");
    }
    const avatar = await uploadToCloudinary(avatarLocalPath);
    const coverImage = await uploadToCloudinary(coverImageLocalPath);
    console.log("\n");
    if (!avatar) {
        throw new Error(400, "Avatar is required");
    }
    //create user object - create entry in db
    const user = await User.create({
        userName: userName.toLowerCase(),
        fullName,
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    });
    // hide password and refreshToken from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    console.log("createdUser :");
    console.log(createdUser);
    console.log("\n");

    // if server failed to register user
    if (!createdUser) {
        throw new Error(500, "Something went wrong while registering the user");
    }
    // return response
    return res
        .status(201)
        .json(new Response(200, createdUser, "User registered Successfully"));
});

export { registerUser };
