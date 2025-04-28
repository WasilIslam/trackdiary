"use client";

import { useState, useEffect } from "react";

export default function SafeWiredButton(props) {
  const [WiredButton, setWiredButton] = useState(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Only import wired-elements-react on the client side
    const loadWiredElements = async () => {
      try {
        // Dynamic import inside useEffect ensures it only runs on client
        const wiredElements = await import("wired-elements-react");
        setWiredButton(() => wiredElements.WiredButton);
        setIsClient(true);
      } catch (error) {
        console.error("Error loading wired elements:", error);
      }
    };

    loadWiredElements();
  }, []);

  // Return fallback or null until the component is loaded
  if (!isClient || !WiredButton) {
    // Return a simple button with the same className for styling consistency
    return (
      props.fallback || (
        <button className={props.className} onClick={props.onClick}>
          {props.children}
        </button>
      )
    );
  }

  // Once loaded, render the actual WiredButton
  return <WiredButton {...props} />;
}
