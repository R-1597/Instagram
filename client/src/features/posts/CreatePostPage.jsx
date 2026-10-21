
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, X, LoaderCircle, Upload } from "lucide-react";
import { createPost, uploadPostImage } from "../../features/feed/feedService";

export default function CreatePostPage() {
  const queryClient = useQueryClient();

  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const postMutation = useMutation({
    mutationFn: async ({ selectedFile, postCaption }) => {
      // Step 1: Upload the image to Cloudinary through our backend.
      const uploadResult = await uploadPostImage(selectedFile);
      const uploadedMedia = uploadResult.media;

      // Step 2: Create the post using the verified media metadata.
      return createPost({
        caption: postCaption.trim(),
        media: [uploadedMedia],
      });
    },

    onSuccess: () => {
      setFile(null);
      setCaption("");
      setErrorMessage("");
      setSuccessMessage("Your post was published successfully.");

      queryClient.invalidateQueries({ queryKey: ["homeFeed"] });
    },

    onError: (error) => {
      setSuccessMessage("");
      setErrorMessage(
        error.response?.data?.message ||
          "Couldn't publish your post. Please try again."
      );
    },
  });

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) return;

    setErrorMessage("");
    setSuccessMessage("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(selectedFile.type)) {
      setErrorMessage("Choose a JPG, PNG, or WebP image.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setErrorMessage("Image size must be 5 MB or less.");
      return;
    }

    setFile(selectedFile);
  }

  function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!file) {
      setErrorMessage("Please select an image first.");
      return;
    }

    postMutation.mutate({
      selectedFile: file,
      postCaption: caption,
    });
  }

  const isSubmitting = postMutation.isPending;

  return (
    <section className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-8 flex items-center gap-3">
        <ImagePlus size={28} />
        <h1 className="text-3xl font-semibold">Create post</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6"
      >
        <div>
          <label className="mb-2 block font-medium" htmlFor="post-image">
            Choose an image
          </label>

          <input
            id="post-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={isSubmitting}
            className="block w-full text-sm text-neutral-600 file:mr-4 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:font-medium"
          />

          <p className="mt-2 text-xs text-neutral-500">
            JPG, PNG, or WebP. Maximum size: 5 MB.
          </p>
        </div>

        {preview && (
          <div className="relative overflow-hidden rounded-xl border border-neutral-200">
            <img
              src={preview}
              alt="Selected post preview"
              className="max-h-[500px] w-full bg-neutral-50 object-contain"
            />

            <button
              type="button"
              onClick={() => setFile(null)}
              disabled={isSubmitting}
              aria-label="Remove selected image"
              className="absolute right-3 top-3 rounded-full bg-white p-2 shadow"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div>
          <label className="mb-2 block font-medium" htmlFor="post-caption">
            Caption
          </label>

          <textarea
            id="post-caption"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={2200}
            rows={4}
            disabled={isSubmitting}
            placeholder="Write a caption..."
            className="w-full resize-y rounded-xl border border-neutral-300 p-3 text-sm outline-none focus:border-neutral-600"
          />

          <p className="mt-1 text-right text-xs text-neutral-500">
            {caption.length}/2200
          </p>
        </div>

        {errorMessage && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        {successMessage && (
          <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {successMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !file}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 py-3 font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <LoaderCircle size={18} className="animate-spin" />
              Uploading and publishing...
            </>
          ) : (
            <>
              <Upload size={18} />
              Share post
            </>
          )}
        </button>
      </form>
    </section>
  );
}
