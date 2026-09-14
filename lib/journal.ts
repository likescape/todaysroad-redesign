import type { Course } from "./courses";
import { splitWalkPath } from "./walk";

export type RoutePoint = { lat: number; lng: number };
export type WalkPhoto = { id: string; src: string; name: string };
export type WalkMood = "상쾌해요" | "편안해요" | "뿌듯해요";
export type WalkRecord = {
  id: string;
  title: string;
  startedAt: string;
  endedAt: string;
  seconds: number;
  distance: number;
  path: RoutePoint[];
  // Retain legacy reflections so existing device data can be opened in the story composer.
  // New reflections are saved only as CommunityPost content.
  note: string;
  mood: WalkMood | null;
  photos: WalkPhoto[];
  color: string;
  example?: boolean;
  thumbnailPath?: string;
};
export type CourseAttachment = Pick<WalkRecord, "title" | "distance" | "seconds" | "path" | "color"> & { recordId: string };
export type CommunityPost = {
  id: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  body: string;
  visibility: "public" | "private";
  photos: WalkPhoto[];
  course: CourseAttachment | null;
  example?: boolean;
};
export type PostDraft = Pick<CommunityPost, "body" | "visibility" | "photos" | "course"> & { id?: string };
export type JournalData = { version: 1; records: WalkRecord[]; posts: CommunityPost[] };

export const CURRENT_USER = { id: "local-walker", name: "산책러" };
export const MOODS: WalkMood[] = ["상쾌해요", "편안해요", "뿌듯해요"];
export const MAX_PHOTOS = 5;
export const STORAGE_KEY = "todaysroad-journal-v1";

const riverPath = [
  { lat: 35.149, lng: 126.903 }, { lat: 35.151, lng: 126.907 },
  { lat: 35.153, lng: 126.91 }, { lat: 35.152, lng: 126.913 },
  { lat: 35.154, lng: 126.918 }, { lat: 35.156, lng: 126.921 },
];
const lakePath = [
  { lat: 35.147, lng: 126.858 }, { lat: 35.149, lng: 126.859 },
  { lat: 35.15, lng: 126.861 }, { lat: 35.149, lng: 126.863 },
  { lat: 35.147, lng: 126.862 }, { lat: 35.146, lng: 126.86 },
  { lat: 35.147, lng: 126.858 },
];
const alleyPath = [
  { lat: 35.149, lng: 126.917 }, { lat: 35.151, lng: 126.918 },
  { lat: 35.151, lng: 126.921 }, { lat: 35.15, lng: 126.922 },
  { lat: 35.148, lng: 126.921 }, { lat: 35.148, lng: 126.918 },
  { lat: 35.149, lng: 126.917 },
];
const examplePhoto = { id: "example-alley", src: "/assets/example-thumbnail.jpg", name: "골목길 풍경 예시" };

export const EXAMPLE_RECORDS: WalkRecord[] = [
  { id: "example-river", title: "광주천 산책", startedAt: "2026-09-02T08:10:00+09:00", endedAt: "2026-09-02T08:52:00+09:00", distance: 3.2, seconds: 2520, color: "#4a9e45", path: riverPath, thumbnailPath: "M10 28 40 39 68 29 99 51 119 35", note: "물소리를 들으며 천천히 걸었어요. 아침 공기가 선선해서 기분 좋은 하루를 시작했어요.", mood: "상쾌해요", photos: [], example: true },
  { id: "example-lake", title: "운천저수지 산책", startedAt: "2026-08-31T18:20:00+09:00", endedAt: "2026-08-31T18:48:00+09:00", distance: 2.1, seconds: 1680, color: "#4b95bd", path: lakePath, thumbnailPath: "M12 20 41 23 60 37 92 40 119 58", note: "저수지 한 바퀴를 돌고 벤치에서 잠깐 쉬었어요. 생각이 정리되는 시간이었어요.", mood: "편안해요", photos: [], example: true },
  { id: "example-alley", title: "도심 골목 산책", startedAt: "2026-08-29T16:00:00+09:00", endedAt: "2026-08-29T16:53:00+09:00", distance: 4, seconds: 3180, color: "#e9a132", path: alleyPath, thumbnailPath: "M20 20 80 29 96 58 18 51 20 20", note: "평소 지나치던 골목에서 작은 가게들을 발견했어요. 다음에도 천천히 둘러보고 싶은 길이에요.", mood: "뿌듯해요", photos: [examplePhoto], example: true },
];

export function attachCourse(record: WalkRecord): CourseAttachment {
  return { recordId: record.id, title: record.title, distance: record.distance, seconds: record.seconds, color: record.color, path: record.path.map(point => ({ ...point })) };
}

export function createPostDraft(record?: WalkRecord, post?: CommunityPost): PostDraft {
  if (post) return { id: post.id, body: post.body, photos: post.photos, course: post.course, visibility: post.visibility };
  return {
    body: record?.note ?? "",
    photos: record?.photos ?? [],
    course: record ? attachCourse(record) : null,
    visibility: record ? "private" : "public",
  };
}

const publicExample = (id: string, authorName: string, body: string, date: string, record: WalkRecord | null, photos: WalkPhoto[] = []): CommunityPost => ({
  id, authorId: id, authorName, body, createdAt: date, updatedAt: date, visibility: "public", photos,
  course: record ? attachCourse(record) : null, example: true,
});

export function initialJournal(): JournalData {
  return {
    version: 1, records: EXAMPLE_RECORDS,
    posts: [
      publicExample("example-post-1", "느린걸음", "익숙한 골목도 천천히 걸으면 다르게 보여요.\n오늘은 발길이 닿는 대로, 작은 가게들을 지나 걸었어요. 여러분은 오늘 어떤 길을 걸었나요?", "2026-09-08T10:30:00+09:00", EXAMPLE_RECORDS[2], [examplePhoto]),
      publicExample("example-post-2", "초록산책", "아침의 광주천은 조용하고 선선하네요. 물소리에 맞춰 걷다 보니 복잡했던 마음도 가벼워졌어요. 🌿", "2026-09-08T08:55:00+09:00", EXAMPLE_RECORDS[0]),
      publicExample("example-post-3", "하루한바퀴", "하루를 마무리하는 저수지 한 바퀴. 벤치에 앉아 잠깐 쉬어가는 시간까지 참 좋았어요.", "2026-09-07T19:10:00+09:00", EXAMPLE_RECORDS[1]),
      publicExample("example-post-4", "구름따라", "멀리 가지 않아도 괜찮더라고요. 오늘은 집 앞에서 10분만 걸었는데, 그것만으로도 충분했어요.", "2026-09-07T12:00:00+09:00", null),
    ],
  };
}

export function createWalkRecord(course: Course, startedAt: number, endedAt = Date.now()): WalkRecord {
  const seconds = Math.max(0, Math.floor((endedAt - startedAt) / 1000));
  const duration = Math.max(1, parseFloat(course.duration) * 60 || 1);
  const progress = Math.min(1, seconds / duration);
  return {
    id: crypto.randomUUID(), title: course.title, startedAt: new Date(startedAt).toISOString(),
    endedAt: new Date(endedAt).toISOString(), seconds,
    distance: Math.max(0, parseFloat(course.distance) || 0) * progress,
    path: splitWalkPath(course.path ?? [], progress).completed,
    note: "", mood: null, photos: [], color: "#318737",
  };
}

export function savePost(data: JournalData, draft: PostDraft, now = new Date().toISOString()): JournalData {
  const previous = draft.id ? data.posts.find(post => post.id === draft.id) : undefined;
  if (draft.id && (!previous || previous.authorId !== CURRENT_USER.id)) throw new Error("내가 작성한 글만 수정할 수 있어요.");
  if (!draft.body.trim() || draft.body.trim().length > 2000) throw new Error("산책 이야기를 1~2,000자로 작성해 주세요.");
  if (draft.photos.length > MAX_PHOTOS) throw new Error("사진은 최대 5장까지 첨부할 수 있어요.");
  const post: CommunityPost = {
    ...draft, id: previous?.id ?? crypto.randomUUID(), body: draft.body.trim(),
    authorId: CURRENT_USER.id, authorName: CURRENT_USER.name,
    createdAt: previous?.createdAt ?? now, updatedAt: now,
  };
  return { ...data, posts: previous ? data.posts.map(item => item.id === post.id ? post : item) : [post, ...data.posts] };
}

export function deletePost(data: JournalData, id: string): JournalData {
  const post = data.posts.find(item => item.id === id);
  if (!post || post.authorId !== CURRENT_USER.id) throw new Error("내가 작성한 글만 삭제할 수 있어요.");
  return { ...data, posts: data.posts.filter(item => item.id !== id) };
}

export function visiblePosts(posts: CommunityPost[], mine: boolean) {
  return posts.filter(post => mine ? post.authorId === CURRENT_USER.id : post.visibility === "public")
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, "");
}

export function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}초`;
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}시간 ${minutes % 60}분` : `${minutes}분`;
}

export function formatPace(record: Pick<WalkRecord, "distance" | "seconds">) {
  if (record.distance < 0.01 || record.seconds === 0) return "—";
  const pace = Math.round(record.seconds / record.distance);
  return `${Math.floor(pace / 60)}′${String(pace % 60).padStart(2, "0")}″`;
}

export function routeDrawing(path: RoutePoint[], width = 340, height = 190, padding = 32) {
  if (!path.length) return [];
  const latitudes = path.map(point => point.lat);
  const longitudes = path.map(point => point.lng * Math.cos(path[0].lat * Math.PI / 180));
  const minX = Math.min(...longitudes), maxX = Math.max(...longitudes);
  const minY = Math.min(...latitudes), maxY = Math.max(...latitudes);
  const scale = Math.min((width - padding * 2) / (maxX - minX || 1e-9), (height - padding * 2) / (maxY - minY || 1e-9));
  return path.map((point, i) => ({ x: width / 2 + (longitudes[i] - (minX + maxX) / 2) * scale, y: height / 2 - (point.lat - (minY + maxY) / 2) * scale }));
}

// Validate device storage before using it as renderable content.
export function parseJournal(raw: string): JournalData {
  const data = JSON.parse(raw);
  const obj = (v: unknown): v is Record<string, any> => !!v && typeof v === "object";
  const text = (v: unknown): v is string => typeof v === "string";
  const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
  const date = (v: unknown) => text(v) && Number.isFinite(Date.parse(v));
  const path = (v: unknown) => Array.isArray(v) && v.length <= 10000 && v.every(p => obj(p) && Number.isFinite(p.lat) && Math.abs(p.lat) <= 90 && Number.isFinite(p.lng) && Math.abs(p.lng) <= 180);
  const photos = (v: unknown) => Array.isArray(v) && v.length <= MAX_PHOTOS && v.every(p => obj(p) && text(p.id) && text(p.name) && text(p.src) && (p.src === "/assets/example-thumbnail.jpg" || /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.src)));
  const course = (v: unknown) => obj(v) && text(v.title) && num(v.distance) && num(v.seconds) && path(v.path) && /^#[0-9a-f]{6}$/i.test(v.color);
  if (!obj(data) || data.version !== 1 || !Array.isArray(data.records) || !Array.isArray(data.posts)
    || !data.records.every((r: unknown) => obj(r) && course(r) && text(r.id) && text(r.note) && date(r.startedAt) && date(r.endedAt) && photos(r.photos) && (r.mood === null || MOODS.includes(r.mood)))
    || !data.posts.every((p: unknown) => obj(p) && text(p.id) && text(p.authorId) && text(p.authorName) && text(p.body) && date(p.createdAt) && date(p.updatedAt) && ["public", "private"].includes(p.visibility) && photos(p.photos) && (p.course === null || (course(p.course) && text(p.course.recordId))))) {
    throw new Error("저장된 기록을 불러오지 못했어요. 다시 시도해 주세요.");
  }
  return data as JournalData;
}
