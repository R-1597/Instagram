
import { useState ,useEffect  } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Send, Trash2 } from "lucide-react";
import {
    getPostComments,
    createComment,
    deleteComment,
} from "./feedService";
import { useAuth } from "../auth/AuthContext";

function formatCommentTime(date) {
    if (!date) return "";
    return new Date(date).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

export default function CommentsSection({ post , onCommentCountChange  }) {
    const [text, setText] = useState("");
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const queryKey = ["postComments", post._id];

    const {
        data,
        isPending,
        isError,
        error,
    } = useQuery({
        queryKey,
        queryFn: () => getPostComments(post._id),
    });

    const commentCount = data?.pagination?.total ?? data?.comments?.length ?? 0;
    useEffect(() => {
  onCommentCountChange?.(post._id, commentCount);
}, [post._id, commentCount, onCommentCountChange]);

    const addMutation = useMutation({
        mutationFn: (commentText) => createComment(post._id, commentText),
        onSuccess: () => {
            setText("");
            queryClient.invalidateQueries({ queryKey });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (commentId) => deleteComment(post._id, commentId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });

    const comments = data?.comments ?? [];
    const currentUserId = user?.id ?? user?._id;
    const postAuthorId =
        typeof post.author === "object" ? post.author?._id : post.author;

    function handleSubmit(event) {
        event.preventDefault();
        const trimmed = text.trim();

        if (!trimmed || trimmed.length > 2000 || addMutation.isPending) return;

        addMutation.mutate(trimmed);
    }

    return (
        <section className="border-t border-neutral-100 px-4 py-4">
            <form onSubmit={handleSubmit} className="flex items-start gap-2">
                <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    maxLength={2000}
                    rows={2}
                    placeholder="Write a comment..."
                    aria-label="Write a comment"
                    className="min-w-0 flex-1 resize-y rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                />

                <button
                    type="submit"
                    disabled={!text.trim() || addMutation.isPending}
                    aria-label="Post comment"
                    className="rounded-lg bg-neutral-900 p-2 text-white disabled:opacity-50"
                >
                    {addMutation.isPending ? (
                        <LoaderCircle size={18} className="animate-spin" />
                    ) : (
                        <Send size={18} />
                    )}
                </button>
            </form>

            {addMutation.isError && (
                <p role="alert" className="mt-2 text-sm text-red-600">
                    {addMutation.error?.response?.data?.message ||
                        "Couldn't add your comment."}
                </p>
            )}

            {deleteMutation.isError && (
                <p role="alert" className="mt-2 text-sm text-red-600">
                    {deleteMutation.error?.response?.data?.message ||
                        "Couldn't delete the comment."}
                </p>
            )}

            {isPending && (
                <p className="py-4 text-sm text-neutral-500">Loading comments...</p>
            )}

            {isError && (
                <p role="alert" className="py-4 text-sm text-red-600">
                    {error?.response?.data?.message || "Couldn't load comments."}
                </p>
            )}

            {!isPending && !isError && comments.length === 0 && (
                <p className="py-4 text-sm text-neutral-500">
                    No comments yet. Start the conversation.
                </p>
            )}

            <div className="mt-3 space-y-4">
                {comments.map((comment) => {
                    //   const author = comment.author || {};
                    const author =
                        comment.author && typeof comment.author === "object"
                            ? comment.author
                            : {};
                    const authorId =
                        typeof comment.author === "object"
                            ? comment.author?._id
                            : comment.author;

                    const canDelete =
                        currentUserId &&
                        (String(currentUserId) === String(authorId) ||
                            String(currentUserId) === String(postAuthorId));

                    return (
                        <article key={comment._id} className="flex items-start gap-3">
                            {author.profileImage ? (
                                <img
                                    src={author.profileImage}
                                    alt=""
                                    className="size-8 rounded-full object-cover"
                                />
                            ) : (
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold">
                                    {(author.username || "?").charAt(0).toUpperCase()}
                                </div>
                            )}

                            <div className="min-w-0 flex-1">
                                <p className="text-sm">
                                    <span className="mr-2 font-semibold">
                                        {author.username || "Unknown user"}
                                    </span>
                                    <span className="whitespace-pre-wrap break-words">
                                        {comment.text}
                                    </span>
                                </p>
                                <p className="mt-1 text-xs text-neutral-400">
                                    {formatCommentTime(comment.createdAt)}
                                </p>
                            </div>

                            {canDelete && (
                                <button
                                    type="button"
                                    aria-label="Delete comment"
                                    title="Delete comment"
                                    disabled={deleteMutation.isPending}
                                    onClick={() => {
                                        if (window.confirm("Delete this comment?")) {
                                            deleteMutation.mutate(comment._id);
                                        }
                                    }}
                                    className="rounded p-1 text-neutral-400 hover:text-red-600 disabled:opacity-50"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
