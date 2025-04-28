"use client";

import dynamic from "next/dynamic";

// Import WiredInput with no SSR
const WiredInput = dynamic(
  () => import("wired-elements-react").then((mod) => mod.WiredInput),
  { ssr: false }
);

export default function SafeWiredInput(props) {
  return <WiredInput {...props} />;
}
