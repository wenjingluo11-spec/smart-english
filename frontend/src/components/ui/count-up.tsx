"use client";

import { useEffect, useState } from "react";

export default function CountUp({ end, duration = 1000 }: { end: number; duration?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (end === 0) { setValue(0); return; }
    const start = 0;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [end, duration]);
  return <>{value}</>;
}
