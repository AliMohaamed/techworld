# Advanced Catalog & Variant Pricing - Quickstart Guide

## Overview

This feature transforms the storefront and admin dashboard to support robust product variants, rich media uploaded directly via Convex File Storage, and strikethrough sale pricing logic. The entire architecture relies on Convex for server-authorized stock tracking (the "Unified SKU Model").

## Required Context

1. **Modal Based Forms**: The `MANAGE_PRODUCTS` dashboard operates strictly within `shadcn/ui` based `<Dialog>` or `<Sheet>` elements to ensure data is validated locally with `zod` before any dispatch to the servers, providing maximum throughput for operational catalog adjustments.
2. **File Storage Cleanup**: You must establish a standard Convex `cron` schedule invoking `<sweepOrphanFiles>` each night, deleting orphaned storage records to save costs and enforce clean state.
3. **SKU Binding**: Storefront checkouts validate the quantities remaining strictly against an `Id<"skus">`, never the `Id<"products">`. Single products default to an invisible single SKU.

## Getting Started

1. **Update Convex Schemas:** Deploy the enhanced `schema.ts` defining `skus` and refactored `products`.
2. **Implement Admin Overlay:** Construct the `app/(admin)/products/components/ProductFormSheet.tsx` containing the multi-part forms (Product Info -> Images Upload -> SKU Mapping).
3. **Bind Upload URL Generation:** Implement `useMutation(api.storage.generateUploadUrl)` locally within the admin modal, passing resulting endpoints to standard `fetch` payloads, fetching `Id<"_storage">` in response.
4. **Build Storefront Viewer:** Enhance `app/(store)/products/[id]/page.tsx` with React Local State to listen for "Color" clicks and immediately hot-swap the selected `<Image />` component utilizing the `sku.linkedImageId` provided by the backend. Ensure `compareAtPrice` conditionally renders the semantic HTML `<s>` tag when strictly > `price`.
