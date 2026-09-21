"use client";

import { useState } from "react";

/**
 * Public APIs sometimes point at images that no longer exist, so every poster
 * degrades to the category emoji instead of leaving a hole in the layout.
 */
export default function Poster({
  src,
  alt,
  emoji,
  className = "",
  emojiClassName = "text-5xl",
}: {
  src: string | null | undefined;
  alt: string;
  emoji: string;
  className?: string;
  emojiClassName?: string;
}) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <div
        className={`grid place-items-center bg-gradient-to-br from-glow-500/30 to-candy-500/20 ${className} ${emojiClassName}`}
      >
        {emoji}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className={`object-cover ${className}`}
    />
  );
}
