"use client";

import { useState, useEffect } from "react";

export default function SafeWiredInput(props) {
  const [WiredInput, setWiredInput] = useState(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Only import wired-elements-react on the client side
    const loadWiredElements = async () => {
      try {
        // Dynamic import inside useEffect ensures it only runs on client
        const wiredElements = await import("wired-elements-react");
        setWiredInput(() => wiredElements.WiredInput);
        setIsClient(true);
      } catch (error) {
        console.error("Error loading wired elements:", error);
      }
    };

    loadWiredElements();
  }, []);

  // Return fallback or null until the component is loaded
  if (!isClient || !WiredInput) {
    // Return a simple input with the same props for consistency
    return (
      props.fallback || (
        <input
          className={props.className}
          placeholder={props.placeholder}
          value={props.value}
          onChange={props.onChange}
          disabled={props.disabled}
          name={props.name}
        />
      )
    );
  }

  // Once loaded, render the actual WiredInput
  return <WiredInput {...props} />;
}
