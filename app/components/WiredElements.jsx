"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

// Dynamically import the wired elements with no SSR
const WiredElementsImport = dynamic(() => import("./WiredElementsClient"), {
  ssr: false,
  loading: () => <div>Loading wired elements...</div>,
});

/**
 * A component that safely loads all Wired Elements components
 * by ensuring they only load on the client side.
 */
export default function WiredElements(props) {
  return (
    <Suspense fallback={<div>Loading wired elements...</div>}>
      <WiredElementsImport {...props} />
    </Suspense>
  );
}
