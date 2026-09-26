"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { useSession } from "@/providers/session-provider";

/**
 * Session-scoped favourites. Every card calls this with identical args, so
 * Convex shares a single subscription across the whole grid.
 */
export function useFavorites() {
  const { sessionId } = useSession();
  const ids = useQuery(api.favorites.listProductIds, { sessionId });
  const toggleMutation = useMutation(api.favorites.toggle).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.favorites.listProductIds, { sessionId: args.sessionId });
      if (current === undefined) return;
      localStore.setQuery(
        api.favorites.listProductIds,
        { sessionId: args.sessionId },
        current.includes(args.productId)
          ? current.filter((id) => id !== args.productId)
          : [...current, args.productId],
      );
    },
  );

  const favoriteSet = useMemo(() => new Set<string>(ids ?? []), [ids]);

  const toggle = useCallback(
    (productId: Id<"products">) => toggleMutation({ sessionId, productId }),
    [sessionId, toggleMutation],
  );

  return {
    count: ids?.length ?? 0,
    isFavorite: (productId: Id<"products">) => favoriteSet.has(productId),
    toggle,
  };
}
