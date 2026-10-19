
const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = require("../src/app");
const connectDB = require("../src/config/db");
const User = require("../src/models/User");

const testId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

const testUser = {
  username: `profiletest_${testId}`,
  email: `profile_${testId}@example.com`,
  password: "ProfileTest123!",
};

let userId;
let accessToken;

describe("User profile API integration tests", () => {
  beforeAll(async () => {
    await connectDB();

    const passwordHash = await bcrypt.hash(testUser.password, 12);

    const user = await User.create({
      username: testUser.username,
      email: testUser.email,
      passwordHash,
      displayName: "Original Name",
      bio: "Original bio",
    });

    userId = user._id.toString();

    accessToken = jwt.sign(
      { tokenVersion: user.tokenVersion ?? 0 },
      process.env.JWT_SECRET,
      {
        algorithm: "HS256",
        subject: userId,
        expiresIn: "5m",
        issuer: "instagram-clone-api",
        audience: "instagram-clone-client",
      }
    );
  }, 60000);

  afterAll(async () => {
    try {
      if (userId) {
        await User.deleteOne({ _id: userId });
      }
    } finally {
      await mongoose.disconnect();
    }
  }, 60000);

  test("GET /api/users/me returns the current user's profile", async () => {
    const response = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.user.username).toBe(testUser.username);
    expect(response.body.user.email).toBe(testUser.email);
    expect(response.body.user.displayName).toBe("Original Name");
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  test("PATCH /api/users/me updates display name and bio", async () => {
    const response = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        displayName: "Updated Test Name",
        bio: "Updated test bio",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.user.displayName).toBe("Updated Test Name");
    expect(response.body.user.bio).toBe("Updated test bio");
  });

  test("GET /api/users/me rejects requests without a token", async () => {
    const response = await request(app).get("/api/users/me");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test("PATCH /api/users/me rejects requests without a token", async () => {
    const response = await request(app)
      .patch("/api/users/me")
      .send({ bio: "Should not be saved" });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test("PATCH /api/users/me rejects invalid profile data", async () => {
    const response = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        displayName: "",
        unexpectedField: "not allowed",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("PATCH /api/users/me rejects an empty update", async () => {
    const response = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
