"use client";

type LoadMoreButtonProps = {
  disabled?: boolean;
  onClick: () => void;
};

export default function LoadMoreButton({
  disabled = false,
  onClick,
}: LoadMoreButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-full border border-white/10 bg-zinc-950 px-6 py-4 font-space-grotesk text-xs font-black uppercase tracking-[0.28em] text-white transition-all hover:border-[#ffc105]/40 hover:text-[#ffc105] disabled:cursor-not-allowed disabled:opacity-50"
    >
      Load More
    </button>
  );
}



