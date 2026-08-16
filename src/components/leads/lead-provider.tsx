"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Lead,
  LeadPagination,
  LeadStatus,
  LeadSummary,
  NewLead,
} from "@/types/lead";

interface LeadQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: LeadStatus;
  ownerId?: string;
  sort?: "createdAt" | "updatedAt" | "score" | "lastActivityAt";
  order?: "asc" | "desc";
}

interface LeadContextValue {
  leads: Lead[];
  pagination: LeadPagination;
  summary: LeadSummary;
  loading: boolean;
  error: string | null;
  canCreate: boolean;
  canUpdate: boolean;
  canArchive: boolean;
  loadLeads: (query?: LeadQuery) => Promise<void>;
  addLead: (lead: NewLead) => Promise<Lead>;
  updateLead: (leadId: string, input: Partial<Lead>) => Promise<Lead>;
  archiveLead: (leadId: string) => Promise<void>;
}

interface ApiErrorBody {
  error?: { message?: string };
}

const emptyPagination = { page: 1, pageSize: 20, total: 0, totalPages: 0 };
const emptySummary: LeadSummary = {
  total: 0,
  qualified: 0,
  converted: 0,
  byStatus: {},
  bySource: {},
};
const LeadContext = createContext<LeadContextValue | null>(null);

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await response.json()) as T & ApiErrorBody;
  if (!response.ok) {
    throw new Error(body.error?.message ?? "The lead request could not be completed.");
  }
  return body;
}

export function LeadProvider({
  children,
  role,
}: {
  children: React.ReactNode;
  role: string;
}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<LeadPagination>(emptyPagination);
  const [summary, setSummary] = useState<LeadSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastQuery = useRef<LeadQuery>({ page: 1, pageSize: 20 });
  const requestNumber = useRef(0);

  const loadLeads = useCallback(async (query: LeadQuery = lastQuery.current) => {
    const currentRequest = ++requestNumber.current;
    lastQuery.current = query;
    setLoading(true);
    setError(null);
    const searchParams = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== "") searchParams.set(key, String(value));
    });

    try {
      const response = await apiRequest<{
        data: Lead[];
        pagination: LeadPagination;
        summary: LeadSummary;
      }>(`/api/leads?${searchParams.toString()}`);
      if (currentRequest !== requestNumber.current) return;
      let loadedLeads = response.data;
      if (query.pageSize === 100 && response.pagination.totalPages > 1) {
        const remainingPages = await Promise.all(
          Array.from({ length: response.pagination.totalPages - 1 }, (_, index) => {
            const pageParams = new URLSearchParams(searchParams);
            pageParams.set("page", String(index + 2));
            return apiRequest<{ data: Lead[] }>(`/api/leads?${pageParams.toString()}`);
          }),
        );
        if (currentRequest !== requestNumber.current) return;
        loadedLeads = loadedLeads.concat(remainingPages.flatMap((page) => page.data));
      }
      setLeads(loadedLeads);
      setPagination(response.pagination);
      setSummary(response.summary);
    } catch (requestError) {
      if (currentRequest !== requestNumber.current) return;
      setError(requestError instanceof Error ? requestError.message : "Unable to load leads.");
    } finally {
      if (currentRequest === requestNumber.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLeads({ page: 1, pageSize: 20 });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadLeads]);

  const addLead = useCallback(
    async (input: NewLead) => {
      const response = await apiRequest<{ data: Lead }>("/api/leads", {
        method: "POST",
        body: JSON.stringify(input),
      });
      await loadLeads(lastQuery.current);
      return response.data;
    },
    [loadLeads],
  );

  const updateLead = useCallback(
    async (leadId: string, input: Partial<Lead>) => {
      const response = await apiRequest<{ data: Lead }>(`/api/leads/${leadId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      await loadLeads(lastQuery.current);
      return response.data;
    },
    [loadLeads],
  );

  const archiveLead = useCallback(
    async (leadId: string) => {
      await apiRequest<{ data: Lead }>(`/api/leads/${leadId}`, { method: "DELETE" });
      const nextPage =
        leads.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page;
      await loadLeads({ ...lastQuery.current, page: nextPage });
    },
    [leads.length, loadLeads, pagination.page],
  );

  const value = useMemo(
    () => ({
      leads,
      pagination,
      summary,
      loading,
      error,
      canCreate: role !== "VIEWER",
      canUpdate: role !== "VIEWER",
      canArchive: role === "OWNER" || role === "ADMIN",
      loadLeads,
      addLead,
      updateLead,
      archiveLead,
    }),
    [leads, pagination, summary, loading, error, role, loadLeads, addLead, updateLead, archiveLead],
  );

  return <LeadContext.Provider value={value}>{children}</LeadContext.Provider>;
}

export function useLeads() {
  const value = useContext(LeadContext);
  if (!value) throw new Error("useLeads must be used inside LeadProvider");
  return value;
}
