
import { useEffect, useState } from "react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import {
    getConversations,
    startConversation,
    searchMessageUsers,
    getMessages,
    sendMessage,
    markConversationRead,

} from "./messageService";
import { useAuth } from "@/features/auth/AuthContext";
import { connectSocket } from "./socket";
import { Search, X, LoaderCircle, Send } from "lucide-react";

function getErrorMessage(error, fallback) {
    return error?.response?.data?.message || fallback;
}

export default function MessagesPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [searchText, setSearchText] = useState("");
    const [activeConversation, setActiveConversation] = useState(null);
    const [text, setText] = useState("");
    const [conversationError, setConversationError] = useState("");

    const currentUserId = String(user?.id ?? user?._id ?? "");

    // Search users by username or display name.
    const searchQuery = useQuery({
        queryKey: ["messageUserSearch", searchText.trim()],
        queryFn: () => searchMessageUsers(searchText.trim()),
        enabled: searchText.trim().length >= 2,
        staleTime: 10_000,
        retry: 1,
    });

    const searchResults = searchQuery.data?.users ?? [];

    // Load existing conversations.
    const conversationsQuery = useQuery({
        queryKey: ["conversations"],
        queryFn: getConversations,
    });

    // Load history for the selected conversation.
    const conversationId = activeConversation?._id;

    const messagesQuery = useQuery({
        queryKey: ["messages", conversationId],
        queryFn: () => getMessages(conversationId),
        enabled: Boolean(conversationId),
    });

    const conversations = conversationsQuery.data?.conversations ?? [];
    const messages = messagesQuery.data?.messages ?? [];

    function getOtherParticipant(conversation) {
        return conversation?.participants?.find(
            (participant) =>
                String(participant._id ?? participant.id) !== currentUserId
        );
    }

    // Create or retrieve a conversation after clicking a search result.
    const startConversationMutation = useMutation({
        mutationFn: (recipientId) => {
            if (!recipientId) {
                throw new Error("The selected user has no valid ID.");
            }

            return startConversation(String(recipientId));
        },

        onSuccess: async (data) => {
            const conversation = data?.conversation;

            if (!conversation?._id) {
                setConversationError(
                    "The server did not return a valid conversation."
                );
                return;
            }

            setActiveConversation(conversation);
            setSearchText("");
            setConversationError("");

            await queryClient.invalidateQueries({
                queryKey: ["conversations"],
            });
        },

        onError: (error) => {
            console.error("Start conversation failed:", {
                status: error.response?.status,
                response: error.response?.data,
                message: error.message,
            });

            setConversationError(
                getErrorMessage(error, error.message || "Couldn't open conversation.")
            );
        },
    });

    // Send a persistent message through the REST API.
    const sendMutation = useMutation({
        mutationFn: ({ conversationId, text }) =>
            sendMessage(conversationId, text),

        onSuccess: async (data, variables) => {
            setText("");

            // Add the returned message immediately if it isn't already present.
            const newMessage = data?.message;

            if (newMessage) {
                queryClient.setQueryData(
                    ["messages", variables.conversationId],
                    (oldData) => {
                        if (!oldData) return oldData;

                        const exists = oldData.messages?.some(
                            (message) => message._id === newMessage._id
                        );

                        if (exists) return oldData;

                        return {
                            ...oldData,
                            messages: [...(oldData.messages ?? []), newMessage],
                        };
                    }
                );
            }

            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ["messages", variables.conversationId],
                }),
                queryClient.invalidateQueries({
                    queryKey: ["conversations"],
                }),
            ]);
        },
    });

    useEffect(() => {
        if (!conversationId || messagesQuery.isPending || messagesQuery.isError) {
            return;
        }

        let cancelled = false;

        async function markAsRead() {
            try {
                await markConversationRead(conversationId);

                if (cancelled) return;

                await Promise.all([
                    queryClient.invalidateQueries({
                        queryKey: ["conversations"],
                    }),
                    queryClient.invalidateQueries({
                        queryKey: ["unreadMessageCount"],
                    }),
                ]);
            } catch (error) {
                console.error(
                    "Couldn't mark conversation as read:",
                    error.response?.data || error.message
                );
            }
        }

        markAsRead();

        return () => {
            cancelled = true;
        };
    }, [
        conversationId,
        messagesQuery.isPending,
        messagesQuery.isError,
        queryClient,
    ]);

    // Listen for new messages delivered through Socket.IO.
    useEffect(() => {
        let socket;

        try {
            socket = connectSocket();
        } catch (error) {
            console.error("Could not connect to messaging:", error.message);
            return;
        }

        function handleNewMessage(payload) {
            const incomingMessage = payload?.message;
            const incomingConversationId = payload?.conversationId;

            if (!incomingMessage?._id || !incomingConversationId) return;

            queryClient.setQueryData(
                ["messages", incomingConversationId],
                (oldData) => {
                    // History may not have been loaded yet.
                    if (!oldData) return oldData;

                    const exists = oldData.messages?.some(
                        (message) => message._id === incomingMessage._id
                    );

                    if (exists) return oldData;

                    return {
                        ...oldData,
                        messages: [...(oldData.messages ?? []), incomingMessage],
                    };
                }
            );

            queryClient.invalidateQueries({
                queryKey: ["conversations"],
            });
        }

        function handleConnectError(error) {
            console.error("Socket connection failed:", error.message);
        }

        socket.on("message:new", handleNewMessage);
        socket.on("connect_error", handleConnectError);

        return () => {
            socket.off("message:new", handleNewMessage);
            socket.off("connect_error", handleConnectError);
        };
    }, [queryClient]);

    function handleSubmit(event) {
        event.preventDefault();

        const messageText = text.trim();

        if (
            !messageText ||
            !conversationId ||
            sendMutation.isPending
        ) {
            return;
        }

        sendMutation.mutate({
            conversationId,
            text: messageText,
        });
    }

    function handleSelectUser(person) {
        // Search APIs should return MongoDB user IDs.
        const recipientId = person?._id ?? person?.id;

        console.log("Selected messaging recipient:", {
            id: recipientId,
            username: person?.username,
        });

        if (!recipientId) {
            setConversationError(
                "This search result does not contain a user ID."
            );
            return;
        }

        if (String(recipientId) === currentUserId) {
            setConversationError("You cannot start a conversation with yourself.");
            return;
        }

        setConversationError("");
        startConversationMutation.mutate(String(recipientId));
    }

    const selectedPerson = activeConversation
        ? getOtherParticipant(activeConversation)
        : null;

    return (
        <main className="mx-auto flex h-[calc(100dvh-2rem)] max-w-6xl overflow-hidden rounded-xl border border-neutral-200 bg-white">
            {/* Left panel: search and conversation list */}
            <aside className="flex w-full max-w-sm shrink-0 flex-col border-r border-neutral-200 sm:w-80">
                <header className="border-b border-neutral-200 p-4">
                    <h1 className="text-xl font-semibold">Messages</h1>
                </header>

                {/* Search users */}
                <div className="border-b border-neutral-200 p-3">
                    <div className="flex items-center gap-2 rounded-xl bg-neutral-100 px-3">
                        <Search
                            size={18}
                            className="shrink-0 text-neutral-500"
                        />

                        <input
                            type="text"
                            value={searchText}
                            onChange={(event) => {
                                setSearchText(event.target.value);
                                setConversationError("");
                            }}
                            placeholder="Search people..."
                            aria-label="Search users to message"
                            className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
                        />

                        {searchText && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchText("");
                                    setConversationError("");
                                }}
                                aria-label="Clear search"
                                className="rounded-full p-1 hover:bg-neutral-200"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {searchText.trim().length === 1 && (
                        <p className="mt-2 text-xs text-neutral-500">
                            Type at least 2 characters to search.
                        </p>
                    )}

                    {searchQuery.isFetching && (
                        <p className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
                            <LoaderCircle size={14} className="animate-spin" />
                            Searching users...
                        </p>
                    )}

                    {searchQuery.isError && (
                        <p role="alert" className="mt-3 text-xs text-red-600">
                            {getErrorMessage(searchQuery.error, "Couldn't search users.")}
                        </p>
                    )}

                    {searchText.trim().length >= 2 && searchQuery.isSuccess && (
                        <div className="mt-2 max-h-64 overflow-y-auto">
                            {searchResults.length === 0 ? (
                                <p className="p-3 text-sm text-neutral-500">
                                    No users found.
                                </p>
                            ) : (
                                searchResults.map((person) => (
                                    <button
                                        key={person._id ?? person.id}
                                        type="button"
                                        disabled={startConversationMutation.isPending}
                                        onClick={() => handleSelectUser(person)}
                                        className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-neutral-50 disabled:opacity-50"
                                    >
                                        {person.profileImage ? (
                                            <img
                                                src={person.profileImage}
                                                alt=""
                                                className="size-10 shrink-0 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-200 font-semibold">
                                                {person.username?.[0]?.toUpperCase() || "U"}
                                            </div>
                                        )}

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold">
                                                {person.username || "Unknown user"}
                                            </p>

                                            {person.displayName && (
                                                <p className="truncate text-xs text-neutral-500">
                                                    {person.displayName}
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}

                    {startConversationMutation.isPending && (
                        <p className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
                            <LoaderCircle size={14} className="animate-spin" />
                            Opening conversation...
                        </p>
                    )}

                    {conversationError && (
                        <p role="alert" className="mt-2 break-words text-xs text-red-600">
                            {conversationError}
                        </p>
                    )}
                </div>

                {/* Existing conversations */}
                <div className="flex-1 overflow-y-auto">
                    {conversationsQuery.isPending && (
                        <p className="p-4 text-sm text-neutral-500">
                            Loading conversations...
                        </p>
                    )}

                    {conversationsQuery.isError && (
                        <p role="alert" className="p-4 text-sm text-red-600">
                            {getErrorMessage(
                                conversationsQuery.error,
                                "Couldn't load conversations."
                            )}
                        </p>
                    )}

                    {conversations.map((conversation) => {
                        const person = getOtherParticipant(conversation);

                        return (
                            <button
                                key={conversation._id}
                                type="button"
                                onClick={() => {
                                    setActiveConversation(conversation);
                                    setConversationError("");
                                }}
                                className={`flex w-full items-center gap-3 border-b border-neutral-100 p-4 text-left hover:bg-neutral-50 ${conversationId === conversation._id
                                    ? "bg-neutral-100"
                                    : ""
                                    }`}
                            >
                                {person?.profileImage ? (
                                    <img
                                        src={person.profileImage}
                                        alt=""
                                        className="size-11 shrink-0 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 font-semibold">
                                        {person?.username?.[0]?.toUpperCase() || "U"}
                                    </div>
                                )}

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold">
                                        {person?.username || person?.displayName || "User"}
                                    </p>

                                    <p className="mt-1 truncate text-sm text-neutral-500">
                                        {conversation.lastMessage?.text || "Start a conversation"}
                                    </p>
                                </div>
                                {conversation.unreadCount > 0 && (
                                    <span
                                        aria-label="Unread messages"
                                        title="Unread messages"
                                        className="size-2.5 shrink-0 rounded-full bg-blue-600"
                                    />
                                )}
                            </button>
                        );
                    })}

                    {conversationsQuery.isSuccess && conversations.length === 0 && (
                        <p className="p-4 text-sm text-neutral-500">
                            No conversations yet.
                        </p>
                    )}
                </div>
            </aside>

            {/* Right panel: active chat */}
            <section className="flex min-w-0 flex-1 flex-col">
                {!activeConversation ? (
                    <div className="flex flex-1 items-center justify-center p-6 text-center">
                        <div>
                            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full border-2 border-neutral-900">
                                <Send size={28} />
                            </div>
                            <h2 className="text-lg font-semibold">Your messages</h2>
                            <p className="mt-2 text-sm text-neutral-500">
                                Select a conversation to start chatting.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Chat header */}
                        <header className="flex items-center gap-3 border-b border-neutral-200 p-4">
                            {selectedPerson?.profileImage ? (
                                <img
                                    src={selectedPerson.profileImage}
                                    alt=""
                                    className="size-10 rounded-full object-cover"
                                />
                            ) : (
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 font-semibold">
                                    {selectedPerson?.username?.[0]?.toUpperCase() || "U"}
                                </div>
                            )}

                            <div className="min-w-0">
                                <p className="truncate font-semibold">
                                    {selectedPerson?.username || "Conversation"}
                                </p>

                                {selectedPerson?.displayName && (
                                    <p className="truncate text-sm text-neutral-500">
                                        {selectedPerson.displayName}
                                    </p>
                                )}
                            </div>
                        </header>

                        {/* Messages */}
                        <div className="flex-1 space-y-3 overflow-y-auto p-4">
                            {messagesQuery.isPending && (
                                <p className="text-sm text-neutral-500">
                                    Loading messages...
                                </p>
                            )}

                            {messagesQuery.isError && (
                                <p role="alert" className="text-sm text-red-600">
                                    {getErrorMessage(messagesQuery.error, "Couldn't load messages.")}
                                </p>
                            )}

                            {messagesQuery.isSuccess && messages.length === 0 && (
                                <div className="flex h-full min-h-40 items-center justify-center text-center">
                                    <div>
                                        <p className="font-semibold">Start the conversation</p>
                                        <p className="mt-1 text-sm text-neutral-500">
                                            Send a message to say hello.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {messages.map((message) => {
                                const senderId = String(
                                    message.sender?._id ?? message.sender?.id ?? message.sender
                                );
                                const isMine = senderId === currentUserId;

                                return (
                                    <div
                                        key={message._id}
                                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm ${isMine
                                                ? "bg-blue-600 text-white"
                                                : "bg-neutral-100 text-neutral-900"
                                                }`}
                                        >
                                            {message.text}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {sendMutation.isError && (
                            <p role="alert" className="px-4 pb-2 text-sm text-red-600">
                                {getErrorMessage(sendMutation.error, "Message could not be sent.")}
                            </p>
                        )}

                        {/* Message composer */}
                        <form
                            onSubmit={handleSubmit}
                            className="flex items-center gap-2 border-t border-neutral-200 p-3"
                        >
                            <input
                                value={text}
                                onChange={(event) => setText(event.target.value)}
                                maxLength={5000}
                                placeholder="Write a message..."
                                aria-label="Message text"
                                className="min-w-0 flex-1 rounded-full border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-neutral-600"
                            />

                            <button
                                type="submit"
                                disabled={!text.trim() || sendMutation.isPending}
                                className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {sendMutation.isPending ? (
                                    <LoaderCircle size={17} className="animate-spin" />
                                ) : (
                                    <Send size={17} />
                                )}
                                <span>Send</span>
                            </button>
                        </form>
                    </>
                )}
            </section>
        </main>
    );
}
