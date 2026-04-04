import useSWR from "swr";
import type { NormalizedConsistency } from "../types";
import { useSession } from "next-auth/react";

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch consistency");
  return res.json();
});

export function useConsistency(roleId: string | null) {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  // Only fetch if authenticated and we have a roleId
  const { data, error, isLoading, mutate } = useSWR(
    isAuthenticated && roleId ? `/api/consistency?roleId=${encodeURIComponent(roleId)}` : null,
    fetcher
  );

  return {
    consistency: data?.data as NormalizedConsistency | null,
    isLoading,
    error,
    mutateConsistency: mutate
  };
}
