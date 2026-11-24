"use client";

import Image from "next/image";
//import { useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export default function QuoteSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.4 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative h-[90vh] flex items-center justify-center overflow-hidden"
    >
      {/* Background Image */}
      <div
        className={`absolute inset-0 transition-transform duration-1200ms ease-out
        ${visible ? "scale-110" : "scale-100"}`}
      >
        <Image
          src="/images/quote_bg.jpg"
          alt="Hospital"
          fill
          sizes="100vw"
          className="object-cover"
        />
      </div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/30"></div>

      {/* Quote Box */}
      <div
        className={`relative max-w-3xl mx-4 md:mx-auto bg-white/90 backdrop-blur-md rounded-3xl p-6 md:p-12 text-center shadow-xl transition-all duration-700
        ${visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-10 scale-95"}`}
      >
        <p className="text-xl md:text-3xl font-serif font-semibold text-gray-800 leading-relaxed">
          &ldquo;Medicine is not only a science; it is also an art. It does not consist
          of compounding pills and plasters; it deals with the very processes of
          life.&rdquo;
        </p>

        {/* Underline Accent */}
        <div className="w-16 h-3px bg-cyan-400 mx-auto mt-6 rounded-full"></div>
      </div>
    </section>
  );
}