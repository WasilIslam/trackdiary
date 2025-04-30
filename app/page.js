import { redirect } from "next/navigation";

export default function Page() {
  redirect("/write");
  return null;
}
