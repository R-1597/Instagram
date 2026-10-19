
import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-8 flex items-center gap-3">
        <Bell size={28} />
        <h1 className="text-3xl font-semibold">Notifications</h1>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-6">
        <p className="font-medium">Stay in the loop</p>
        <p className="mt-2 text-sm text-neutral-500">
          Follow, like, and comment notifications will load from your backend
          when we implement this feature.
        </p>
      </div>
    </section>
  );
}
