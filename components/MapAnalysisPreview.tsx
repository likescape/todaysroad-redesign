import type { ImagePoint, MapSegmentation } from "@/lib/map-segmentation";
import type { ImageWaypoint } from "@/lib/image-route-planner";

export default function MapAnalysisPreview({ image, segmentation, pixels = [], waypoints = [], origin, excludedRoadIds = [], candidateFeatureIds, showNodes = false }: { image: string; segmentation?: MapSegmentation; pixels?: ImagePoint[]; waypoints?: ImageWaypoint[]; origin?: ImagePoint; excludedRoadIds?: string[]; candidateFeatureIds?: string[]; showNodes?: boolean }) {
  const points = (path: ImagePoint[]) => path.map(p => `${p.x},${p.y}`).join(" ");
  const colors = { greenery: "#27834e", mountain: "#886638", water: "#2684d9", building: "#bd5949", icon: "#9359c3" };
  return <figure className="map-analysis-preview">
    <svg viewBox="0 0 1000 1000" role="img" aria-label="캡처한 지도 위에 구분된 길, 자연물, 건물, 아이콘과 산책 경유지를 표시한 이미지">
      <image href={image} width="1000" height="1000" />
      {segmentation?.features.map(f => <g key={f.id} opacity={candidateFeatureIds && !candidateFeatureIds.includes(f.id) ? 0.18 : 1}>{f.outline.length >= 3 ? <polygon points={points(f.outline)} fill={colors[f.kind]} fillOpacity="0.24" stroke={colors[f.kind]} strokeWidth="2"><title>{f.label}</title></polygon> : <circle cx={f.point.x} cy={f.point.y} r="7" fill={colors[f.kind]}><title>{f.label}</title></circle>}</g>)}
      {segmentation?.roads.map(r => <polyline key={r.id} points={points(r.points)} fill="none" stroke={excludedRoadIds.includes(r.id) ? "#c64141" : "#ed9c20"} strokeDasharray={excludedRoadIds.includes(r.id) ? "7 5" : undefined} strokeWidth="3" opacity="0.8"><title>{r.id} · {r.kind} · {Math.round(r.confidence * 100)}%</title></polyline>)}
      {showNodes && segmentation?.nodes.map(n => <circle key={n.id} cx={n.x} cy={n.y} r="4" fill="white" stroke="#9b650e" strokeWidth="2" />)}
      <polyline points={points(pixels)} fill="none" stroke="white" strokeWidth="11" strokeLinejoin="round" />
      <polyline points={points(pixels)} fill="none" stroke="#185b36" strokeWidth="6" strokeLinejoin="round" />
      {waypoints.map((w, i) => <g key={w.featureId}><circle cx={w.pixel.x} cy={w.pixel.y} r="17" fill="#185b36" stroke="white" strokeWidth="3" /><text x={w.pixel.x} y={w.pixel.y + 6} fill="white" fontSize="20" textAnchor="middle">{i + 1}</text><title>{w.label}</title></g>)}
      {origin && <g><circle cx={origin.x} cy={origin.y} r="9" fill="#176be0" stroke="white" strokeWidth="3" /><title>출발 위치</title></g>}
    </svg>
    <figcaption>길 · <span style={{ color: colors.greenery }}>자연</span> · <span style={{ color: colors.water }}>물</span> · <span style={{ color: colors.building }}>건물</span> · <span style={{ color: colors.icon }}>아이콘</span><br />번호는 장소 주변 길의 경유지예요.</figcaption>
  </figure>;
}
