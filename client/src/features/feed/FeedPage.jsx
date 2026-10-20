
// import { Camera, Heart, MessageCircle } from "lucide-react";

// export default function FeedPage() {
//   return (
//     <section className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-8">
//       <header className="mb-8 flex items-center justify-between md:hidden">
//         <h1 className="font-serif text-2xl font-semibold">InstaSpace</h1>
//         <Heart size={24} />
//       </header>

//       <div className="mx-auto max-w-2xl">
//         <div className="mb-8">
//           <p className="text-sm text-neutral-500">YOUR COMMUNITY</p>
//           <h2 className="mt-2 text-3xl font-semibold tracking-tight">
//             Your daily inspiration.
//           </h2>
//           <p className="mt-2 text-neutral-500">
//             Discover moments and connect with people.
//           </p>
//         </div>

//         <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-16 text-center">
//           <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-neutral-100">
//             <Camera size={27} />
//           </div>

//           <h3 className="text-lg font-semibold">Your feed starts here</h3>

//           <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-neutral-500">
//             Posts from your community will appear here once we connect the feed
//             to your backend.
//           </p>

//           <div className="mt-5 flex items-center justify-center gap-5 text-xs text-neutral-400">
//             <span className="flex items-center gap-1">
//               <Heart size={14} /> Likes
//             </span>
//             <span className="flex items-center gap-1">
//               <MessageCircle size={14} /> Comments
//             </span>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }



import { useQuery } from "@tanstack/react-query";
import { Camera, Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import { getHomeFeed } from "./feedService";

function formatTime(date) {
  if (!date) return "";

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  );

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;

  return new Date(date).toLocaleDateString();
}

function PostCard({ post }) {
  const author =
    post.author && typeof post.author === "object" ? post.author : {};

  const username = author.username || "unknown";
  const displayName = author.displayName || username;
  const media = Array.isArray(post.media) ? post.media : [];

  return (
    <article className="mb-8 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <header className="flex items-center gap-3 px-4 py-4">
        {author.profileImage ? (
          <img
            src={author.profileImage}
            alt={`${username}'s profile`}
            className="size-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-10 items-center justify-center rounded-full bg-neutral-100 font-semibold">
            {username.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{username}</p>
          {displayName !== username && (
            <p className="truncate text-xs text-neutral-500">{displayName}</p>
          )}
        </div>

        <span className="text-xs text-neutral-500">
          {formatTime(post.createdAt)}
        </span>
        <MoreHorizontal size={21} className="text-neutral-600" />
      </header>

      {media.length > 0 ? (
        <div className="space-y-1">
          {media.map((item, index) =>
            item.type === "video" ? (
              <video
                key={`${item.url}-${index}`}
                src={item.url}
                controls
                playsInline
                className="max-h-[650px] w-full bg-black object-contain"
              />
            ) : (
              <img
                key={`${item.url}-${index}`}
                src={item.url}
                alt={`Post by ${username}`}
                loading="lazy"
                className="max-h-[650px] w-full bg-neutral-50 object-contain"
              />
            )
          )}
        </div>
      ) : (
        <div className="flex min-h-48 items-center justify-center bg-neutral-50 text-neutral-400">
          <Camera size={32} />
        </div>
      )}

      <div className="px-4 py-4">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <Heart size={22} className="text-neutral-700" />
            <span className="text-sm">{post.likeCount ?? 0}</span>
          </div>

          <div className="flex items-center gap-2 text-neutral-500">
            <MessageCircle size={22} />
            <span className="text-sm">Comments</span>
          </div>
        </div>

        {post.caption && (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
            <span className="mr-2 font-semibold">{username}</span>
            {post.caption}
          </p>
        )}

        {post.isLikedByMe && (
          <p className="mt-2 text-xs text-rose-600">You liked this post</p>
        )}
      </div>
    </article>
  );
}

export default function FeedPage() {
  const {
    data,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["homeFeed"],
    queryFn: () => getHomeFeed(1, 10),
  });

  const posts = data?.posts ?? [];

  return (
    <section className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-8">
      <header className="mb-8 flex items-center justify-between md:hidden">
        <h1 className="font-serif text-2xl font-semibold">InstaSpace</h1>
        <Heart size={24} />
      </header>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <p className="text-sm text-neutral-500">YOUR COMMUNITY</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Your daily inspiration.
          </h2>
          <p className="mt-2 text-neutral-500">
            Discover moments and connect with people.
          </p>
        </div>

        {isPending && (
          <div className="space-y-4" aria-live="polite">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="animate-pulse overflow-hidden rounded-2xl border border-neutral-200"
              >
                <div className="h-16 bg-neutral-100" />
                <div className="h-80 bg-neutral-100" />
                <div className="h-20 bg-neutral-50" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div
            className="rounded-2xl border border-red-200 p-6 text-center"
            role="alert"
          >
            <h3 className="font-semibold">Couldn't load your feed</h3>
            <p className="mt-2 text-sm text-neutral-600">
              {error?.response?.data?.message ||
                error?.message ||
                "Something went wrong. Please try again."}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
            >
              Try again
            </button>
          </div>
        )}

        {!isPending && !isError && posts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-neutral-100">
              <Camera size={27} />
            </div>
            <h3 className="text-lg font-semibold">Your feed starts here</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-neutral-500">
              No posts yet. Create a post or check back when your community
              shares something.
            </p>
          </div>
        )}

        {!isPending &&
          !isError &&
          posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
      </div>
    </section>
  );
}
