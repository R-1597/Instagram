
import { useState } from "react";
import {
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  X,
  Trash2,
  LoaderCircle,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deletePost as deletePostRequest } from "./postService";

export default function PostDetailModal({
  post,
  profile,
  isOwnProfile,
  onClose,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const media = post.media?.[0];
  const mediaType = media?.type?.toLowerCase();

  const deleteMutation = useMutation({
    mutationFn: () => deletePostRequest(post._id),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["userPosts"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["feed"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["homeFeed"],
        }),
      ]);

      onClose();
    },

    onError: (err) => {
      setError(
        err.response?.data?.message ||
          "Couldn't delete this post. Please try again."
      );
    },
  });

  function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this post? This action cannot be undone."
    );

    if (!confirmed) return;

    setError("");
    setMenuOpen(false);
    deleteMutation.mutate();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Post details"
        className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl md:flex-row"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close post"
          className="absolute right-3 top-3 z-20 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 md:hidden"
        >
          <X size={20} />
        </button>

        {/* Left: Post image or video */}
        <div className="flex min-h-0 items-center justify-center bg-black md:w-[60%]">
          {media?.url ? (
            mediaType === "video" ? (
              <video
                src={media.url}
                controls
                playsInline
                className="max-h-[45vh] w-full object-contain md:max-h-[92vh]"
              />
            ) : (
              <img
                src={media.url}
                alt={post.caption || "Post"}
                className="max-h-[45vh] w-full object-contain md:max-h-[92vh]"
              />
            )
          ) : (
            <div className="flex min-h-64 items-center justify-center p-8 text-center text-white">
              {post.caption || "No media available"}
            </div>
          )}
        </div>

        {/* Right: Post details */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white md:w-[40%]">
          <header className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
            {profile.profileImage ? (
              <img
                src={profile.profileImage}
                alt=""
                className="size-9 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-9 items-center justify-center rounded-full bg-neutral-100">
                <span className="text-sm font-semibold">
                  {profile.username?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {profile.username}
              </p>
            </div>

            <div className="relative">
              <button
                type="button"
                aria-label="Post options"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className="rounded-full p-2 hover:bg-neutral-100"
              >
                <MoreHorizontal size={22} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
                  {isOwnProfile && (
                    <button
                      type="button"
                      disabled={deleteMutation.isPending}
                      onClick={handleDelete}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      Delete post
                    </button>
                  )}

                  {!isOwnProfile && (
                    <p className="px-3 py-2 text-sm text-neutral-500">
                      No actions available
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close post"
              className="hidden rounded-full p-2 hover:bg-neutral-100 md:block"
            >
              <X size={20} />
            </button>
          </header>

          {/* Caption and comments area */}
          <div className="min-h-24 flex-1 overflow-y-auto p-4">
            {post.caption ? (
              <div className="flex gap-3">
                {profile.profileImage ? (
                  <img
                    src={profile.profileImage}
                    alt=""
                    className="size-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold">
                    {profile.username?.[0]?.toUpperCase() || "U"}
                  </div>
                )}

                <p className="break-words text-sm">
                  <span className="mr-2 font-semibold">
                    {profile.username}
                  </span>
                  {post.caption}
                </p>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-neutral-500">
                No caption.
              </p>
            )}

            <div className="flex h-full min-h-24 items-center justify-center">
              <div className="text-center">
                <MessageCircle
                  size={25}
                  className="mx-auto text-neutral-400"
                />
                <p className="mt-2 text-sm font-semibold">
                  Comments
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Your comments section can be connected here.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <p role="alert" className="border-t border-red-100 px-4 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          {/* Post actions */}
          <footer className="border-t border-neutral-200 p-4">
            <div className="flex items-center gap-4">
              <button type="button" aria-label="Like post">
                <Heart size={24} />
              </button>
              <button type="button" aria-label="View comments">
                <MessageCircle size={24} />
              </button>
              <div className="flex-1" />
              <button type="button" aria-label="Save post">
                <Bookmark size={24} />
              </button>
            </div>

            {deleteMutation.isPending && (
              <p className="mt-3 flex items-center gap-2 text-sm text-neutral-500">
                <LoaderCircle size={16} className="animate-spin" />
                Deleting post...
              </p>
            )}

            <p className="mt-3 text-xs text-neutral-500">
              {post.createdAt
                ? new Date(post.createdAt).toLocaleDateString()
                : ""}
            </p>
          </footer>
        </div>
      </section>
    </div>
  );
}
