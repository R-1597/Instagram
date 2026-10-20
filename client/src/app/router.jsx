
import { createBrowserRouter } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import FeedPage from "@/features/feed/FeedPage";
import SearchPage from "@/features/search/SearchPage";
import NotificationsPage from "@/features/notifications/NotificationsPage";
import ProfilePage from "@/features/profiles/ProfilePage";
import CreatePostPage from "@/features/posts/CreatePostPage";
import PlaceholderPage from "@/features/posts/PlaceholderPage";
import LoginPage from "@/features/auth/LoginPage";
import RegisterPage from "@/features/auth/RegisterPage";
import RequireAuth from "@/features/auth/RequireAuth";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <FeedPage /> },
          { path: "/search", element: <SearchPage /> },
          { path: "/notifications", element: <NotificationsPage /> },
          { path: "/profile", element: <ProfilePage /> },
          { path: "/create", element: <CreatePostPage /> },
          { path: "/explore", element: <PlaceholderPage /> },
          { path: "/reels", element: <PlaceholderPage /> },
          { path: "/messages", element: <PlaceholderPage /> },
          { path: "/settings", element: <PlaceholderPage /> },
        ],
      },
    ],
  },
]);
