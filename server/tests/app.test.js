
const request = require("supertest");
const app = require("../src/app");

describe("API health checks", () => {
  test("GET /api/health returns HTTP 200", async () => {
    const response = await request(app)
      .get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Instagram backend is running"
    );
  });
});
