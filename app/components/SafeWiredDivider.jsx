"use client";

import dynamic from "next/dynamic";

// Import WiredDivider with no SSR
const WiredDivider = dynamic(
  () => import("wired-elements-react").then((mod) => mod.WiredDivider),
  { ssr: false }
);

export default function SafeWiredDivider(props) {
  return <WiredDivider {...props} />;
}
