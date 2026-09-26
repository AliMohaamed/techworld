"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCatalogParams } from "@/lib/use-catalog-params";

const DEBOUNCE_MS = 300;

type CatalogSearchProps = {
  /** True while results for the current query are still loading. */
  isLoading?: boolean;
};

export default function CatalogSearch({ isLoading = false }: CatalogSearchProps) {
  const t = useTranslations("CatalogSearch");
  const { searchParams, update, isPending } = useCatalogParams();
  const urlQuery = searchParams.get("searchQuery") ?? "";
  const [value, setValue] = useState(urlQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  // Last query this input wrote to the URL, so its own echo isn't mistaken
  // for an external change (which would clobber characters typed meanwhile).
  const lastSyncedRef = useRef(urlQuery);

  // Adopt URL changes made elsewhere (back/forward, "Clear", shared links).
  useEffect(() => {
    if (urlQuery === lastSyncedRef.current) return;
    lastSyncedRef.current = urlQuery;
    setValue(urlQuery);
  }, [urlQuery]);

  const commit = (next: string) => {
    const trimmed = next.trim();
    if (trimmed === lastSyncedRef.current) return;
    lastSyncedRef.current = trimmed;
    // replace: typing shouldn't add a history entry per keystroke.
    update({ searchQuery: trimmed }, { replace: true });
  };

  useEffect(() => {
    const timeout = setTimeout(() => commit(value), DEBOUNCE_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce keyed on the typed value only
  }, [value]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    commit(value);
    inputRef.current?.blur(); // dismiss the mobile keyboard
  };

  const clear = () => {
    setValue("");
    commit("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && value) {
      event.preventDefault();
      clear();
    }
  };

  const showSpinner = Boolean(value.trim()) && (isPending || isLoading);

  return (
    <form role="search" onSubmit={handleSubmit} className="relative min-w-0 flex-1">
      <label htmlFor="catalog-search" className="sr-only">
        {t("label")}
      </label>
      <Search
        size={16}
        aria-hidden
        className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-label-muted ltr:left-4 rtl:right-4"
      />
      <input
        ref={inputRef}
        id="catalog-search"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("placeholder")}
        className="h-12 w-full rounded-xl border border-border bg-card text-sm font-medium text-foreground outline-none transition-all placeholder:text-label-muted/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 ltr:pl-11 ltr:pr-20 rtl:pr-11 rtl:pl-20 [&::-webkit-search-cancel-button]:appearance-none"
      />
      <div className="absolute top-1/2 flex -translate-y-1/2 items-center gap-1 ltr:right-2 rtl:left-2">
        {showSpinner ? (
          <Loader2 size={16} aria-hidden className="animate-spin text-primary" />
        ) : null}
        {value ? (
          <button
            type="button"
            onClick={clear}
            aria-label={t("clear")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-label-muted transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>
    </form>
  );
}
