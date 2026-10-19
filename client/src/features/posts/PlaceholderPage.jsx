
import { useLocation } from "react-router-dom";

export default function PlaceholderPage() {
  const location = useLocation();

  const titles = {
    "/explore": "Explore",
    "/reels": "Reels",
    "/messages": "Messages",
    "/settings": "Settings",
  };

  const title = titles[location.pathname] || "Coming soon";

  return (
    <section className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <div className="mt-6 rounded-2xl border border-neutral-200 p-6">
        <p className="font-medium">This feature isn't implemented yet.</p>
        <p className="mt-2 text-sm text-neutral-500">
          We'll add its real functionality in a later stage. No simulated
          data or fake actions are used here.
        </p>
      </div>
    </section>
  );
}
