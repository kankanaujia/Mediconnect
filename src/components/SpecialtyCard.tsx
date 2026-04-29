"use client";

import { useEffect, useRef, useState } from "react";

export default function SpecialtyCard({
  title,
  image,
  icon,
  gradient,
  quotes,
  quote,
}: {
  title: string;
  image: string;
  icon: string;
  gradient: string;
  quotes?: string[];
  quote?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const lines = (quotes && quotes.length > 0 ? quotes : quote ? [quote] : []).slice(
    0,
    4,
  );

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
        className="w-full h-[260px] object-cover transition-transform duration-700 group-hover:scale-[1.04]"
      />

    {/* Overlay */}
        <div
          className={`absolute inset-0 opacity-60 group-hover:opacity-80 transition-all duration-500 ${gradient}`}
        />

      {/* Title: bottom-left normally, top-left on hover */}
      <div
        className={`absolute left-6 bottom-6 top-auto flex max-w-[85%] flex-col gap-2 text-white transition-all duration-500 drop-shadow-sm
        group-hover:left-5 group-hover:top-5 group-hover:bottom-auto
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
      >
        <div className="flex items-center gap-2 text-lg font-serif font-semibold">
          <span className="text-xl">{icon}</span>
          {title}
        </div>

        {/* Quote points appear on hover */}
        <div
          className="pointer-events-none rounded-xl bg-black/25 p-3 opacity-0 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 5,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          <ul className="list-disc pl-4 text-xs font-serif leading-5 text-white/95">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}