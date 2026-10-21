const mongoose = require("mongoose");
const Post = require("../models/Post");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const Follow = require("../models/Follow");
const Like = require("../models/Like");
const Notification = require("../models/Notification");
const Comment = require("../models/Comment");


const createPost = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.userId)) {
            return res.status(401).json({
                message: "Invalid authenticated user",
            });
        }

        const userExists = await User.exists({
            _id: req.userId,
        });

        if (!userExists) {
            return res.status(401).json({
                message: "User no longer exists",
            });
        }

        const { caption = "", media } = req.validatedBody;

        // Verify every media asset with Cloudinary.
        const verifiedMedia = await Promise.all(
            media.map(async (item) => {
                const { publicId, type } = item;

                // Only accept image assets from our expected folder.
                if (
                    type !== "image" ||
                    typeof publicId !== "string" ||
                    !publicId.startsWith("social-app/posts/") ||
                    publicId.includes("..")
                ) {
                    const error = new Error("Invalid media reference");
                    error.statusCode = 400;
                    throw error;
                }

                let asset;

                try {
                    asset = await cloudinary.api.resource(publicId, {
                        resource_type: "image",
                    });
                } catch (error) {
                    const invalidAsset = new Error(
                        "Media asset does not exist or could not be verified"
                    );
                    invalidAsset.statusCode = 400;
                    throw invalidAsset;
                }

                if (
                    asset.public_id !== publicId ||
                    !asset.secure_url ||
                    !asset.public_id.startsWith("social-app/posts/")
                ) {
                    const error = new Error("Media asset verification failed");
                    error.statusCode = 400;
                    throw error;
                }

                // Trust metadata returned by Cloudinary, not the request body.
                return {
                    type: "image",
                    url: asset.secure_url,
                    publicId: asset.public_id,
                    width: asset.width,
                    height: asset.height,
                };
            })
        );

        const post = await Post.create({
            author: req.userId,
            caption,
            media: verifiedMedia,
        });

        return res.status(201).json({
            message: "Post created successfully",
            post,
        });
    } catch (error) {
        if (error.statusCode === 400) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }

        next(error);
    }
};



const getPostById = async (req, res, next) => {
    try {
        const { postId } = req.params;

        if (!mongoose.isValidObjectId(postId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid post ID",
            });
        }

        const post = await Post.findById(postId).populate(
            "author",
            "username displayName profileImage"
        );

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found",
            });
        }

        const [likeCount, currentUserLike] = await Promise.all([
            Like.countDocuments({ post: postId }),
            req.userId
                ? Like.exists({ post: postId, user: req.userId })
                : Promise.resolve(null),
        ]);

        return res.status(200).json({
            success: true,
            post: {
                ...post.toObject(),
                likeCount,
                isLikedByMe: Boolean(currentUserLike),
            },
        });
    } catch (error) {
        next(error);
    }
};



const getUserPosts = async (req, res, next) => {
    try {
        const { userId } = req.params;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
        }

        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 10);

        if (
            !Number.isInteger(page) ||
            page < 1 ||
            !Number.isInteger(limit) ||
            limit < 1 ||
            limit > 50
        ) {
            return res.status(400).json({
                success: false,
                message: "Page must be positive; limit must be between 1 and 50",
            });
        }

        const userExists = await User.exists({ _id: userId });

        if (!userExists) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const filter = { author: userId };
        const skip = (page - 1) * limit;

        const [posts, totalPosts] = await Promise.all([
            Post.find(filter)
                .populate("author", "username displayName profileImage")
                .sort({ createdAt: -1, _id: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Post.countDocuments(filter),
        ]);

        const postIds = posts.map((post) => post._id);

        const [likeCounts, likedPosts] = await Promise.all([
            Like.aggregate([
                { $match: { post: { $in: postIds } } },
                {
                    $group: {
                        _id: "$post",
                        count: { $sum: 1 },
                    },
                },
            ]),

            req.userId && postIds.length > 0
                ? Like.find({
                    user: req.userId,
                    post: { $in: postIds },
                })
                    .select("post")
                    .lean()
                : Promise.resolve([]),
        ]);

        const likeCountMap = new Map(
            likeCounts.map((item) => [item._id.toString(), item.count])
        );

        const likedPostIds = new Set(
            likedPosts.map((like) => like.post.toString())
        );

        const postsWithLikeInfo = posts.map((post) => ({
            ...post,
            likeCount: likeCountMap.get(post._id.toString()) ?? 0,
            isLikedByMe: likedPostIds.has(post._id.toString()),
        }));

        return res.status(200).json({
            success: true,
            posts: postsWithLikeInfo,
            pagination: {
                page,
                limit,
                totalPosts,
                totalPages: Math.ceil(totalPosts / limit),
                hasNextPage: skip + posts.length < totalPosts,
                hasPreviousPage: page > 1,
            },
        });
    } catch (error) {
        next(error);
    }
};



const deletePost = async (req, res, next) => {
    try {
        const { postId } = req.params;

        if (!mongoose.isValidObjectId(postId)) {
            return res.status(400).json({
                message: "Invalid post ID",
            });
        }

        // Find only a post owned by the authenticated user.
        const post = await Post.findOne({
            _id: postId,
            author: req.userId,
        });

        if (!post) {
            return res.status(404).json({
                message: "Post not found or you are not authorized to delete it",
            });
        }

        // Keep only assets managed by our application's Cloudinary folder.
        const mediaToDelete = post.media.filter(
            (item) =>
                typeof item.publicId === "string" &&
                item.publicId.startsWith("social-app/posts/") &&
                !item.publicId.includes("..")
        );

        // Delete the MongoDB record first.
        await Post.deleteOne({
            _id: post._id,
            author: req.userId,
        });

        // Then attempt Cloudinary cleanup.
        const cleanupResults = await Promise.allSettled(
            mediaToDelete.map((item) =>
                cloudinary.uploader.destroy(item.publicId, {
                    resource_type: item.type === "video" ? "video" : "image",
                })
            )
        );

        const cleanupFailed = cleanupResults.some(
            (result) =>
                result.status === "rejected" ||
                result.value?.result === "error"
        );

        if (cleanupFailed) {
            console.error(
                "Cloudinary cleanup failed for deleted post:",
                post._id.toString(),
                cleanupResults
            );
        }

        return res.status(200).json({
            message: cleanupFailed
                ? "Post deleted, but some media cleanup failed"
                : "Post deleted successfully",
            postId: post._id,
            mediaCleanup: cleanupFailed ? "incomplete" : "complete",
        });
    } catch (error) {
        next(error);
    }
};


const uploadImage = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "Please provide an image using the image field",
            });
        }

        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: "social-app/posts",
                    resource_type: "image",
                    allowed_formats: ["jpg", "jpeg", "png", "webp"],
                },
                (error, uploadedImage) => {
                    if (error) return reject(error);
                    resolve(uploadedImage);
                }
            );

            stream.end(req.file.buffer);
        });

        return res.status(201).json({
            message: "Image uploaded successfully",
            media: {
                type: "image",
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
            },
        });
    } catch (error) {
        next(error);
    }
};



const getHomeFeed = async (req, res, next) => {
    try {
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 10);

        if (
            !Number.isInteger(page) ||
            page < 1 ||
            !Number.isInteger(limit) ||
            limit < 1 ||
            limit > 50
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Page must be positive, and limit must be between 1 and 50.",
            });
        }

        const filter = {};
        const skip = (page - 1) * limit;

        const [posts, totalPosts] = await Promise.all([
            Post.find(filter)
                .sort({ createdAt: -1, _id: -1 })
                .skip(skip)
                .limit(limit)
                .populate("author", "username displayName profileImage")
                .lean(),

            Post.countDocuments(filter),
        ]);

        const postIds = posts.map((post) => post._id);


        const [likeCounts, likedPosts, commentCounts] = await Promise.all([
            Like.aggregate([
                { $match: { post: { $in: postIds } } },
                {
                    $group: {
                        _id: "$post",
                        count: { $sum: 1 },
                    },
                },
            ]),

            postIds.length > 0
                ? Like.find({
                    user: req.userId,
                    post: { $in: postIds },
                })
                    .select("post")
                    .lean()
                : Promise.resolve([]),

            Comment.aggregate([
                { $match: { post: { $in: postIds } } },
                {
                    $group: {
                        _id: "$post",
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        const likeCountMap = new Map(
            likeCounts.map((item) => [item._id.toString(), item.count])
        );

        const likedPostIds = new Set(
            likedPosts.map((like) => like.post.toString())
        );
        const commentCountMap = new Map(
    commentCounts.map((item) => [item._id.toString(), item.count])
);

        const postsWithLikeInfo = posts.map((post) => ({
    ...post,
    likeCount: likeCountMap.get(post._id.toString()) ?? 0,
    commentCount: commentCountMap.get(post._id.toString()) ?? 0,
    isLikedByMe: likedPostIds.has(post._id.toString()),
}));

        return res.status(200).json({
            success: true,
            posts: postsWithLikeInfo,
            pagination: {
                page,
                limit,
                totalPosts,
                totalPages: Math.ceil(totalPosts / limit),
                hasNextPage: skip + posts.length < totalPosts,
                hasPreviousPage: page > 1,
            },
        });
    } catch (error) {
        next(error);
    }
};



const updatePost = async (req, res, next) => {
    try {
        const { postId } = req.params;

        if (!mongoose.isValidObjectId(postId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid post ID",
            });
        }

        // For now, only caption editing is supported.
        const body = req.body;

        if (
            !body ||
            typeof body !== "object" ||
            Array.isArray(body) ||
            Object.keys(body).length !== 1 ||
            !Object.prototype.hasOwnProperty.call(body, "caption")
        ) {
            return res.status(400).json({
                success: false,
                message: "Provide only a caption field",
            });
        }

        const { caption } = body;

        if (
            typeof caption !== "string" ||
            caption.length > 2200
        ) {
            return res.status(400).json({
                success: false,
                message: "Caption must be a string of at most 2200 characters",
            });
        }

        // Only the post's owner can edit it.
        const post = await Post.findOneAndUpdate(
            {
                _id: postId,
                author: req.userId,
            },
            {
                $set: { caption },
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        ).populate("author", "username displayName profileImage");

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found or you are not authorized to edit it",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Post updated successfully",
            post,
        });
    } catch (error) {
        next(error);
    }
};


const likePost = async (req, res, next) => {
    try {
        const { postId } = req.params;
        const userId = req.userId;

        // 1. Validate post ID
        if (!mongoose.isValidObjectId(postId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid post ID",
            });
        }

        // 2. Verify the post exists
        // const postExists = await Post.exists({ _id: postId });

        // if (!postExists) {
        //   return res.status(404).json({
        //     success: false,
        //     message: "Post not found",
        //   });
        // }
        const post = await Post.findById(postId).select("_id author");
        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found",
            });
        }

        // 3. Create the like
        try {
            await Like.create({
                post: postId,
                user: userId,
            });
            // 4. Notify the post owner, except when liking your own post
            if (post.author.toString() !== userId) {
                try {
                    await Notification.create({
                        recipient: post.author,
                        actor: userId,
                        type: "like",
                        post: post._id,
                    });
                } catch (notificationError) {
                    console.error(
                        "Like notification creation failed:",
                        notificationError
                    );
                }
            }

            return res.status(201).json({
                success: true,
                message: "Post liked successfully",
                liked: true,
            });
        } catch (error) {
            // The unique index prevents duplicate likes,
            // including concurrent requests.
            if (error.code === 11000) {
                return res.status(200).json({
                    success: true,
                    message: "You have already liked this post",
                    liked: true,
                });
            }

            throw error;
        }
    } catch (error) {
        next(error);
    }
};


const unlikePost = async (req, res, next) => {
    try {
        const { postId } = req.params;
        const userId = req.userId;

        // 1. Validate post ID
        if (!mongoose.isValidObjectId(postId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid post ID",
            });
        }

        // 2. Verify the post exists
        const postExists = await Post.exists({ _id: postId });

        if (!postExists) {
            return res.status(404).json({
                success: false,
                message: "Post not found",
            });
        }

        // 3. Remove only this user's like
        const result = await Like.deleteOne({
            post: postId,
            user: userId,
        });

        if (result.deletedCount === 0) {
            return res.status(200).json({
                success: true,
                message: "You have not liked this post",
                liked: false,
            });
        }

        return res.status(200).json({
            success: true,
            message: "Post unliked successfully",
            liked: false,
        });
    } catch (error) {
        next(error);
    }
};


module.exports = { createPost, getPostById, getUserPosts, deletePost, uploadImage, getHomeFeed, updatePost, likePost, unlikePost };