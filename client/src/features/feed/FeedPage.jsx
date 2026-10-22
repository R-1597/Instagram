

import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { getFollowStatus, followUser, unfollowUser, } from "@/features/profiles/profileService";
import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import { getHomeFeed, likePost, unlikePost } from "./feedService";
import { useEffect, useRef, useState } from "react";
import CommentsSection from "./CommentsSection";

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

function PostFollowButton({ authorId }) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const currentUserId = String(user?.id ?? user?._id ?? "");
    const targetUserId = String(authorId ?? "");

    const statusQuery = useQuery({
        queryKey: ["followStatus", targetUserId],
        queryFn: () => getFollowStatus(targetUserId),
        enabled: Boolean(
            targetUserId && currentUserId &&
            targetUserId !== currentUserId
        ),
    });

    const mutation = useMutation({
        mutationFn: () =>
            statusQuery.data?.isFollowing
                ? unfollowUser(targetUserId)
                : followUser(targetUserId),

        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ["followStatus", targetUserId],
                }),
                queryClient.invalidateQueries({
                    queryKey: ["followCounts"],
                }),
                queryClient.invalidateQueries({
                    queryKey: ["followers"],
                }),
                queryClient.invalidateQueries({
                    queryKey: ["following"],
                }),
            ]);
        },
    });

    if (!targetUserId || targetUserId === currentUserId) {
        return null;
    }

    if (statusQuery.isPending) {
        return (
            <span className="text-xs text-neutral-400">
                ...
            </span>
        );
    }

    if (statusQuery.isError) {
        return (
            <button
                type="button"
                onClick={() => statusQuery.refetch()}
                className="text-sm font-semibold text-neutral-700"
            >
                Retry
            </button>
        );
    }

    return (
        <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
            {mutation.isPending
                ? "..."
                : statusQuery.data?.isFollowing
                    ? "Following"
                    : "Follow"}
        </button>
    );
}

function PostCard({ post }) {
    const [showComments, setShowComments] = useState(false);
    // Track the number of comments on this post
    const commentCount = post.commentCount ?? 0;


    const author =
        post.author && typeof post.author === "object" ? post.author : {};

    const username = author.username || "unknown";
    const displayName = author.displayName || username;
    const media = Array.isArray(post.media) ? post.media : [];



    const queryClient = useQueryClient();

    const likeMutation = useMutation({
        mutationFn: ({ postId, shouldUnlike }) =>
            shouldUnlike ? unlikePost(postId) : likePost(postId),

        onMutate: async ({ postId, shouldUnlike }) => {
            await queryClient.cancelQueries({ queryKey: ["homeFeed"] });

            const previousFeed = queryClient.getQueryData(["homeFeed"]);

            queryClient.setQueryData(["homeFeed"], (old) => {
                if (!old?.posts) return old;

                return {
                    ...old,
                    posts: old.posts.map((item) => {
                        if (item._id !== postId) return item;

                        return {
                            ...item,
                            isLikedByMe: !shouldUnlike,
                            likeCount: Math.max(
                                0,
                                (item.likeCount ?? 0) + (shouldUnlike ? -1 : 1)
                            ),
                        };
                    }),
                };
            });

            return { previousFeed };
        },

        onError: (_error, _variables, context) => {
            if (context?.previousFeed) {
                queryClient.setQueryData(["homeFeed"], context.previousFeed);
            }
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["homeFeed"] });
        },
    });


    return (
        <article className="mb-8 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <header className="flex items-center gap-3 px-4 py-4">
                <Link
                    to={author._id || author.id
                        ? `/profile/${author._id || author.id}`
                        : "/profile"}
                    aria-label={`View ${username}'s profile`}
                    className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-neutral-400"
                >
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
                </Link>

                <div className="min-w-0 flex-1">
                    <Link
                        to={`/profile/${author._id || author.id}`}
                        className="block truncate text-sm font-semibold hover:underline"
                    >
                        {username}
                    </Link>

                    {displayName !== username && (
                        <p className="truncate text-xs text-neutral-500">
                            {displayName}
                        </p>
                    )}
                </div>

                <PostFollowButton authorId={author._id || author.id} />


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


                    <button
                        type="button"
                        disabled={likeMutation.isPending}
                        onClick={() =>
                            likeMutation.mutate({
                                postId: post._id,
                                shouldUnlike: Boolean(post.isLikedByMe),
                            })
                        }
                        aria-label={post.isLikedByMe ? "Unlike post" : "Like post"}
                        aria-pressed={Boolean(post.isLikedByMe)}
                        className="flex items-center gap-2 disabled:opacity-60"
                    >
                        <Heart
                            size={22}
                            className={
                                post.isLikedByMe
                                    ? "fill-rose-500 text-rose-500"
                                    : "text-neutral-700"
                            }
                        />
                        <span className="text-sm">{post.likeCount ?? 0}</span>
                    </button>



                    <button
                        type="button"
                        onClick={() => setShowComments((visible) => !visible)}
                        aria-expanded={showComments}
                        aria-label={`${commentCount} comments`}
                        className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900"
                    >
                        <MessageCircle size={22} />
                        <span className="text-sm">{commentCount}</span>
                    </button>

                </div>

                {post.caption && (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                        <Link
                            to={author._id || author.id
                                ? `/profile/${author._id || author.id}`
                                : "/profile"}
                            className="mr-2 font-semibold hover:underline"
                        >
                            {username}
                        </Link>
                        {post.caption}
                    </p>
                )}

                {post.isLikedByMe && (
                    <p className="mt-2 text-xs text-rose-600">You liked this post</p>
                )}
            </div>
            {showComments && <CommentsSection post={post} />}
        </article>
    );
}


export default function FeedPage() {

    const loadMoreRef = useRef(null);

    const {
        data,
        isPending,
        isError,
        error,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: ["homeFeed"],
        initialPageParam: 1,
        queryFn: ({ pageParam }) => getHomeFeed(pageParam, 10),
        getNextPageParam: (lastPage) => {
            if (!lastPage?.pagination?.hasNextPage) {
                return undefined;
            }

            return lastPage.pagination.page + 1;
        },
    });

    const posts = data?.pages.flatMap((page) => page.posts ?? []) ?? [];

    useEffect(() => {
        const sentinel = loadMoreRef.current;

        if (!sentinel || !hasNextPage || isFetchingNextPage) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    fetchNextPage();
                }
            },
            {
                root: null,
                rootMargin: "300px",
                threshold: 0,
            }
        );

        observer.observe(sentinel);

        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    return (
        <section className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-8">
            <header className="mb-8 flex items-center justify-between md:hidden">
                <h1 className="font-serif text-2xl font-semibold">
                    InstaSpace
                </h1>
                <Heart size={24} />
            </header>

            <div className="mx-auto max-w-2xl">
                <div className="mb-8">
                    <p className="text-sm text-neutral-500">
                        YOUR COMMUNITY
                    </p>
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
                        <h3 className="font-semibold">
                            Couldn't load your feed
                        </h3>
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
                        <h3 className="text-lg font-semibold">
                            Your feed starts here
                        </h3>
                        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-neutral-500">
                            No posts yet. Create a post or check back when
                            your community shares something.
                        </p>
                    </div>
                )}

                {!isError &&
                    posts.map((post) => (
                        <PostCard key={post._id} post={post} />
                    ))}

                {hasNextPage && (
                    <div
                        ref={loadMoreRef}
                        className="flex justify-center py-6"
                        aria-live="polite"
                    >
                        {isFetchingNextPage && (
                            <p className="text-sm text-neutral-500">
                                Loading more posts...
                            </p>
                        )}
                    </div>
                )}

                {!hasNextPage && posts.length > 0 && (
                    <p className="py-6 text-center text-sm text-neutral-400">
                        You're all caught up.
                    </p>
                )}
            </div>
        </section>
    );
}

