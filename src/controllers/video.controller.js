import mongoose, { isValidObjectId } from "mongoose";
import asyncHandler from "../utils/asyncHandler";
import { ApiError as Error } from "../utils/ApiError";
import { ApiResponse as Response } from "../utils/ApiResponse";
import { Video } from "../models/video.models";
import { User } from "../models/user.models";
import { uploadToCloudinary } from "../utils/cloudinary";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    //TODO: get all videos based on query, sort, pagination
    let queryObj = {};
    if (query) queryObj.$text = { $search: query };
    if (userId && isValidObjectId(userId)) {
        const user = await User.findById(userId);
        if (!user) throw new Error(404, "User not found");
        queryObj.owner = userId;
    }
    const videos = await Video.aggregatePaginate(
        Video.aggregate([
            { $match: queryObj },
            { $sort: { [sortBy]: sortType } },
        ]),
        { page, limit }
    );
    console.log(videos.docs);
    if (!videos.docs || videos.docs.length === 0)
        throw new Error(404, "No videos found");
    return res
        .status(200)
        .json(new Response(200, videos, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    const owner = req.user._id;
    if (!owner) throw new Error(404, "Invalid request");
    if (title === "" || description === "")
        throw new Error(400, "All fields are required");

    // TODO: get video, upload to cloudinary, create video
    const videoFilePath = req.files[0]?.videoFile?.path;
    const thumbnailPath = req.files[0]?.thumbnail?.path;
    if (!videoFilePath || !thumbnailPath)
        throw new Error(500, "All files are mandatory");
    const video = await uploadToCloudinary(videoFilePath, {
        resource_type: "video",
    });
    const thumbnail = await uploadToCloudinary(thumbnailPath, {
        resource_type: "image",
    });

    if (!video || !thumbnail)
        throw new Error(500, "Video or thambnail upload failed");

    const newVideo = await Video.create({
        title,
        description,
        videoUrl: video.secure_url,
        thumbnailUrl: thumbnail.secure_url,
        duration: video.duration, // in seconds
        owner,
    });
    if (!newVideo) throw new Error(500, "Video creation failed");
    return res
        .status(200)
        .json(new Response(200, newVideo, "Video uploaded successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: get video by id
    if (isValidObjectId(videoId)) throw new Error(400, "Invalid video id");
    const video = await Video.findById(videoId);
    if (!video) throw new Error(404, "Video not found");
    return res
        .status(200)
        .json(new Response(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) throw new Error(400, "Invalid video id");

    const userId = req.user._id;
    if (!userId) throw new Error(404, "User not found");

    const video = await Video.findById(videoId);

    if (!video) throw new Error(404, "Video not found");
    if (video.owner.toString() !== userId.toString()) {
        throw new Error(403, "You are not authorized to update this video");
    }
    const { title, description } = req.body;
    if (!title || !description) throw new Error(400, "All fields are required");
    //TODO: update video details like title, description, thumbnail
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { title, description },
        { new: true }
    );
    if (!updatedVideo) throw new Error(500, "Video update failed");
    return res
        .status(200)
        .json(new Response(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: delete video

    if (!isValidObjectId(videoId)) throw new Error(400, "Invalid video id");

    const userId = req.user._id;
    if (!userId) throw new Error(404, "User not found");

    const video = await Video.findById(videoId);
    if (!video) throw new Error(404, "Video not found");

    if (video.owner.toString() !== userId.toString()) {
        throw new Error(403, "You are not authorized to delete this video");
    }
    await Video.findByIdAndDelete(videoId);
    return res
        .status(200)
        .json(new Response(200, null, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) throw new Error(400, "Invalid video id");

    const userId = req.user._id;
    if (!userId) throw new Error(404, "User not found");

    const video = await Video.findById(videoId);
    if (!video) throw new Error(404, "Video not found");

    if (video.owner.toString() !== userId.toString()) {
        throw new Error(403, "You are not authorized to update status");
    }

    video.isPublished = !video.isPublished;
    await video.save();
    return res
        .status(200)
        .json(new Response(200, video, "Video status updated successfully"));
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
