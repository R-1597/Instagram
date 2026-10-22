
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, UserRound, X } from "lucide-react";
import { updateCurrentUser } from "./profileService";

export default function EditProfileCard({ profile, onClose }) {
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [profileImage, setProfileImage] = useState(
    profile.profileImage ?? ""
  );
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const mutation = useMutation({
    mutationFn: updateCurrentUser,

    onSuccess: async (updatedUser) => {
      queryClient.setQueryData(["currentUser"], updatedUser);

      await queryClient.invalidateQueries({
        queryKey: ["currentUser"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["userPosts"],
      });

      onClose();
    },
  });

  function handleSubmit(event) {
    event.preventDefault();

    mutation.mutate({
      displayName: displayName.trim(),
      bio: bio.trim(),
      profileImage: profileImage.trim(),
    });
  }

  const imageUrl = profileImage.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-5 sm:px-8">
          <div>
            <h2
              id="edit-profile-title"
              className="text-xl font-semibold text-neutral-900"
            >
              Edit Profile
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Personalize how people see you.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit profile"
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
          >
            <X size={22} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-col items-center gap-4 rounded-xl bg-neutral-50 p-5 sm:flex-row sm:gap-6">
            {imageUrl && !imageError ? (
              <img
                src={imageUrl}
                alt="Profile preview"
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
                className="size-24 shrink-0 rounded-full border border-neutral-200 object-cover"
              />
            ) : (
              <div className="flex size-24 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-400">
                <UserRound size={42} />
              </div>
            )}

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="font-semibold">{profile.username}</p>
              <p className="mt-1 text-sm text-neutral-500">
                Profile picture
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                Paste a publicly accessible image URL below.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="profile-image"
              className="mb-2 block text-sm font-medium"
            >
              Profile image URL
            </label>

            <input
              id="profile-image"
              type="url"
              value={profileImage}
              onChange={(event) => {
                setProfileImage(event.target.value);
                setImageError(false);
              }}
              maxLength={2048}
              placeholder="https://example.com/your-photo.jpg"
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />

            {imageError && (
              <p className="mt-2 text-xs text-amber-700">
                This image couldn't be previewed. Check the URL before saving.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="display-name"
              className="mb-2 block text-sm font-medium"
            >
              Name
            </label>

            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={50}
              required
              placeholder="Your display name"
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />

            <p className="mt-1 text-right text-xs text-neutral-400">
              {displayName.length}/50
            </p>
          </div>

          <div>
            <label
              htmlFor="profile-bio"
              className="mb-2 block text-sm font-medium"
            >
              Bio
            </label>

            <textarea
              id="profile-bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={160}
              rows={4}
              placeholder="Tell people a little about yourself..."
              className="w-full resize-y rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />

            <p className="mt-1 text-right text-xs text-neutral-400">
              {bio.length}/160
            </p>
          </div>

          {mutation.isError && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {mutation.error?.response?.data?.message ||
                "Couldn't update your profile. Please try again."}
            </p>
          )}

          <footer className="flex flex-col-reverse gap-3 border-t border-neutral-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={mutation.isPending || !displayName.trim()}
              className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {mutation.isPending && (
                <LoaderCircle size={17} className="animate-spin" />
              )}
              {mutation.isPending ? "Saving..." : "Save changes"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
