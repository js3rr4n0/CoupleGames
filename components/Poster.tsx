"use client";

import { useState } from "react";

/**
 * Character art comes from third-party APIs, so it can be slow or plain gone.
 * The category emoji sits underneath as the placeholder and stays visible until
 * the picture paints (or forever, if the URL is dead).
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

  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden border-[3px] border-ink bg-paper-2 ${className}`}
    >
      <span className={emojiClassName}>{emoji}</span>
      {src && !broken && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </span>
  );
}
