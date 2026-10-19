
import {
  Home,
  Search,
  Compass,
  PlusSquare,
  UserRound,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  { label: "Home", path: "/", icon: Home },
  { label: "Search", path: "/search", icon: Search },
  { label: "Explore", path: "/explore", icon: Compass },
  { label: "Create", path: "/create", icon: PlusSquare },
  { label: "Profile", path: "/profile", icon: UserRound },
];

export default function MobileNav() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-neutral-200 bg-white px-2 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
    >
      {items.map(({ label, path, icon: Icon }) => (
        <NavLink
          key={label}
          to={path}
          end={path === "/"}
          aria-label={label}
          className={({ isActive }) =>
            `flex min-w-12 flex-col items-center gap-1 rounded-lg p-2 ${
              isActive ? "text-black" : "text-neutral-500"
            }`
          }
        >
          <Icon size={23} strokeWidth={1.8} />
          <span className="text-[10px]">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
