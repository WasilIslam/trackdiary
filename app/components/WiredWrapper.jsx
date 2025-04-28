"use client";

import { useState, useEffect } from "react";

/**
 * A wrapper component that safely renders Wired Elements components
 * by ensuring they only render after the component has mounted on the client
 * and the window object is fully available.
 *
 * This wrapper specifically addresses the "SVGSVGElement is not defined" error
 * by ensuring SVG elements are only rendered in the browser environment.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The Wired Elements component(s) to render
 * @param {React.ReactNode} props.fallback - Optional fallback UI to show while loading
 * @returns {React.ReactNode}
 */
export default function WiredWrapper({ children, fallback = null }) {
  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => {
    // Check if window and SVG elements are available
    if (
      typeof window !== "undefined" &&
      typeof window.SVGSVGElement !== "undefined"
    ) {
      setIsBrowser(true);
    }

    return () => {
      setIsBrowser(false);
    };
  }, []);

  // Only render children when in browser environment with SVG support
  if (!isBrowser) {
    return fallback;
  }

  return children;
}
