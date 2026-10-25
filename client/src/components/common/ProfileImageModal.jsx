
import { useEffect } from "react";
import { X } from "lucide-react";

export default function ProfileImageModal({
  imageUrl,
  username,
  onClose,
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center
                 bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close profile picture"
        onClick={onClose}
        className="absolute right-5 top-5 rounded-full
                   bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X size={24} />
      </button>

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${username || "User"} profile picture`}
        className="flex flex-col items-center gap-4"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={`${username || "User"} profile picture`}
          className="h-72 w-72 max-h-[75vh] max-w-[85vw]
                     rounded-full border-4 border-white/80
                     object-cover shadow-2xl sm:h-96 sm:w-96"
        />

        {username && (
          <p className="text-sm font-semibold text-white">
            {username}
          </p>
        )}
      </div>
    </div>
  );
}
