"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

type Bookmark = {
  id: string;
  title: string;
  url: string;
  created_at: string;
  user_id: string;
};

type Props = {
  userId: string;
};

export default function BookmarkList({ userId }: Props) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let channel: any;
    let isMounted = true;

    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        if (!session) throw new Error("User not authenticated.");

        await supabase.realtime.setAuth(session.access_token);

        const { data, error } = await supabase
          .from("bookmarks")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (isMounted) {
          setBookmarks(data || []);
          setLoading(false);
        }

        channel = supabase
          .channel(`bookmarks-${userId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "bookmarks",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              if (!isMounted) return;

              if (payload.eventType === "INSERT") {
                setBookmarks((prev) => {
                  const exists = prev.some((b) => b.id === payload.new.id);
                  if (exists) return prev;
                  return [payload.new as Bookmark, ...prev];
                });
              }

              if (payload.eventType === "UPDATE") {
                setBookmarks((prev) =>
                  prev.map((b) =>
                    b.id === payload.new.id ? (payload.new as Bookmark) : b,
                  ),
                );
              }

              if (payload.eventType === "DELETE") {
                setBookmarks((prev) =>
                  prev.filter((b) => b.id !== payload.old.id),
                );
              }
            },
          )
          .subscribe((status) => {
            if (status === "CHANNEL_ERROR" && isMounted) {
              setError("Realtime connection failed.");
            }
          });
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Unexpected error occurred.");
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);

      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Failed to delete bookmark.");
    } finally {
      setDeletingId(null);
    }
  };

  const getWebsiteLogo = (urlString: string) => {
    try {
      const url = new URL(urlString);
      const domain = url.hostname.replace("www.", "");
      return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
    } catch {
      return null;
    }
  };

  const getHostname = (urlString: string) => {
    try {
      const url = new URL(urlString);
      return url.hostname.replace("www.", "");
    } catch {
      return urlString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Bookmarks
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({bookmarks.length})
          </span>
        </h2>
      </div>

      {bookmarks.length === 0 ? (
        <div className="rounded-lg border border-gray-200 border-dashed bg-gray-50 py-12 text-center">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          <p className="text-gray-600 font-medium">No bookmarks yet</p>
          <p className="text-gray-500 text-sm mt-1">
            Start by adding your first bookmark above
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="group flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all duration-200 hover:shadow-sm"
            >
              {/* Website Logo */}
              <div className="flex-shrink-0 pt-0.5">
                {getWebsiteLogo(bookmark.url) && (
                  <img
                    src={getWebsiteLogo(bookmark.url) || ""}
                    alt={getHostname(bookmark.url)}
                    className="w-6 h-6 rounded-md flex-shrink-0 bg-gray-100"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {bookmark.title}
                </h3>
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700 truncate block mt-0.5 transition-colors"
                >
                  {getHostname(bookmark.url)}
                </a>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(bookmark.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year:
                      new Date(bookmark.created_at).getFullYear() !==
                      new Date().getFullYear()
                        ? "numeric"
                        : undefined,
                  })}
                </p>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => handleDelete(bookmark.id)}
                disabled={deletingId === bookmark.id}
                className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                title="Delete bookmark"
              >
                {deletingId === bookmark.id ? (
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
