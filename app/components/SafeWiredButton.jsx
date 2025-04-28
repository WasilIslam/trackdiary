"use client";

import dynamic from "next/dynamic";

// Import WiredButton with no SSR
const WiredButton = dynamic(
  () => import("wired-elements-react").then((mod) => mod.WiredButton),
  { ssr: false }
);

export default function SafeWiredButton(props) {
  return <WiredButton {...props} />;
}
