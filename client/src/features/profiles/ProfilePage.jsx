
import { UserRound } from "lucide-react";

export default function ProfilePage() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-8 flex items-center gap-3">
        <UserRound size={28} />
        <h1 className="text-3xl font-semibold">Profile</h1>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-6">
        <p className="font-medium">Your space, your story</p>
        <p className="mt-2 text-sm text-neutral-500">
          Your profile details and posts will be loaded from your backend
          after authentication is implemented.
        </p>
      </div>
    </section>
  );
}
