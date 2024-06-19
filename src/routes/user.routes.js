import { Router } from "express";
import {
    changeCurrentPassword,
    getCurrentUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    updateAvatarImage,
    updateCoverImage,
    updateUserInfo,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { authenticateJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1,
        },
    ]),
    registerUser
);

// secured routes
router.route("/login").post(loginUser);
router.route("/refresh-access-token").post(refreshAccessToken);
router.route("/logout").post(authenticateJWT, logoutUser);
router.route("/profile").get(authenticateJWT, getCurrentUser);
router
    .route("/change-current-password")
    .post(authenticateJWT, changeCurrentPassword);
router.route("/update-user-profile").patch(authenticateJWT, updateUserInfo);
router
    .route("/update-avatar")
    .patch(authenticateJWT, upload.single("avatar"), updateAvatarImage);
router
    .route("/update-cover-image")
    .patch(authenticateJWT, upload.single("coverImage"), updateCoverImage);

export default router;
