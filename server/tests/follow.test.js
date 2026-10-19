const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const app = require("../src/app");
const connectDB = require("../src/config/db");

const User = require("../src/models/User");
const Follow = require("../src/models/Follow");
const Notification = require("../src/models/Notification");

const testId = Date.now().toString();

let follower;
let target;
let followerToken;
let targetToken;

const authHeader = (token) => ({
  Authorization: `Bearer ${token}`,
});

beforeAll(async () => {
  await connectDB();

  follower = await User.create({
    username: `follower_${testId}`,
    displayName: "Test Follower",
    email: `follower_${testId}@example.com`,
    passwordHash: "TestPassword123!",
  });

  target = await User.create({
    username: `target_${testId}`,
    displayName: "Test Target",
    email: `target_${testId}@example.com`,
    passwordHash: "TestPassword123!",
  });

  const createToken = (user) =>
    jwt.sign(
      {
        sub: user._id.toString(),
        tokenVersion: user.tokenVersion ?? 0,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
        issuer: "instagram-clone-api",
        audience: "instagram-clone-client",
        algorithm: "HS256",
      }
    );

  followerToken = createToken(follower);
  targetToken = createToken(target);
},30000);

afterEach(async () => {
  if (!follower || !target) return;

  await Follow.deleteMany({
    $or: [
      { follower: follower._id },
      { following: follower._id },
      { follower: target._id },
      { following: target._id },
    ],
  });

  await Notification.deleteMany({
    $or: [
      { recipient: follower._id, sender: target._id },
      { recipient: target._id, sender: follower._id },
    ],
  });
});

afterAll(async () => {
  if (follower && target) {
    await Follow.deleteMany({
      $or: [
        { follower: follower._id },
        { following: follower._id },
        { follower: target._id },
        { following: target._id },
      ],
    });

    await Notification.deleteMany({
      $or: [
        { recipient: follower._id },
        { recipient: target._id },
        { sender: follower._id },
        { sender: target._id },
      ],
    });

    await User.deleteMany({
      _id: { $in: [follower._id, target._id] },
    });
  }

  await mongoose.disconnect();
},30000);

describe("Follow API", () => {
  test("should follow another user", async () => {
    const response = await request(app)
      .post(`/api/users/${target._id}/follow`)
      .set(authHeader(followerToken));

    expect(response.status).toBe(201);

    const relationship = await Follow.findOne({
      follower: follower._id,
      following: target._id,
    });

    expect(relationship).not.toBeNull();
  });

  test("should reject duplicate follow requests", async () => {
    await request(app)
      .post(`/api/users/${target._id}/follow`)
      .set(authHeader(followerToken));

    const response = await request(app)
      .post(`/api/users/${target._id}/follow`)
      .set(authHeader(followerToken));

    expect(response.status).toBe(409);
  });

  test("should unfollow a user", async () => {
    await request(app)
      .post(`/api/users/${target._id}/follow`)
      .set(authHeader(followerToken));

    const response = await request(app)
      .delete(`/api/users/${target._id}/follow`)
      .set(authHeader(followerToken));

    expect(response.status).toBe(200);

    const relationship = await Follow.findOne({
      follower: follower._id,
      following: target._id,
    });

    expect(relationship).toBeNull();
  });

  test("should return 404 when unfollowing a user not followed", async () => {
    const response = await request(app)
      .delete(`/api/users/${target._id}/follow`)
      .set(authHeader(followerToken));

    expect(response.status).toBe(404);
  });

  test("should reject following without authentication", async () => {
    const response = await request(app)
      .post(`/api/users/${target._id}/follow`);

    expect(response.status).toBe(401);
  });

  test("should reject unfollowing without authentication", async () => {
    const response = await request(app)
      .delete(`/api/users/${target._id}/follow`);

    expect(response.status).toBe(401);
  });

  test("should reject an invalid user ID", async () => {
    const response = await request(app)
      .post("/api/users/not-a-valid-id/follow")
      .set(authHeader(followerToken));

    expect(response.status).toBe(400);
  });

  test("should return 404 for a nonexistent user", async () => {
    const nonexistentId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .post(`/api/users/${nonexistentId}/follow`)
      .set(authHeader(followerToken));

    expect(response.status).toBe(404);
  });

  test("should prevent users from following themselves", async () => {
    const response = await request(app)
      .post(`/api/users/${follower._id}/follow`)
      .set(authHeader(followerToken));

    expect(response.status).toBe(400);
  });

  test("should create a notification when following another user", async () => {
    const response = await request(app)
      .post(`/api/users/${target._id}/follow`)
      .set(authHeader(followerToken));

    expect(response.status).toBe(201);

    const notification = await Notification.findOne({
      recipient: target._id,
      actor: follower._id,
      type: "follow",
    });

    expect(notification).not.toBeNull();
    expect(notification.type).toBe("follow");

  });

  test("should list a user's followers", async () => {
    await request(app)
      .post(`/api/users/${target._id}/follow`)
      .set(authHeader(followerToken));

    const response = await request(app)
      .get(`/api/users/${target._id}/followers`);

    expect(response.status).toBe(200);
  });

  test("should list users that a user follows", async () => {
    await request(app)
      .post(`/api/users/${target._id}/follow`)
      .set(authHeader(followerToken));

    const response = await request(app)
      .get(`/api/users/${follower._id}/following`);

    expect(response.status).toBe(200);
  });
});