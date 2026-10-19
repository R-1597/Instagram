
import { Search } from "lucide-react";

export default function SearchPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-8 flex items-center gap-3">
        <Search size={28} />
        <h1 className="text-3xl font-semibold">Search</h1>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-6">
        <p className="font-medium">Find your people</p>
        <p className="mt-2 text-sm text-neutral-500">
          User search will be connected to your existing API in the discovery
          stage.
        </p>
      </div>
    </section>
  );
}
