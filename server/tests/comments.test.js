
const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const app = require("../src/app");
const connectDB = require("../src/config/db");

const User = require("../src/models/User");
const Post = require("../src/models/Post");
const Comment = require("../src/models/Comment");
const Notification = require("../src/models/Notification");

const testId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

let author;
let commenter;
let otherUser;

let authorToken;
let commenterToken;
let otherToken;

let post;
let ownPost;
let comment;

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

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

describe("Comments API integration tests", () => {
  beforeAll(async () => {
    await connectDB();

    author = await User.create({
      username: `cmauthor_${testId.slice(-18)}`,
      email: `cmauthor_${testId}@example.com`,
      passwordHash: "test-hash-not-used",
    });

    commenter = await User.create({
      username: `cmuser_${testId.slice(-18)}`,
      email: `cmuser_${testId}@example.com`,
      passwordHash: "test-hash-not-used",
    });

    otherUser = await User.create({
      username: `cmother_${testId.slice(-18)}`,
      email: `cmother_${testId}@example.com`,
      passwordHash: "test-hash-not-used",
    });

    authorToken = makeToken(author);
    commenterToken = makeToken(commenter);
    otherToken = makeToken(otherUser);

    post = await Post.create({
      author: author._id,
      caption: "Comment integration test post",
      media: [
        {
          type: "image",
          url: "https://example.com/test.jpg",
          publicId: `comments-test-${testId}`,
          width: 640,
          height: 480,
        },
      ],
    });

    ownPost = await Post.create({
      author: commenter._id,
      caption: "My own post",
      media: [
        {
          type: "image",
          url: "https://example.com/own.jpg",
          publicId: `comments-own-${testId}`,
          width: 640,
          height: 480,
        },
      ],
    });
  }, 60000);

  afterAll(async () => {
    try {
      const userIds = [author?._id, commenter?._id, otherUser?._id]
        .filter(Boolean);

      const postIds = [post?._id, ownPost?._id].filter(Boolean);

      const commentIds = await Comment.find({
        $or: [
          { post: { $in: postIds } },
          { author: { $in: userIds } },
        ],
      }).distinct("_id");

      await Notification.deleteMany({
        $or: [
          { recipient: { $in: userIds } },
          { actor: { $in: userIds } },
          { comment: { $in: commentIds } },
          { post: { $in: postIds } },
        ],
      });

      await Comment.deleteMany({
        $or: [
          { post: { $in: postIds } },
          { author: { $in: userIds } },
        ],
      });

      await Post.deleteMany({
        _id: { $in: postIds },
      });

      await User.deleteMany({
        _id: { $in: userIds },
      });
    } finally {
      await mongoose.disconnect();
    }
  }, 60000);

  test("POST creates a comment and notifies the post author", async () => {
    const response = await request(app)
      .post(`/api/posts/${post._id}/comments`)
      .set(auth(commenterToken))
      .send({ text: "  Great post!  " });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.comment.text).toBe("Great post!");
    expect(response.body.comment.post.toString()).toBe(post._id.toString());
    expect(response.body.comment.author.username).toBe(commenter.username);

    comment = await Comment.findById(response.body.comment._id);

    expect(comment).not.toBeNull();

    const notification = await Notification.findOne({
      recipient: author._id,
      actor: commenter._id,
      type: "comment",
      post: post._id,
      comment: comment._id,
    });

    expect(notification).not.toBeNull();
  });

  test("creating a comment on your own post does not notify yourself", async () => {
    const response = await request(app)
      .post(`/api/posts/${ownPost._id}/comments`)
      .set(auth(commenterToken))
      .send({ text: "My own comment" });

    expect(response.status).toBe(201);

    const notification = await Notification.findOne({
      recipient: commenter._id,
      actor: commenter._id,
      type: "comment",
      comment: response.body.comment._id,
    });

    expect(notification).toBeNull();
  });

  test("rejects unauthenticated comment creation", async () => {
    const response = await request(app)
      .post(`/api/posts/${post._id}/comments`)
      .send({ text: "Unauthorized" });

    expect(response.status).toBe(401);
  });

  test("rejects empty or whitespace-only comments", async () => {
    for (const text of ["", "   ", "\n\t"]) {
      const response = await request(app)
        .post(`/api/posts/${post._id}/comments`)
        .set(auth(commenterToken))
        .send({ text });

      expect(response.status).toBe(400);
    }
  });

  test("rejects comments longer than 2000 characters", async () => {
    const response = await request(app)
      .post(`/api/posts/${post._id}/comments`)
      .set(auth(commenterToken))
      .send({ text: "a".repeat(2001) });

    expect(response.status).toBe(400);
  });

  test("rejects an invalid post ID when creating a comment", async () => {
    const response = await request(app)
      .post("/api/posts/invalid-id/comments")
      .set(auth(commenterToken))
      .send({ text: "Test" });

    expect(response.status).toBe(400);
  });

  test("returns 404 when creating a comment on a nonexistent post", async () => {
    const missingPostId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .post(`/api/posts/${missingPostId}/comments`)
      .set(auth(commenterToken))
      .send({ text: "Test" });

    expect(response.status).toBe(404);
  });

  test("GET retrieves comments with pagination and author details", async () => {
    const response = await request(app)
      .get(`/api/posts/${post._id}/comments?page=1&limit=10`)
      .set(auth(commenterToken));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.comments)).toBe(true);
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.limit).toBe(10);
    expect(response.body.pagination.total).toBeGreaterThanOrEqual(1);

    const found = response.body.comments.find(
      (item) => item._id.toString() === comment._id.toString()
    );

    expect(found).toBeDefined();
    expect(found.author.username).toBe(commenter.username);
  });

  test("rejects unauthenticated comment retrieval", async () => {
    const response = await request(app)
      .get(`/api/posts/${post._id}/comments`);

    expect(response.status).toBe(401);
  });

  test("returns 400 for an invalid post ID when retrieving comments", async () => {
    const response = await request(app)
      .get("/api/posts/invalid-id/comments")
      .set(auth(commenterToken));

    expect(response.status).toBe(400);
  });

  test("returns 404 when retrieving comments for a nonexistent post", async () => {
    const missingPostId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .get(`/api/posts/${missingPostId}/comments`)
      .set(auth(commenterToken));

    expect(response.status).toBe(404);
  });

  test("rejects unauthenticated comment deletion", async () => {
    const response = await request(app)
      .delete(`/api/posts/${post._id}/comments/${comment._id}`);

    expect(response.status).toBe(401);
  });

  test("an unrelated user cannot delete another user's comment", async () => {
    const response = await request(app)
      .delete(`/api/posts/${post._id}/comments/${comment._id}`)
      .set(auth(otherToken));

    expect(response.status).toBe(403);
    expect(await Comment.exists({ _id: comment._id })).not.toBeNull();
  });

  test("post author can delete another user's comment", async () => {
    const response = await request(app)
      .delete(`/api/posts/${post._id}/comments/${comment._id}`)
      .set(auth(authorToken));

    expect(response.status).toBe(200);
    expect(await Comment.exists({ _id: comment._id })).toBeNull();

    expect(
      await Notification.exists({
        type: "comment",
        comment: comment._id,
      })
    ).toBeNull();
  });

  test("comment author can delete their own comment", async () => {
    const createResponse = await request(app)
      .post(`/api/posts/${post._id}/comments`)
      .set(auth(commenterToken))
      .send({ text: "Delete my own comment" });

    expect(createResponse.status).toBe(201);

    const commentId = createResponse.body.comment._id;

    const response = await request(app)
      .delete(`/api/posts/${post._id}/comments/${commentId}`)
      .set(auth(commenterToken));

    expect(response.status).toBe(200);
    expect(await Comment.exists({ _id: commentId })).toBeNull();
  });

  test("rejects an invalid comment ID", async () => {
    const response = await request(app)
      .delete(`/api/posts/${post._id}/comments/invalid-id`)
      .set(auth(commenterToken));

    expect(response.status).toBe(400);
  });

  test("returns 404 when deleting a nonexistent comment", async () => {
    const missingCommentId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .delete(`/api/posts/${post._id}/comments/${missingCommentId}`)
      .set(auth(commenterToken));

    expect(response.status).toBe(404);
  });

  test("returns 404 when the comment belongs to a different post", async () => {
    const otherPost = await Post.create({
      author: author._id,
      caption: "Different post for ownership test",
      media: [
        {
          type: "image",
          url: "https://example.com/other.jpg",
          publicId: `comments-other-${testId}`,
          width: 640,
          height: 480,
        },
      ],
    });

    try {
      const response = await request(app)
        .delete(`/api/posts/${otherPost._id}/comments/${comment._id}`)
        .set(auth(authorToken));

      expect(response.status).toBe(404);
    } finally {
      await Post.deleteOne({ _id: otherPost._id });
    }
  });
});
