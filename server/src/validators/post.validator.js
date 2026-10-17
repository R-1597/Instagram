const { z } = require("zod");

const createPostSchema = z
  .object({
    caption: z.string().trim().max(2200).optional().default(""),
    media: z
      .array(
        z
          .object({
            type: z.enum(["image", "video"]),
            url: z.string().url(),
            publicId: z.string().trim().min(1),
            width: z.number().int().positive().optional(),
            height: z.number().int().positive().optional(),
          })
          .strict()
      )
      .min(1, "At least one media item is required")
      .max(10, "A post can contain at most 10 media items"),
  })
  .strict();

module.exports = { createPostSchema };