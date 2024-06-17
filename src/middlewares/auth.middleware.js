import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError as Error } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";

export const authenticateJWT = asyncHandler(async (req, _, next) => {
    try {
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new Error(400, "Unauthorised request");
        }
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decodedToken._id).select(
            "-password -refreshToken"
        );
        if (!user) {
            throw new Error(400, "Invalid access Token");
        }
        req.user = user;
        next();
    } catch (error) {
        throw new Error(400, error.message || "Invalid access token");
    }
});
