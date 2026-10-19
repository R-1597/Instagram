
const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

jest.mock("../src/config/cloudinary", () => ({
  api: { resource: jest.fn() },
  uploader: {
    destroy: jest.fn().mockResolvedValue({ result: "ok" }),
  },
}));

const app = require("../src/app");
const connectDB = require("../src/config/db");
const User = require("../src/models/User");
const Post = require("../src/models/Post");
const Like = require("../src/models/Like");
const Notification = require("../src/models/Notification");

const testId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

let author;
let liker;
let authorToken;
let likerToken;
let postId;
let ownPostId;

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

describe("Likes API integration tests", () => {
  beforeAll(async () => {
    await connectDB();

    const passwordHash = await bcrypt.hash("TestPassword123!", 4);

    author = await User.create({
      username: `likeauthor_${testId}`,
      email: `likeauthor_${testId}@example.com`,
      passwordHash,
    });

    liker = await User.create({
      username: `liker_${testId}`,
      email: `liker_${testId}@example.com`,
      passwordHash,
    });

    authorToken = makeToken(author);
    likerToken = makeToken(liker);

    const post = await Post.create({
      author: author._id,
      caption: "Post for likes integration tests",
      media: [{
        type: "image",
        url: "https://example.com/like-test.jpg",
        publicId: `social-app/posts/like-test-${testId}`,
        width: 640,
        height: 480,
      }],
    });

    const ownPost = await Post.create({
      author: liker._id,
      caption: "My own test post",
      media: [{
        type: "image",
        url: "https://example.com/own-like-test.jpg",
        publicId: `social-app/posts/own-like-test-${testId}`,
        width: 640,
        height: 480,
      }],
    });

    postId = post._id.toString();
    ownPostId = ownPost._id.toString();
  }, 60000);

  afterAll(async () => {
    try {
      const userIds = [author?._id, liker?._id].filter(Boolean);
      const postIds = [postId, ownPostId].filter(Boolean);

      if (userIds.length) {
        await Notification.deleteMany({
          $or: [
            { recipient: { $in: userIds } },
            { actor: { $in: userIds } },
          ],
        });
      }

      if (postIds.length) {
        await Like.deleteMany({ post: { $in: postIds } });
        await Post.deleteMany({
          _id: { $in: postIds },
        });
      }

      if (userIds.length) {
        await User.deleteMany({ _id: { $in: userIds } });
      }
    } finally {
      await mongoose.disconnect();
    }
  }, 60000);

  beforeEach(async () => {
    const postIds = [postId, ownPostId].filter(Boolean);

    await Like.deleteMany({ post: { $in: postIds } });

    await Notification.deleteMany({
      $or: [
        { recipient: author?._id, actor: liker?._id },
        { recipient: liker?._id, actor: liker?._id },
      ],
      post: { $in: postIds },
      type: "like",
    });
  });

  test("like an existing post", async () => {
    const response = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set("Authorization", `Bearer ${likerToken}`);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.liked).toBe(true);

    expect(
      await Like.countDocuments({ post: postId, user: liker._id })
    ).toBe(1);
  });

  test("duplicate like does not create a second Like record", async () => {
    const first = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set("Authorization", `Bearer ${likerToken}`);

    const second = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set("Authorization", `Bearer ${likerToken}`);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.liked).toBe(true);

    expect(
      await Like.countDocuments({ post: postId, user: liker._id })
    ).toBe(1);
  });

  test("unlike removes the user's Like record", async () => {
    await Like.create({ post: postId, user: liker._id });

    const response = await request(app)
      .delete(`/api/posts/${postId}/like`)
      .set("Authorization", `Bearer ${likerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.liked).toBe(false);

    expect(
      await Like.exists({ post: postId, user: liker._id })
    ).toBeNull();
  });

  test("unliking twice is handled safely", async () => {
    const response = await request(app)
      .delete(`/api/posts/${postId}/like`)
      .set("Authorization", `Bearer ${likerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.liked).toBe(false);
    expect(response.body.message).toBe("You have not liked this post");
  });

  test("like endpoint rejects unauthenticated requests", async () => {
    const response = await request(app)
      .post(`/api/posts/${postId}/like`);

    expect(response.status).toBe(401);
  });

  test("unlike endpoint rejects unauthenticated requests", async () => {
    const response = await request(app)
      .delete(`/api/posts/${postId}/like`);

    expect(response.status).toBe(401);
  });

  test("like rejects an invalid post ID", async () => {
    const response = await request(app)
      .post("/api/posts/not-a-valid-id/like")
      .set("Authorization", `Bearer ${likerToken}`);

    expect(response.status).toBe(400);
  });

  test("like returns 404 for a nonexistent post", async () => {
    const nonexistentId = new mongoose.Types.ObjectId().toString();

    const response = await request(app)
      .post(`/api/posts/${nonexistentId}/like`)
      .set("Authorization", `Bearer ${likerToken}`);

    expect(response.status).toBe(404);
  });

  test("post response reports accurate like count and viewer status", async () => {
    await Like.create({ post: postId, user: liker._id });

    const response = await request(app)
      .get(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${likerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.post.likeCount).toBe(1);
    expect(response.body.post.isLikedByMe).toBe(true);

    const authorResponse = await request(app)
      .get(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${authorToken}`);

    expect(authorResponse.body.post.likeCount).toBe(1);
    expect(authorResponse.body.post.isLikedByMe).toBe(false);
  });

  test("liking another user's post creates a notification", async () => {
    const response = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set("Authorization", `Bearer ${likerToken}`);

    expect(response.status).toBe(201);

    const notification = await Notification.findOne({
      recipient: author._id,
      actor: liker._id,
      type: "like",
      post: postId,
    });

    expect(notification).not.toBeNull();
  });

  test("liking your own post does not create a like notification", async () => {
    const response = await request(app)
      .post(`/api/posts/${ownPostId}/like`)
      .set("Authorization", `Bearer ${likerToken}`);

    expect(response.status).toBe(201);

    const notification = await Notification.findOne({
      recipient: liker._id,
      actor: liker._id,
      type: "like",
      post: ownPostId,
    });

    expect(notification).toBeNull();
  });
});
