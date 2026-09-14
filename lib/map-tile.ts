/** Only the raster basemap URLs rendered by the Kakao SDK may be relayed. */
export function mapTileUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || !/^mts[0-3]?\.daumcdn\.net$/.test(url.hostname) || url.port || url.username || url.password || url.search || url.hash) return null;
    if (!/^\/api\/v1\/tile\/PNG02\/[A-Za-z0-9_-]+\/latest\/\d{1,2}\/\d{1,7}\/\d{1,7}\.png$/.test(url.pathname)) return null;
    url.protocol = "https:";
    return url.href;
  } catch { return null; }
}
