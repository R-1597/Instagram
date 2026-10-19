
const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Follow = require("../src/models/Follow");

jest.mock("../src/config/cloudinary", () => ({
  api: {
    resource: jest.fn(),
  },
  uploader: {
    destroy: jest.fn().mockResolvedValue({ result: "ok" }),
  },
}));

const cloudinary = require("../src/config/cloudinary");
const app = require("../src/app");
const connectDB = require("../src/config/db");
const User = require("../src/models/User");
const Post = require("../src/models/Post");
const Like = require("../src/models/Like");

const testId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

let author;
let otherUser;
let authorToken;
let otherToken;
let postId;

function makeToken(user) {
  return jwt.sign(
    { tokenVersion: user.tokenVersion ?? 0 },
    process.env.JWT_SECRET,
    {
      algorithm: "HS256",
      subject: user._id.toString(),
      expiresIn: "5m",
      issuer: "instagram-clone-api",
      audience: "instagram-clone-client",
    }
  );
}

describe("Posts API integration tests", () => {
  beforeAll(async () => {
    await connectDB();

    author = await User.create({
      username: `postauthor_${testId}`,
      email: `postauthor_${testId}@example.com`,
      passwordHash: "test-hash-not-used",
    });

    otherUser = await User.create({
      username: `postother_${testId}`,
      email: `postother_${testId}@example.com`,
      passwordHash: "test-hash-not-used",
    });

    authorToken = makeToken(author);
    otherToken = makeToken(otherUser);

    cloudinary.api.resource.mockImplementation(async (publicId) => ({
      public_id: publicId,
      secure_url: "https://res.cloudinary.com/demo/image/upload/test.jpg",
      width: 640,
      height: 480,
    }));
  }, 60000);

  afterAll(async () => {
    try {
      const ownedPosts = await Post.find({
        author: { $in: [author?._id, otherUser?._id].filter(Boolean) },
      }).select("_id");

      const ownedPostIds = ownedPosts.map((post) => post._id);

      await Like.deleteMany({
        $or: [
          { user: author?._id },
          { user: otherUser?._id },
          { post: { $in: ownedPostIds } },
        ],
      });

      await Post.deleteMany({
        author: { $in: [author?._id, otherUser?._id].filter(Boolean) },
      });

      if (author?._id) await User.deleteOne({ _id: author._id });
      if (otherUser?._id) await User.deleteOne({ _id: otherUser._id });
    } finally {
      await mongoose.disconnect();
    }
  }, 60000);

  test("POST /api/posts creates a post with verified media", async () => {
    const response = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${authorToken}`)
      .send({
        caption: "Automated test post",
        media: [
          {
            type: "image",
            url: "https://example.com/image.jpg",
            publicId: "social-app/posts/test-image",
            width: 640,
            height: 480,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.post.caption).toBe("Automated test post");
    expect(response.body.post.author.toString()).toBe(author._id.toString());

    postId = response.body.post._id;
    expect(postId).toBeDefined();
    expect(cloudinary.api.resource).toHaveBeenCalledWith(
      "social-app/posts/test-image",
      { resource_type: "image" }
    );
  });

  test("post creation rejects requests without authentication", async () => {
    const response = await request(app)
      .post("/api/posts")
      .send({
        caption: "Unauthenticated",
        media: [],
      });

    expect(response.status).toBe(401);
  });

  test("post creation rejects an empty media array", async () => {
    const response = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${authorToken}`)
      .send({ caption: "Missing media", media: [] });

    expect(response.status).toBe(400);
  });

  test("GET /api/posts/:postId returns the post", async () => {
    const response = await request(app)
      .get(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${authorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.post.caption).toBe("Automated test post");
    expect(response.body.post.likeCount).toBe(0);
  });

  test("GET post rejects an invalid ID", async () => {
    const response = await request(app)
      .get("/api/posts/not-a-valid-id")
      .set("Authorization", `Bearer ${authorToken}`);

    expect(response.status).toBe(400);
  });

  test("PATCH /api/posts/:postId updates the caption", async () => {
    const response = await request(app)
      .patch(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${authorToken}`)
      .send({ caption: "Updated test caption" });

    expect(response.status).toBe(200);
    expect(response.body.post.caption).toBe("Updated test caption");
  });

  test("another user cannot edit the post", async () => {
    const response = await request(app)
      .patch(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ caption: "Unauthorized edit" });

    expect(response.status).toBe(404);
  });

  test("PATCH rejects unexpected fields", async () => {
    const response = await request(app)
      .patch(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${authorToken}`)
      .send({ caption: "Valid caption", author: otherUser._id });

    expect(response.status).toBe(400);
  });

  test("another user cannot delete the post", async () => {
    const response = await request(app)
      .delete(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(response.status).toBe(404);
    expect(await Post.exists({ _id: postId })).not.toBeNull();
  });

  test("DELETE /api/posts/:postId deletes the owner's post", async () => {
    const response = await request(app)
      .delete(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${authorToken}`);

    expect(response.status).toBe(200);
    expect(await Post.exists({ _id: postId })).toBeNull();
  });

  test("GET /api/posts/feed requires authentication", async () => {
  const response = await request(app).get("/api/posts/feed");

  expect(response.status).toBe(401);
});

test("home feed includes posts from followed and unfollowed users", async () => {
  const followedUser = await User.create({
    username: `feedfollow_${testId}`,
    email: `feedfollow_${testId}@example.com`,
    passwordHash: "test-hash-not-used",
  });

  const unfollowedUser = await User.create({
    username: `feedother_${testId}`,
    email: `feedother_${testId}@example.com`,
    passwordHash: "test-hash-not-used",
  });

  try {
    await Follow.create({
      follower: author._id,
      following: followedUser._id,
    });

    const followedPost = await Post.create({
      author: followedUser._id,
      caption: "Post from followed user",
      media: [{
        type: "image",
        url: "https://example.com/followed.jpg",
        publicId: "test/followed",
      }],
    });

    const unfollowedPost = await Post.create({
      author: unfollowedUser._id,
      caption: "Post from unfollowed user",
      media: [{
        type: "image",
        url: "https://example.com/unfollowed.jpg",
        publicId: "test/unfollowed",
      }],
    });

    const response = await request(app)
      .get("/api/posts/feed")
      .set("Authorization", `Bearer ${authorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const feedPostIds = response.body.posts.map((post) =>
      post._id.toString()
    );

    expect(feedPostIds).toContain(followedPost._id.toString());
    expect(feedPostIds).toContain(unfollowedPost._id.toString());
  } finally {
    await Post.deleteMany({
      author: { $in: [followedUser._id, unfollowedUser._id] },
    });

    await Follow.deleteMany({
      $or: [
        { follower: author._id, following: followedUser._id },
        { follower: author._id, following: unfollowedUser._id },
      ],
    });

    await User.deleteMany({
      _id: { $in: [followedUser._id, unfollowedUser._id] },
    });
  }
});

test("home feed includes the authenticated user's own posts", async () => {
  const ownPost = await Post.create({
    author: author._id,
    caption: "My own feed post",
    media: [{
      type: "image",
      url: "https://example.com/own.jpg",
      publicId: "test/own",
    }],
  });

  try {
    const response = await request(app)
      .get("/api/posts/feed")
      .set("Authorization", `Bearer ${authorToken}`);

    expect(response.status).toBe(200);

    expect(
      response.body.posts.some(
        (post) => post._id.toString() === ownPost._id.toString()
      )
    ).toBe(true);
  } finally {
    await Post.deleteOne({ _id: ownPost._id });
  }
});

test("home feed rejects invalid pagination parameters", async () => {
  const response = await request(app)
    .get("/api/posts/feed?page=0&limit=10")
    .set("Authorization", `Bearer ${authorToken}`);

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});

test("home feed returns pagination metadata", async () => {
  const response = await request(app)
    .get("/api/posts/feed?page=1&limit=2")
    .set("Authorization", `Bearer ${authorToken}`);

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.pagination.page).toBe(1);
  expect(response.body.pagination.limit).toBe(2);
  expect(response.body.posts.length).toBeLessThanOrEqual(2);
  expect(response.body.pagination.totalPosts).toBeGreaterThanOrEqual(0);
});
});
