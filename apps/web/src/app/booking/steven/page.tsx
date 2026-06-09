import * as React from 'react';

export default function Page(): React.ReactNode {
  // Support raw iframe markup or plain src URL in env var.
  const rawEmbed =
    process.env.NEXT_PUBLIC_CALL_WITH_STEVEN_EMBED_URL ??
    process.env.NEXT_PUBLIC_STEVEN_BOOKING_EMBED_URL ??
    '';

  const rawBooking =
    process.env.NEXT_PUBLIC_CALL_WITH_STEVEN_URL ?? process.env.NEXT_PUBLIC_STEVEN_BOOKING_URL ?? '';

  let src = (rawEmbed || rawBooking).trim();

  // If the provided env contains an <iframe ... src="..."> tag, extract the src attribute.
  if (src.startsWith('<iframe')) {
     const m = src.match(/src=(?:['"])(.*?)(?:['"])/);
     if (m && m[1]) {
      src = m[1];
     }
  }

  if (!src) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Booking page not configured</h2>
          <p className="text-sm text-zinc-500 mt-2">Set NEXT_PUBLIC_CALL_WITH_STEVEN_EMBED_URL or NEXT_PUBLIC_CALL_WITH_STEVEN_URL</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-5xl">
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <iframe
            src={src}
            title="Call with Steven — booking"
            className="w-full h-[80vh]"
            frameBorder={0}
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
