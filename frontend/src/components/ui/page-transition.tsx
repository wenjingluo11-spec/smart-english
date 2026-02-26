"use client";

import { useEffect, useState } from "react";

interface PageTransitionProps {
  children: React.ReactNode;
  stagger?: boolean;
}

export default function PageTransition({ children, stagger = false }: PageTransitionProps) {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(true); }, []);
  return (
    <div
      className={`transition-all duration-400 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"} ${show && stagger ? "stagger-in" : ""}`}
    >
      {children}
    </div>
  );
}
