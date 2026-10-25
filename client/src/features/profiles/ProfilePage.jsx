
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, UserRound, X } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { getCurrentUser, getUserProfile, getUserPosts, getFollowCounts, getFollowers, getFollowing, getFollowStatus, followUser, unfollowUser, } from "./profileService";
import PostDetailModal from "@/features/posts/PostDetailModal";
import EditProfileCard from "./EditProfileCard";
import ProfileImageModal from "../../components/common/ProfileImageModal";

function formatCount(value) {
    return new Intl.NumberFormat().format(value ?? 0);
}

function getErrorMessage(error, fallback) {
    return error?.response?.data?.message || fallback;
}

function FollowAction({ targetUserId, onChanged }) {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const currentUserId = String(user?.id ?? user?._id ?? "");

    const statusQuery = useQuery({
        queryKey: ["followStatus", targetUserId],
        queryFn: () => getFollowStatus(targetUserId),
        enabled: Boolean(targetUserId && currentUserId !== String(targetUserId)),
    });

    const mutation = useMutation({
        mutationFn: () =>
            statusQuery.data?.isFollowing
                ? unfollowUser(targetUserId)
                : followUser(targetUserId),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["followStatus", targetUserId] }),
                queryClient.invalidateQueries({ queryKey: ["followCounts"] }),
                queryClient.invalidateQueries({ queryKey: ["followers"] }),
                queryClient.invalidateQueries({ queryKey: ["following"] }),
            ]);

            onChanged?.();
        },
    });

    if (!targetUserId || currentUserId === String(targetUserId)) {
        return null;
    }

    if (statusQuery.isPending) {
        return (
            <span className="text-xs text-neutral-400">
                Checking...
            </span>
        );
    }

    if (statusQuery.isError) {
        return (
            <button
                type="button"
                onClick={() => statusQuery.refetch()}
                className="text-sm font-semibold text-neutral-600 hover:text-neutral-900"
            >
                Retry
            </button>
        );
    }

    const isFollowing = statusQuery.data?.isFollowing;

    return (
        <div className="text-right">
            <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
                className="text-sm font-semibold text-neutral-900 hover:text-neutral-500 disabled:opacity-50"
            >
                {mutation.isPending
                    ? "Please wait..."
                    : isFollowing
                        ? "Following"
                        : "Follow"}
            </button>

            {mutation.isError && (
                <p role="alert" className="mt-1 text-xs text-red-600">
                    {getErrorMessage(mutation.error, "Action failed. Try again.")}
                </p>
            )}
        </div>
    );
}

function RelationshipDialog({
    userId,
    type,
    total,
    onClose,
}) {
    const queryClient = useQueryClient();
    const isFollowers = type === "followers";

    const listQuery = useQuery({
        queryKey: [type, userId],
        queryFn: () =>
            isFollowers ? getFollowers(userId) : getFollowing(userId),
        enabled: Boolean(userId),
    });

    const users = listQuery.data?.users ?? [];

    async function refreshLists() {
        await queryClient.invalidateQueries({
            queryKey: ["followCounts", userId],
        });
        await queryClient.invalidateQueries({
            queryKey: ["followers", userId],
        });
        await queryClient.invalidateQueries({
            queryKey: ["following", userId],
        });
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="relationship-title"
                className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            >
                <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
                    <div>
                        <h2 id="relationship-title" className="font-semibold">
                            {isFollowers ? "Followers" : "Following"}
                        </h2>
                        <p className="text-xs text-neutral-500">
                            {formatCount(total)} total
                            {users.length < total
                                ? ` · Showing ${users.length}`
                                : ""}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close list"
                        className="rounded-lg p-2 hover:bg-neutral-100"
                    >
                        <X size={20} />
                    </button>
                </header>

                <div className="overflow-y-auto p-4">
                    {listQuery.isPending && (
                        <div className="flex justify-center py-8">
                            <LoaderCircle className="animate-spin" />
                        </div>
                    )}

                    {listQuery.isError && (
                        <div className="py-6 text-center">
                            <p role="alert" className="text-sm text-red-600">
                                {getErrorMessage(listQuery.error, "Couldn't load users.")}
                            </p>
                            <button
                                type="button"
                                onClick={() => listQuery.refetch()}
                                className="mt-3 text-sm font-semibold underline"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {listQuery.isSuccess && users.length === 0 && (
                        <p className="py-8 text-center text-sm text-neutral-500">
                            {isFollowers
                                ? "No followers yet."
                                : "Not following anyone yet."}
                        </p>
                    )}

                    {users.map((person) => {
                        if (!person?._id) return null;

                        return (
                            <div
                                key={person._id}
                                className="flex items-center gap-3 py-3"
                            >
                                {person.profileImage ? (
                                    <img
                                        src={person.profileImage}
                                        alt=""
                                        className="size-11 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-neutral-100">
                                        <UserRound size={20} />
                                    </div>
                                )}

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold">
                                        {person.username}
                                    </p>
                                    {person.displayName && (
                                        <p className="truncate text-sm text-neutral-500">
                                            {person.displayName}
                                        </p>
                                    )}
                                </div>

                                <FollowAction
                                    targetUserId={person._id}
                                    onChanged={refreshLists}
                                />
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

export default function ProfilePage() {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const { user: authUser } = useAuth();
    const [selectedPost, setSelectedPost] = useState(null);
    const [activeList, setActiveList] = useState(null);
    const [selectedProfileImage, setSelectedProfileImage] = useState(null);

    const { userId: routeUserId } = useParams();
    const isOwnProfile = !routeUserId;

    const profileQuery = useQuery({
        queryKey: isOwnProfile
            ? ["currentUser"]
            : ["userProfile", routeUserId],
        queryFn: () =>
            isOwnProfile
                ? getCurrentUser()
                : getUserProfile(routeUserId),
    });

    const profile = profileQuery.data;
    const userId = String(
        profile?.id ?? profile?._id ?? routeUserId ?? authUser?.id ?? authUser?._id ?? ""
    );

    const postsQuery = useQuery({
        queryKey: ["userPosts", userId],
        queryFn: () => getUserPosts(userId),
        enabled: Boolean(userId),
    });

    const countsQuery = useQuery({
        queryKey: ["followCounts", userId],
        queryFn: () => getFollowCounts(userId),
        enabled: Boolean(userId),
    });

    const posts = postsQuery.data?.posts ?? [];
    const totalPosts =
        postsQuery.data?.pagination?.totalPosts ?? posts.length;
    const counts = countsQuery.data;

    if (profileQuery.isPending) {
        return (
            <div className="flex justify-center py-20">
                <LoaderCircle className="animate-spin" />
            </div>
        );
    }

    if (profileQuery.isError || !profile) {
        return (
            <section className="mx-auto max-w-3xl px-5 py-10">
                <h1 className="text-2xl font-semibold">Your profile</h1>
                <p role="alert" className="mt-3 text-sm text-red-600">
                    {getErrorMessage(profileQuery.error, "Couldn't load your profile.")}
                </p>
                <button
                    type="button"
                    onClick={() => profileQuery.refetch()}
                    className="mt-4 rounded-lg border px-4 py-2 text-sm font-semibold"
                >
                    Try again
                </button>
            </section>
        );
    }

    return (
        <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
            <header className="flex flex-col gap-6 border-b border-neutral-200 pb-8 sm:flex-row sm:items-center sm:gap-12">

                <div className="flex shrink-0 justify-center sm:w-44">
                    <img
                        src={profile.profileImage || "/default-avatar.png"}
                        alt={`${profile.username}'s profile`}
                        onClick={() => {
                            if (profile.profileImage) {
                                setSelectedProfileImage({
                                    imageUrl: profile.profileImage,
                                    username: profile.username,
                                });
                            }
                        }}
                        className="h-32 w-32 cursor-pointer rounded-full object-cover"
                    />
                </div>


                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-4">
                        <h1 className="text-xl font-normal">{profile.username}</h1>
                        {isOwnProfile ? (
                            <button
                                type="button"
                                onClick={() => setIsEditOpen(true)}
                                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold hover:bg-neutral-50"
                            >
                                Edit profile
                            </button>
                        ) : (
                            <FollowAction
                                targetUserId={userId}
                                onChanged={() => {
                                    countsQuery.refetch();
                                }}
                            />
                        )}
                    </div>

                    <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                        <span>
                            <strong>{formatCount(totalPosts)}</strong>{" "}
                            {totalPosts === 1 ? "post" : "posts"}
                        </span>

                        <button
                            type="button"
                            onClick={() => setActiveList("followers")}
                            className="hover:text-neutral-500"
                        >
                            <strong>
                                {countsQuery.isError
                                    ? "—"
                                    : formatCount(counts?.followers)}
                            </strong>{" "}
                            followers
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveList("following")}
                            className="hover:text-neutral-500"
                        >
                            <strong>
                                {countsQuery.isError
                                    ? "—"
                                    : formatCount(counts?.following)}
                            </strong>{" "}
                            following
                        </button>
                    </div>

                    {countsQuery.isError && (
                        <p role="alert" className="mt-3 text-xs text-red-600">
                            Couldn't load follower counts.{" "}
                            <button
                                type="button"
                                onClick={() => countsQuery.refetch()}
                                className="underline"
                            >
                                Retry
                            </button>
                        </p>
                    )}

                    <div className="mt-5">
                        {profile.displayName && (
                            <p className="text-sm font-semibold">{profile.displayName}</p>
                        )}
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                            {profile.bio || "No bio yet."}
                        </p>
                    </div>
                </div>
            </header>

            <section className="pt-6">
                <h2 className="sr-only">Your posts</h2>

                {postsQuery.isPending && (
                    <div className="flex justify-center py-12">
                        <LoaderCircle className="animate-spin" />
                    </div>
                )}

                {postsQuery.isError && (
                    <div className="py-10 text-center">
                        <p role="alert" className="text-sm text-red-600">
                            {getErrorMessage(postsQuery.error, "Couldn't load your posts.")}
                        </p>
                        <button
                            type="button"
                            onClick={() => postsQuery.refetch()}
                            className="mt-3 text-sm font-semibold underline"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {postsQuery.isSuccess && posts.length === 0 && (
                    <div className="py-16 text-center">
                        <div className="mx-auto flex size-16 items-center justify-center rounded-full border-2 border-neutral-900">
                            <UserRound size={30} />
                        </div>
                        <h2 className="mt-4 text-xl font-semibold">Share your moments</h2>
                        <p className="mt-2 text-sm text-neutral-500">
                            Your posts will appear here.
                        </p>
                    </div>
                )}

                {posts.length > 0 && (
                    <div className="grid grid-cols-3 gap-1 sm:gap-4">
                        {posts.map((post) => {
                            const media = post.media?.[0];

                            return (
                                <article
                                    key={post._id}
                                    onClick={() => setSelectedPost(post)}
                                    className="group relative aspect-square overflow-hidden bg-neutral-100"
                                >
                                    {media?.url ? (
                                        <img
                                            src={media.url}
                                            alt={post.caption || "Post"}
                                            loading="lazy"
                                            className="size-full object-cover transition-transform group-hover:scale-[1.02]"
                                        />
                                    ) : (
                                        <div className="flex size-full items-center justify-center p-2 text-center text-xs text-neutral-500">
                                            {post.caption || "Post"}
                                        </div>
                                    )}

                                    {post.caption && (
                                        <div className="absolute inset-x-0 bottom-0 hidden bg-black/60 p-2 text-xs text-white group-hover:block">
                                            <p className="line-clamp-2">{post.caption}</p>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}

                {postsQuery.data?.pagination?.hasNextPage && (
                    <p className="mt-5 text-center text-xs text-neutral-500">
                        Showing the latest {posts.length} posts.
                    </p>
                )}
                {isOwnProfile && isEditOpen && (
                    <EditProfileCard
                        profile={profile}
                        onClose={() => setIsEditOpen(false)}
                    />
                )}
            </section>

            {activeList && userId && (
                <RelationshipDialog
                    userId={userId}
                    type={activeList}
                    total={
                        activeList === "followers"
                            ? counts?.followers ?? 0
                            : counts?.following ?? 0
                    }
                    onClose={() => setActiveList(null)}
                />
            )}
            {selectedPost && (
                <PostDetailModal
                    post={selectedPost}
                    profile={profile}
                    isOwnProfile={isOwnProfile}
                    onClose={() => setSelectedPost(null)}
                />
            )}
            {selectedProfileImage && (
                <ProfileImageModal
                    imageUrl={selectedProfileImage.imageUrl}
                    username={selectedProfileImage.username}
                    onClose={() => setSelectedProfileImage(null)}
                />
            )}
        </section>
    );
}
