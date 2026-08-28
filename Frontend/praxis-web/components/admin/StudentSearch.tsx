"use client";

import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { searchStudents } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/http";
import { studentSearchSchema } from "@/lib/validation";
import type { SafeUser } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Users } from "lucide-react";

const PAGE_SIZE = 20;

interface StudentSearchProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Bumped by the parent after an action (suspend/reactivate) to force a re-fetch. */
  refreshKey?: number;
}

export function StudentSearch({ selectedId, onSelect, refreshKey }: StudentSearchProps) {
  const { callWithAuth } = useAuth();
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<SafeUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce raw input into the actual search query.
  useEffect(() => {
    const parsed = studentSearchSchema.safeParse({ query: rawQuery });
    const timeout = setTimeout(() => {
      setPage(1);
      setQuery(parsed.success ? (parsed.data.query ?? "") : "");
    }, 300);
    return () => clearTimeout(timeout);
  }, [rawQuery]);

  useEffect(() => {
    let cancelled = false;
    // Sanctioned "fetch on dependency change" pattern: setting loading/error
    // state before the request starts, not synchronously deriving state
    // from props/state that belongs in render instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    callWithAuth((token) => searchStudents({ search: query || undefined, page, limit: PAGE_SIZE }, token))
      .then((result) => {
        if (cancelled) return;
        setResults(result.data);
        setTotal(result.meta.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Couldn't load students.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [callWithAuth, query, page, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300"
          aria-hidden="true"
        />
        <input
          type="search"
          value={rawQuery}
          onChange={(e) => setRawQuery(e.target.value)}
          placeholder="Search by name or email"
          aria-label="Search students by name or email"
          className="w-full rounded-lg border border-ink-100 py-2.5 pl-9 pr-3.5 text-sm outline-none placeholder:text-ink-300 focus:border-brand-500"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="h-5 w-5 text-brand-500" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => setPage((p) => p)} />
      ) : results.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students found"
          description={query ? "Try a different name or email." : "No students yet."}
        />
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-ink-100 overflow-hidden rounded-[--radius-card] border border-ink-100 bg-white">
            {results.map((student) => (
              <li key={student.id}>
                <button
                  type="button"
                  onClick={() => onSelect(student.id)}
                  aria-current={selectedId === student.id}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-ink-50 ${
                    selectedId === student.id ? "bg-brand-50" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-900-solid">{student.name}</p>
                    <p className="truncate text-sm text-ink-500">{student.email}</p>
                  </div>
                  {student.status === "SUSPENDED" && <Badge tone="danger">Suspended</Badge>}
                </button>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-ink-500">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Prev
              </Button>
              <span>
                Page {page} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
