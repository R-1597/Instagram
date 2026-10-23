
import {
  Home,
  Search,
  Compass,
  Clapperboard,
  MessageCircle,
  Heart,
  PlusSquare,
  UserRound,
  Menu,
  Camera,
  LogOut,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getUnreadNotificationCount } from "@/features/notifications/notificationService";



const navigation = [
  { label: "Home", path: "/", icon: Home },
  { label: "Search", path: "/search", icon: Search },
  { label: "Explore", path: "/explore", icon: Compass },
  { label: "Reels", path: "/reels", icon: Clapperboard },
  { label: "Messages", path: "/messages", icon: MessageCircle },
  { label: "Notifications", path: "/notifications", icon: Heart },
  { label: "Create", path: "/create", icon: PlusSquare },
  { label: "Profile", path: "/profile" },
  
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  

  const { data: notificationData } = useQuery({
    queryKey: ["unreadNotificationCount"],
    queryFn: getUnreadNotificationCount,
    enabled: Boolean(user),
    refetchInterval: 30_000,
    retry: 1,
  });

  // Supports either { count: 3 } or { unreadCount: 3 } responses.
  const unreadCount =
    notificationData?.unreadCount ??
    notificationData?.count ??
    notificationData?.data?.unreadCount ??
    notificationData?.data?.count ??
    0;

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-neutral-200 bg-white px-4 py-7 md:flex">
      <button
        type="button"
        onClick={() => navigate("/")}
        aria-label="Go to home"
        className="mb-8 flex items-center gap-3 rounded-lg px-3 py-2 text-left"
      >
        <Camera size={27} strokeWidth={1.8} />
        <span className="font-serif text-2xl font-semibold tracking-tight">
          InstaSpace
        </span>
      </button>

      <nav aria-label="Main navigation" className="flex flex-col gap-2">
        {navigation.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={label}
            to={path}
            end={path === "/"}
            className={({ isActive }) =>
              `flex items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-neutral-100 ${
                isActive ? "bg-neutral-100 font-semibold" : "font-normal"
              }`
            }
          >
            {label === "Profile" ? (
              user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt="Your profile"
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <UserRound size={23} strokeWidth={1.8} />
              )
            ) : label === "Notifications" ? (
              <span className="relative inline-flex">
                <Icon size={23} strokeWidth={1.8} />
                {unreadCount > 0 && (
                  <span
                    aria-label={`${unreadCount} unread notifications`}
                    className="absolute -right-3 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
            ) : (
              <Icon size={23} strokeWidth={1.8} />
            )}

            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-neutral-200 pt-4">
        <button
          type="button"
          onClick={() => navigate("/settings")}
          className="flex w-full items-center gap-4 rounded-xl px-3 py-3 hover:bg-neutral-100"
        >
          <Menu size={23} />
          <span>Settings</span>
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-4 rounded-xl px-3 py-3 hover:bg-neutral-100"
        >
          <LogOut size={23} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
