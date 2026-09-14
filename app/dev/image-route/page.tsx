import { notFound } from "next/navigation";
import ImageRouteLab from "@/components/ImageRouteLab";

export default function ImageRouteLabPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ImageRouteLab />;
}
