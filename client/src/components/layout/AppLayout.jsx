
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-white text-neutral-950">
      <Sidebar />

      <main className="min-h-screen pb-20 md:ml-60 md:pb-0">
        <Outlet />
      </main>

      <MobileNav />
    </div>
  );
}
