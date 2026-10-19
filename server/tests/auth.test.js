
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const connectDB = require("../src/config/db");
const User = require("../src/models/User");

const testId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

const testUser = {
  username: `testuser_${testId}`,
  email: `test_${testId}@example.com`,
  password: "TestPassword123!",
  displayName: "Automated Test User",
};

describe("Authentication API integration tests", () => {
  let accessToken;

  beforeAll(async () => {
    await connectDB();
  }, 60000);

  afterAll(async () => {
    try {
      // Delete only the user created by this test.
      await User.deleteOne({ username: testUser.username });
    } finally {
      await mongoose.disconnect();
    }
  }, 60000);

  test("POST /api/auth/register creates a user", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(testUser);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.user.username).toBe(testUser.username);
    expect(response.body.user.email).toBe(testUser.email);

    // Password hashes must never be returned.
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(response.body.user.password).toBeUndefined();
  });

  test("registration rejects a duplicate user", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(testUser);

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  test("registration rejects invalid input", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        username: "ab",
        email: "not-an-email",
        password: "123",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("POST /api/auth/login returns an access token", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.tokenType).toBe("Bearer");
    expect(typeof response.body.accessToken).toBe("string");
    expect(response.body.accessToken.length).toBeGreaterThan(0);

    accessToken = response.body.accessToken;
  });

  test("login rejects an incorrect password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: testUser.email,
        password: "WrongPassword123!",
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test("login rejects invalid input", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "invalid-email",
        password: "",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("returned access token authenticates a protected route", async () => {
    expect(accessToken).toBeDefined();

    const response = await request(app)
      .get("/api/auth/protected")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test("protected route rejects a request without a token", async () => {
  const response = await request(app).get("/api/auth/protected");

  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);
});

test("protected route rejects an invalid token", async () => {
  const response = await request(app)
    .get("/api/auth/protected")
    .set("Authorization", "Bearer invalid.token.value");

  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);
});

test("protected route rejects a malformed Authorization header", async () => {
  const response = await request(app)
    .get("/api/auth/protected")
    .set("Authorization", "Basic sometoken");

  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);
});

test("login rejects an unknown email", async () => {
  const response = await request(app)
    .post("/api/auth/login")
    .send({
      email: `unknown_${testId}@example.com`,
      password: "TestPassword123!",
    });

  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);
});

test("change-password rejects a request without authentication", async () => {
  const response = await request(app)
    .patch("/api/auth/change-password")
    .send({
      currentPassword: testUser.password,
      newPassword: "NewTestPassword123!",
    });

  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);
});

test("change-password rejects invalid input", async () => {
  const response = await request(app)
    .patch("/api/auth/change-password")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      currentPassword: testUser.password,
      newPassword: testUser.password,
    });

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});
});
