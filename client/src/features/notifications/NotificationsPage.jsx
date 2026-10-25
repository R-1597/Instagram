
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, UserRound, CheckCheck } from "lucide-react";
import { Link } from "react-router-dom";
import {
    getNotifications,

    deleteNotification,

} from "./notificationService";

export default function NotificationsPage() {
    const queryClient = useQueryClient();

    const { data, isPending, isError } = useQuery({
        queryKey: ["notifications"],
        queryFn: () => getNotifications(1, 20),
    });

    const notifications = data?.notifications ?? [];

    const deleteMutation = useMutation({
        mutationFn: deleteNotification,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["notifications"],
            });

            queryClient.invalidateQueries({
                queryKey: ["unreadNotificationCount"],
            });
        },
    });



    if (isPending) {
        return <main className="mx-auto max-w-2xl p-6">Loading notifications...</main>;
    }

    if (isError) {
        return (
            <main className="mx-auto max-w-2xl p-6">
                Couldn't load notifications. Please try again.
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-2xl p-4 sm:p-6">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Notifications</h1>


            </div>

            {notifications.length === 0 ? (
                <div className="rounded-xl border border-neutral-200 p-10 text-center">
                    <Heart className="mx-auto mb-3" size={32} />
                    <h2 className="font-semibold">No notifications yet</h2>
                    <p className="mt-1 text-sm text-neutral-500">
                        When someone interacts with you, you'll see it here.
                    </p>
                </div>
            ) : (
                <div className="divide-y divide-neutral-200">

                    {notifications.map((item) => {
                        const actor = item.actor;
                        const actorId = actor?._id || actor?.id;
                        const actorName =
                            actor?.username || actor?.displayName || "Someone";


                        const message =
                            item.type === "follow"
                                ? "started following you."
                                : item.type === "unfollow"
                                    ? "unfollowed you."
                                    : item.type === "like"
                                        ? "liked your post."
                                        : item.type === "comment"
                                            ? "commented on your post."
                                            : "interacted with you.";


                        function openActorProfile() {
                            if (actorId) {
                                deleteMutation.mutate(item._id);
                            }
                        }

                        return (
                            <div
                                key={item._id}
                                className="flex items-center gap-3 border-b border-neutral-200 px-2 py-4"
                            >
                                <Link
                                    to={actorId ? `/profile/${actorId}` : "/notifications"}
                                    onClick={openActorProfile}
                                    className="shrink-0"
                                    aria-label={`View ${actorName}'s profile`}
                                >
                                    {actor?.profileImage ? (
                                        <img
                                            src={actor.profileImage}
                                            alt={`${actorName}'s profile`}
                                            className="h-11 w-11 rounded-full object-cover"
                                        />
                                    ) : (
                                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-200">
                                            <UserRound size={22} />
                                        </span>
                                    )}
                                </Link>

                                <div className="min-w-0 flex-1">
                                    <p className="text-sm">
                                        <Link
                                            to={actorId ? `/profile/${actorId}` : "/notifications"}
                                            onClick={openActorProfile}
                                            className="font-semibold hover:underline"
                                        >
                                            {actorName}
                                        </Link>{" "}
                                        {message}
                                    </p>

                                    <p className="mt-1 text-xs text-neutral-500">
                                        {item.createdAt
                                            ? new Date(item.createdAt).toLocaleString()
                                            : ""}
                                    </p>
                                </div>
                            </div>
                        );
                    })}

                </div>
            )}
        </main>
    );
}
