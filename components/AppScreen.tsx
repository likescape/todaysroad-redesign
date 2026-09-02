"use client";

import { useCallback, useRef, useState } from "react";
import { COURSES, type Course } from "@/lib/courses";
import KakaoMap, { type KakaoMapHandle } from "./KakaoMap";
import StatusBar from "./StatusBar";
import TopBar from "./TopBar";
import CourseSheet from "./CourseSheet";
import BottomControls from "./BottomControls";

export default function AppScreen() {
  const mapRef = useRef<KakaoMapHandle>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const handleSelectCourse = useCallback((course: Course | null) => {
    setSelectedCourse(course);
  }, []);

  const handleLocate = useCallback(() => {
    mapRef.current?.moveToCurrentLocation();
  }, []);

  return (
    <div className="app">
      <KakaoMap
        ref={mapRef}
        courses={COURSES}
        selectedCourseId={selectedCourse?.id ?? null}
        onSelectCourse={handleSelectCourse}
      />
      <StatusBar />
      <TopBar />
      {selectedCourse && (
        <CourseSheet
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
        />
      )}
      <BottomControls onLocate={handleLocate} />
    </div>
  );
}
