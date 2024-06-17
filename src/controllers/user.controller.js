import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError as Error } from "../utils/ApiError.js";
import { ApiResponse as Response } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

// Generate Access and Refresh token
const generateAccessAndRefreshTokens = async (user_id) => {
    try {
        const user = await User.findById(user_id);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        if (!accessToken || !refreshToken) {
            throw new Error(500, "Tokens creation failed");
        }
        return { accessToken, refreshToken };
    } catch (error) {
        throw new Error(500, error || "Access token generation failed");
    }
};

// user registration method at user/register
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

    // if server failed to register user
    if (!createdUser) {
        throw new Error(500, "Something went wrong while registering the user");
    }
    // return response
    return res
        .status(201)
        .json(new Response(200, createdUser, "User registered Successfully"));
});

// user login method at user/login
const loginUser = asyncHandler(async (req, res) => {
    // get data from body
    const { userName, password } = req.body;
    // check for inputfields
    if (!userName) {
        throw new Error(400, "Username is required");
    }
    // find user in database
    const user = await User.findOne({ userName });
    if (!user) {
        throw new Error(401, "User doesn't exist");
    }
    // check user password
    const isPasswordCorrect = await user.isPasswordCorrect(password);
    if (!isPasswordCorrect) {
        throw new Error(401, "Password mismatch");
    }
    // generate access and refresh tokans
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );
    // add refresh token to userDatabase
    user.refreshToken = refreshToken;
    await user.save();
    const loggedUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    // return user in response
    const options = {
        httpOnly: true,
        secure: true,
    };
    res.status(200)
        .cookie("refreshToken", refreshToken, options)
        .cookie("accessToken", accessToken, options)
        .json(new Response(201, loggedUser, "user logged in success-fully"));
});

// user logout method at user/logout
const logoutUser = asyncHandler(async (req, res) => {
    const user = req.user;
    await User.findByIdAndUpdate(
        user._id,
        {
            $unset: {
                refreshToken: 1,
            },
        },
        {
            new: true,
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new Response(200, {}, "User logged Out"));
});

// refresh access token if it has been expired
const refreshAccessToken = asyncHandler(async (req, res) => {
    // get refresh token from cookies
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;
    console.log(incomingRefreshToken);
    console.log(req.cookies);
    if (!incomingRefreshToken) {
        throw new Error(400, "Unathorised request");
    }
    // decode refresh token
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        if (!decodedToken) {
            throw new Error(400, "Invalid refresh token");
        }

        // get user from refresh token
        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new Error(400, "User not found");
        }

        // validate provided and stored refresh token
        const savedRefreshToken = user?.refreshToken;
        if (!savedRefreshToken) {
            throw new Error(500, "Refresh token is not available");
        }

        if (savedRefreshToken !== incomingRefreshToken) {
            throw new Error(400, "Refresh token is expired");
        }

        // generate new access token and refresh token
        const { accessToken, refreshToken } =
            await generateAccessAndRefreshTokens(user._id);
        // add refresh token to userDatabase
        user.refreshToken = refreshToken;
        await user.save();
        const loggedUser = await User.findById(user._id).select(
            "-password -refreshToken"
        );
        // return user in response
        const options = {
            httpOnly: true,
            secure: true,
        };
        res.status(200)
            .cookie("refreshToken", refreshToken, options)
            .cookie("accessToken", accessToken, options)
            .json(
                new Response(
                    201,
                    loggedUser,
                    "access token refreshed successfully"
                )
            );
    } catch (error) {
        throw new Error(400, error.message || "access token refreshing failed");
    }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
