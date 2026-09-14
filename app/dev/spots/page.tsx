import { notFound } from "next/navigation";
import SpotCatalogPreview from "@/components/SpotCatalogPreview";

export default function SpotPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <main className="stage"><div className="device"><div className="screen"><SpotCatalogPreview /></div></div></main>;
}
