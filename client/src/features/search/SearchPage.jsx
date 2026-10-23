
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search, UserRound, LoaderCircle, X } from "lucide-react";
import { searchUsers } from "./searchService";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Wait briefly after typing before sending the request.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const {
    data,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["userSearch", debouncedQuery],
    queryFn: () => searchUsers(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
    retry: 1,
  });

  // Supports the common { users: [...] } API response.
  const users = Array.isArray(data?.users)
    ? data.users
    : Array.isArray(data?.data?.users)
      ? data.data.users
      : [];

  const isSearching = query.trim().length >= 2 &&
    query.trim() !== debouncedQuery;

  return (
    <section className="mx-auto max-w-3xl px-5 py-8 sm:py-10">
      <div className="mb-8 flex items-center gap-3">
        <Search size={28} />
        <h1 className="text-3xl font-semibold">Search</h1>
      </div>

      <div className="relative mb-6">
        <Search
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
        />

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by username or name..."
          aria-label="Search users"
          className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-3 pl-12 pr-12 outline-none transition focus:border-neutral-400 focus:bg-white"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDebouncedQuery("");
            }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-500 hover:bg-neutral-200"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {query.trim().length < 2 && (
        <div className="rounded-2xl border border-neutral-200 p-8 text-center">
          <Search size={30} className="mx-auto mb-3 text-neutral-400" />
          <h2 className="font-medium">Find your people</h2>
          <p className="mt-2 text-sm text-neutral-500">
            Enter at least 2 characters to search for users.
          </p>
        </div>
      )}

      {(isSearching || (isPending && debouncedQuery.length >= 2)) && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-500">
          <LoaderCircle size={18} className="animate-spin" />
          Searching users...
        </div>
      )}

      {isError && !isSearching && (
        <div role="alert" className="rounded-xl border border-red-200 p-5 text-center">
          <p className="font-medium text-red-600">
            Couldn't search users.
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {error?.response?.data?.message ||
              "Please check your connection and try again."}
          </p>
        </div>
      )}

      {!isSearching &&
        !isPending &&
        !isError &&
        debouncedQuery.length >= 2 &&
        users.length === 0 && (
          <div className="py-10 text-center">
            <h2 className="font-medium">No users found</h2>
            <p className="mt-2 text-sm text-neutral-500">
              Try another username or display name.
            </p>
          </div>
        )}

      {!isSearching && users.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-neutral-200">
          {users.map((user) => {
            const userId = user._id || user.id;
            const username = user.username || "unknown";
            const displayName = user.displayName || "";

            if (!userId) return null;

            return (
              <Link
                key={userId}
                to={`/profile/${userId}`}
                className="flex items-center gap-3 border-b border-neutral-100 p-4 last:border-b-0 hover:bg-neutral-50"
              >
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-100">
                    <UserRound size={24} className="text-neutral-500" />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{username}</p>
                  {displayName && (
                    <p className="truncate text-sm text-neutral-500">
                      {displayName}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
