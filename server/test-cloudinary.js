require("dotenv").config();

const cloudinary = require("./src/config/cloudinary");

async function testCloudinary() {
  try {
    // Tiny PNG generated in memory; no local file required.
    const pngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

    const result = await cloudinary.uploader.upload(
      `data:image/png;base64,${pngBase64}`,
      {
        folder: "social-app/test",
        public_id: `upload-test-${Date.now()}`,
        resource_type: "image",
      }
    );

    console.log("PASS: Cloudinary upload successful");
    console.log("Format:", result.format);
    console.log("Public ID:", result.public_id);
    console.log("Secure URL:", result.secure_url);
  } catch (error) {
    console.error("FAIL: Cloudinary upload failed");
    console.error(error.message);
  }
}

testCloudinary();