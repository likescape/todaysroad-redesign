import data from "./spot-content.json";
import type { SpotCatalog } from "./spots";

// Small, manually reviewed snapshot only. Raw downloads stay out of the client bundle.
export const SPOT_CATALOG = data as SpotCatalog;
