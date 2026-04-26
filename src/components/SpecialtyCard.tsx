"use client";

import { useEffect, useRef, useState } from "react";

export default function SpecialtyCard({
  title,
  image,
  icon,
  gradient,
}: {
  title: string;
  image: string;
  icon: string;
  gradient: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative rounded-2xl overflow-hidden group cursor-pointer shadow-md"
    >
      {/* Image */}
      <img
        src={image}
        alt={title}
        className="w-full h-[260px] object-cover"
      />

    {/* Overlay */}
        <div
          className={`absolute inset-0 opacity-60 group-hover:opacity-80 transition-all duration-500 ${gradient}`}
        />

        {/* Content */}
        <div className="absolute inset-0 group-hover:scale-110 transition-transform duration-500" />
      <div
        className={`absolute bottom-6 left-6 flex items-center gap-2 text-white text-lg font-serif font-semibold transition-all duration-700
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
      >
        <span className="text-xl">{icon}</span>
        {title}
      </div>
    </div>
  );
}