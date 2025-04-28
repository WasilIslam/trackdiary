"use client";

import dynamic from "next/dynamic";

// Import WiredCard with no SSR
const WiredCard = dynamic(
  () => import("wired-elements-react").then((mod) => mod.WiredCard),
  { ssr: false }
);

export default function SafeWiredCard(props) {
  return <WiredCard {...props} />;
}
