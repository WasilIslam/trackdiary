"use client";

import { useEffect, useState } from "react";
import {
  WiredCard,
  WiredButton,
  WiredInput,
  // Import other wired elements as needed
} from "wired-elements-react";

/**
 * Client-side only component that provides access to Wired Elements
 * This ensures SVG elements are only initialized in the browser.
 */
export default function WiredElementsClient({ type, children, ...props }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  // Return the appropriate wired element based on type
  switch (type) {
    case "card":
      return <WiredCard {...props}>{children}</WiredCard>;
    case "button":
      return <WiredButton {...props}>{children}</WiredButton>;
    case "input":
      return <WiredInput {...props} />;
    // Add cases for other wired elements as needed
    default:
      return null;
  }
}
