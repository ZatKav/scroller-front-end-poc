'use client';

import { useState } from 'react';

/**
 * Primary CTA on the standalone listing detail page ("Request details", Figma
 * 09). There is no enquiry backend yet, so this is an honest client-side
 * placeholder: tapping it confirms the request was noted. Replace the onClick
 * with a real enquiry submission once that endpoint exists.
 */
export default function RequestDetailsButton() {
  const [requested, setRequested] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setRequested(true)}
      disabled={requested}
      className="flex h-[52px] w-full items-center justify-center rounded-zelli-btn bg-zelli-primary text-base font-bold text-white transition-colors hover:bg-zelli-primary-hover focus:outline-none focus:ring-2 focus:ring-zelli-primary focus:ring-offset-2 focus:ring-offset-zelli-bg disabled:opacity-80"
    >
      <span aria-live="polite">{requested ? 'Request sent ✓' : 'Request details'}</span>
    </button>
  );
}
