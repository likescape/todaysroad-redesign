"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CURRENT_USER, STORAGE_KEY, deletePost, initialJournal, parseJournal, savePost, type JournalData, type PostDraft, type WalkRecord } from "./journal";

export function useJournal() {
  const [data, setData] = useState<JournalData>(initialJournal);
  const current = useRef(data);
  const writable = useRef(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const next = raw ? parseJournal(raw) : initialJournal();
      current.current = next;
      setData(next);
      writable.current = true;
      setError("");
    } catch {
      writable.current = false;
      setError("이 기기의 기록을 불러오지 못했어요. 브라우저의 저장 공간 설정을 확인해 주세요.");
    } finally { setReady(true); }
  }, []);

  useEffect(() => {
    reload();
    const sync = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) reload(); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [reload]);

  const commit = useCallback((next: JournalData) => {
    if (!writable.current) throw new Error("기록을 불러온 뒤 다시 저장해 주세요.");
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
    catch { throw new Error("저장하지 못했어요. 사진 수를 줄이거나 브라우저의 저장 공간을 확인한 뒤 다시 시도해 주세요."); }
    current.current = next;
    setData(next);
  }, []);

  const storeRecord = useCallback((record: WalkRecord) => {
    const previous = current.current;
    commit({ ...previous, records: previous.records.some(item => item.id === record.id)
      ? previous.records.map(item => item.id === record.id ? record : item)
      : [record, ...previous.records] });
  }, [commit]);

  const storePost = useCallback((draft: PostDraft) => {
    const next = savePost(current.current, draft);
    commit(next);
    return draft.id ?? next.posts.find(post => post.authorId === CURRENT_USER.id)!.id;
  }, [commit]);

  const removePost = useCallback((id: string) => commit(deletePost(current.current, id)), [commit]);
  return { ...data, ready, error, reload, storeRecord, storePost, removePost };
}
