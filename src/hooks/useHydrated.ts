import { useEffect, useState } from "react";

/** True only after the client has hydrated — safe gate for localStorage-backed UI. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
