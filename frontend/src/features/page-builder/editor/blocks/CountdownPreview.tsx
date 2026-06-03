import React, { useEffect, useState } from 'react';

export default function CountdownPreview({ settings }: { settings: any }) {
  const target = settings.targetDate ? new Date(settings.targetDate) : null;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!target) return <div className="p-4">No target date set</div>;
  const diff = Math.max(0, target.getTime() - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return (
    <section className="py-8 px-4 text-center">
      <div className="max-w-xl mx-auto bg-white p-6 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">{settings.title || 'Countdown'}</h3>
        <div className="text-2xl font-mono">
          {days}d {hours}h {minutes}m {seconds}s
        </div>
      </div>
    </section>
  );
}
