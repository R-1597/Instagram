
export default function AuthField({
  label,
  error,
  registration,
  type = "text",
  autoComplete,
  placeholder,
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-neutral-700">
        {label}
      </label>

      <input
        {...registration}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-800 focus:ring-2 focus:ring-neutral-200"
      />

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
