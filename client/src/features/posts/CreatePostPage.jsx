
import { ImagePlus } from "lucide-react";

export default function CreatePostPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-8 flex items-center gap-3">
        <ImagePlus size={28} />
        <h1 className="text-3xl font-semibold">Create post</h1>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-6">
        <p className="font-medium">Share a moment</p>
        <p className="mt-2 text-sm text-neutral-500">
          Post creation and image uploads will be implemented
          when we connect this page to your backend.
        </p>
      </div>
    </section>
  );
}
