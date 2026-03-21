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
      className="rounded-full border border-border bg-secondary px-6 py-4 font-space-grotesk text-xs font-black uppercase tracking-[0.28em] text-foreground transition-all hover:border-[#ffc105]/40 hover:text-[#ffc105] disabled:cursor-not-allowed disabled:opacity-50   hover:shadow-[#ffc105]/10"
    >
      Load More
    </button>
  );
}
