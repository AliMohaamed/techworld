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
      className="rounded-lg border border-border bg-secondary px-6 py-3.5 font-space-grotesk text-xs font-bold uppercase tracking-[0.2em] text-foreground transition-all hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
    >
      Load More
    </button>
  );
}