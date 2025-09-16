'use client';

import { load, trackPageview } from 'fathom-client';
import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function TrackPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Only load if Fathom ID is provided
    const fathomId = process.env.NEXT_PUBLIC_FATHOM_ID;
    if (fathomId) {
      load(fathomId, {
        auto: false
      });
    }
  }, []);

  useEffect(() => {
    // Only track if Fathom ID is provided
    if (!process.env.NEXT_PUBLIC_FATHOM_ID) return;
    if (!pathname) return;

    trackPageview({
      url: pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ''),
      referrer: document.referrer
    });
  }, [pathname, searchParams]);

  return null;
}

export function FathomAnalytics() {
  // Only render if Fathom ID is provided
  if (!process.env.NEXT_PUBLIC_FATHOM_ID) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <TrackPageView />
    </Suspense>
  );
}