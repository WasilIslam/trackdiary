"use client";

import { useState, useEffect } from "react";

export default function SafeWiredCard(props) {
  const [WiredCard, setWiredCard] = useState(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Only import wired-elements-react on the client side
    const loadWiredElements = async () => {
      try {
        // Dynamic import inside useEffect ensures it only runs on client
        const wiredElements = await import("wired-elements-react");
        setWiredCard(() => wiredElements.WiredCard);
        setIsClient(true);
      } catch (error) {
        console.error("Error loading wired elements:", error);
      }
    };

    loadWiredElements();
  }, []);

  // Return fallback or null until the component is loaded
  if (!isClient || !WiredCard) {
    // Return a simple div with the same className for styling consistency
    return (
      props.fallback || <div className={props.className}>{props.children}</div>
    );
  }

  // Once loaded, render the actual WiredCard
  return <WiredCard {...props} />;
}
