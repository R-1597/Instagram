
import { Camera, Heart, MessageCircle } from "lucide-react";

export default function FeedPage() {
  return (
    <section className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-8">
      <header className="mb-8 flex items-center justify-between md:hidden">
        <h1 className="font-serif text-2xl font-semibold">InstaSpace</h1>
        <Heart size={24} />
      </header>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <p className="text-sm text-neutral-500">YOUR COMMUNITY</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Your daily inspiration.
          </h2>
          <p className="mt-2 text-neutral-500">
            Discover moments and connect with people.
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-neutral-100">
            <Camera size={27} />
          </div>

          <h3 className="text-lg font-semibold">Your feed starts here</h3>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-neutral-500">
            Posts from your community will appear here once we connect the feed
            to your backend.
          </p>

          <div className="mt-5 flex items-center justify-center gap-5 text-xs text-neutral-400">
            <span className="flex items-center gap-1">
              <Heart size={14} /> Likes
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle size={14} /> Comments
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
