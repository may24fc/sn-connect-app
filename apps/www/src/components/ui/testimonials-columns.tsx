"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface Testimonial {
  text: string;
  name: string;
  role: string;
  image: string;
  unit?: string;
  unitColor?: string;
}

export function TestimonialsColumn({
  className,
  testimonials,
  duration = 10,
}: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) {
  return (
    <div className={cn("overflow-hidden", className)}>
      <motion.div
        animate={{ translateY: "-50%" }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6"
      >
        {[0, 1].map((copy) => (
          <React.Fragment key={copy}>
            {testimonials.map(({ text, image, name, role, unit, unitColor }, i) => (
              <div
                className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-card transition-shadow hover:shadow-card-hover max-w-xs w-full"
                key={`${copy}-${i}`}
              >
                {unit && (
                  <span
                    className="mb-4 inline-block rounded-md px-2.5 py-0.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: unitColor ?? '#175063' }}
                  >
                    {unit}
                  </span>
                )}
                <p className="text-sm leading-relaxed text-zinc-600">&ldquo;{text}&rdquo;</p>
                <div className="mt-5 flex items-center gap-3">
                  <img
                    width={40}
                    height={40}
                    src={image}
                    alt={name}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-zinc-100"
                  />
                  <div>
                    <p className="text-sm font-semibold tracking-tight text-zinc-900">{name}</p>
                    <p className="text-xs tracking-tight text-zinc-500">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
}
