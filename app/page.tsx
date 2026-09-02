import AppScreen from "@/components/AppScreen";

export default function Home() {
  return (
    <main className="stage">
      <div className="device">
        <div className="screen">
          <AppScreen />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="device-frame-img"
          src="/assets/mockup-frame.png"
          alt=""
          draggable={false}
        />
      </div>
    </main>
  );
}
