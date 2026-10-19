const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const app = require("../src/app");
const connectDB = require("../src/config/db");

const User = require("../src/models/User");
const Notification = require("../src/models/Notification");

const testId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

let user;
let otherUser;
let userToken;
let otherUserToken;
let notification;
let otherNotification;

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

function createToken(testUser) {
  return jwt.sign(
    {
      sub: testUser._id.toString(),
      tokenVersion: testUser.tokenVersion ?? 0,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
      issuer: "instagram-clone-api",
      audience: "instagram-clone-client",
      algorithm: "HS256",
    }
  );
}

beforeAll(async () => {
  await connectDB();

  user = await User.create({
    username: `notif_${testId.slice(-20)}`,
    email: `notification_${testId}@example.com`,
    displayName: "Notification Test User",
    passwordHash: "TestPassword123!",
  });

  otherUser = await User.create({
    username: `notifother_${testId.slice(-18)}`,
    email: `notification_other_${testId}@example.com`,
    displayName: "Other Test User",
    passwordHash: "TestPassword123!",
  });

  userToken = createToken(user);
  otherUserToken = createToken(otherUser);
}, 60000);

beforeEach(async () => {
  await Notification.deleteMany({
    $or: [
      { recipient: user._id },
      { recipient: otherUser._id },
      { actor: user._id },
      { actor: otherUser._id },
    ],
  });

  notification = await Notification.create({
    recipient: user._id,
    actor: otherUser._id,
    type: "follow",
    isRead: false,
  });

  otherNotification = await Notification.create({
    recipient: otherUser._id,
    actor: user._id,
    type: "like",
    isRead: false,
  });
});

afterAll(async () => {
  try {
    if (user && otherUser) {
      await Notification.deleteMany({
        $or: [
          { recipient: user._id },
          { recipient: otherUser._id },
          { actor: user._id },
          { actor: otherUser._id },
        ],
      });

      await User.deleteMany({
        _id: { $in: [user._id, otherUser._id] },
      });
    }
  } finally {
    await mongoose.disconnect();
  }
}, 60000);

describe("Notifications API", () => {
  test("should retrieve the authenticated user's notifications", async () => {
    const response = await request(app)
      .get("/api/notifications/")
      .set(authHeader(userToken));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.notifications)).toBe(true);

    expect(
      response.body.notifications.some(
        (item) => item._id.toString() === notification._id.toString()
      )
    ).toBe(true);
  });

  test("should return the unread notification count", async () => {
    const response = await request(app)
      .get("/api/notifications/unread-count")
      .set(authHeader(userToken));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.unreadCount).toBe(1);
  });

  test("should mark a notification as read", async () => {
    const response = await request(app)
      .patch(`/api/notifications/${notification._id}/read`)
      .set(authHeader(userToken));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const updated = await Notification.findById(notification._id);
    expect(updated.isRead).toBe(true);
  });

  test("should return 404 when marking another user's notification as read", async () => {
    const response = await request(app)
      .patch(`/api/notifications/${otherNotification._id}/read`)
      .set(authHeader(userToken));

    expect(response.status).toBe(404);

    const unchanged = await Notification.findById(otherNotification._id);
    expect(unchanged.isRead).toBe(false);
  });

  test("should return 400 for an invalid notification ID", async () => {
    const response = await request(app)
      .patch("/api/notifications/invalid-id/read")
      .set(authHeader(userToken));

    expect(response.status).toBe(400);
  });

  test("should return 404 for a nonexistent notification", async () => {
    const nonexistentId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .patch(`/api/notifications/${nonexistentId}/read`)
      .set(authHeader(userToken));

    expect(response.status).toBe(404);
  });

  test("should mark all of the authenticated user's notifications as read", async () => {
    await Notification.create({
      recipient: user._id,
      actor: otherUser._id,
      type: "comment",
      isRead: false,
    });

    const response = await request(app)
      .patch("/api/notifications/read-all")
      .set(authHeader(userToken));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const unreadCount = await Notification.countDocuments({
      recipient: user._id,
      isRead: false,
    });

    expect(unreadCount).toBe(0);
  });

  test("mark all as read should not change another user's notifications", async () => {
    const response = await request(app)
      .patch("/api/notifications/read-all")
      .set(authHeader(userToken));

    expect(response.status).toBe(200);

    const unchanged = await Notification.findById(otherNotification._id);
    expect(unchanged.isRead).toBe(false);
  });

  test("should reject retrieving notifications without authentication", async () => {
    const response = await request(app)
      .get("/api/notifications/");

    expect(response.status).toBe(401);
  });

  test("should reject unread-count requests without authentication", async () => {
    const response = await request(app)
      .get("/api/notifications/unread-count");

    expect(response.status).toBe(401);
  });

  test("should reject marking a notification as read without authentication", async () => {
    const response = await request(app)
      .patch(`/api/notifications/${notification._id}/read`);

    expect(response.status).toBe(401);
  });

  test("should reject mark-all requests without authentication", async () => {
    const response = await request(app)
      .patch("/api/notifications/read-all");

    expect(response.status).toBe(401);
  });
});