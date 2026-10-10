import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Loader from "./Loader";
import StatusBadge from "./StatusBadge";
import Table from "./Table/Table";
import AttachmentButton from "./AttachmentButton";
import api from "../services/api";

const TICKETS_PER_PAGE = 10;

const slaStyles = {
  OVERDUE: "bg-red-500/10 text-red-500",
  "ON TRACK": "bg-emerald-500/10 text-emerald-500",
  Resolved: "bg-slate-500/10 text-slate-500 dark:text-slate-400",
};

const columns = [
  {
    key: "title",
    label: "Ticket Title",
    render: (ticket) => (
      <div className="font-semibold text-slate-900 dark:text-white truncate max-w-xs md:max-w-md">
        {ticket.title}
      </div>
    ),
  },
  {
    key: "priority",
    label: "Priority",
    render: (ticket) => (
      <span className={`font-semibold capitalize text-xs tracking-wider ${
        ticket.priority === 'urgent' ? 'text-rose-500' :
        ticket.priority === 'high' ? 'text-amber-500' :
        ticket.priority === 'medium' ? 'text-blue-500' :
        'text-emerald-500'
      }`}>
        • {ticket.priority}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: (ticket) => <StatusBadge status={ticket.status} />,
  },
  {
    key: "sla_status",
    label: "SLA",
    render: (ticket) => (
      <div>
        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md whitespace-nowrap ${slaStyles[ticket.sla_status] || slaStyles.Resolved}`}>
          {ticket.sla_status}
        </span>
        {ticket.status !== "closed" && (
          <p className="mt-1 text-xs text-slate-400 whitespace-nowrap">
            Due {new Date(ticket.sla_due_date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
          </p>
        )}
      </div>
    ),
  },
  {
    key: "organization_name",
    label: "Organization",
    render: (ticket) => (
      <span className="text-slate-500 dark:text-slate-400 font-medium">
        {ticket.organization_name || "N/A"}
      </span>
    ),
  },
  {
    key: "agentName",
    label: "Assigned To",
    render: (ticket) => (
      <span className="text-slate-500 dark:text-slate-400 font-medium">
        {ticket.agentName || "Unassigned"}
      </span>
    ),
  },
  {
    key: "attachment_path",
    label: "File",
    align: 'center',
    render: (ticket) => <AttachmentButton ticket={ticket} />,
  },
];

const filters = [
  {
    key: "status",
    label: "Status",
    options: [
      ["", "All statuses"],
      ["open", "Open"],
      ["pending", "Pending"],
      ["closed", "Closed"],
    ],
  },
  {
    key: "priority",
    label: "Priority",
    options: [
      ["", "All priorities"],
      ["urgent", "Urgent"],
      ["high", "High"],
      ["medium", "Medium"],
      ["low", "Low"],
    ],
  },
  {
    key: "sla",
    label: "SLA",
    options: [
      ["", "Any SLA"],
      ["overdue", "Overdue only"],
    ],
  },
  {
    key: "sort",
    label: "Sort by",
    options: [
      ["newest", "Newest first"],
      ["oldest", "Oldest first"],
      ["due", "Due soonest"],
      ["priority", "Highest priority"],
    ],
  },
];

const initialQuery = { page: 1, search: "", status: "", priority: "", sla: "", sort: "newest" };

// Paginated, searchable, filterable ticket list backed by a /tickets/* list
// endpoint. `action` is an optional element shown beside the page title.
const TicketQueue = ({ endpoint, title, subtitle, errorMessage, action = null }) => {
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [query, setQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setRefreshing(true);
        setError("");
        const response = await api.get(endpoint, {
          params: { ...query, limit: TICKETS_PER_PAGE },
        });
        if (cancelled) return;
        setTickets(response.data.data.tickets || []);
        setPagination(response.data.data.pagination);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || errorMessage);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [endpoint, errorMessage, query]);

  // Any change to search, filters or sorting starts again from page 1
  const updateQuery = (changes) => setQuery((prev) => ({ ...prev, page: 1, ...changes }));

  const { page, total, totalPages } = pagination;
  const hasFilters = query.search || query.status || query.priority || query.sla;

  if (loading) return <Loader size="large" />;

  return (
    <div className="space-y-8 page-enter relative z-10 animate-fade-in-up">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900 dark:text-white tracking-tight">{title}</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400 font-medium">
            {subtitle}
          </p>
        </div>
        {action}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500 flex items-center gap-2 font-medium animate-fade-in">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <div className="glass-card shadow-soft overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-800/50 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">Ticket Queue</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Showing {tickets.length} of {total} results</p>
            </div>

            <form
              className="relative w-full sm:w-72"
              onSubmit={(e) => {
                e.preventDefault();
                updateQuery({ search: searchInput.trim() });
              }}
            >
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search, then press Enter..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="input-premium !pl-10 w-full"
              />
            </form>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {filters.map((filter) => (
              <select
                key={filter.key}
                aria-label={filter.label}
                value={query[filter.key]}
                onChange={(e) => updateQuery({ [filter.key]: e.target.value })}
                className="input-premium !py-2 text-sm cursor-pointer"
              >
                {filter.options.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            ))}
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setQuery(initialQuery);
              }}
              disabled={!hasFilters && query.sort === "newest"}
              className="btn-secondary px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear filters
            </button>
          </div>
        </div>

        <div className={refreshing ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <Table
            columns={columns}
            data={tickets}
            onRowClick={(row) => navigate(`/tickets/${row.id}`)}
          />
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between bg-slate-50/50 dark:bg-black/20">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuery((prev) => ({ ...prev, page: page - 1 }))}
                disabled={page <= 1 || refreshing}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setQuery((prev) => ({ ...prev, page: page + 1 }))}
                disabled={page >= totalPages || refreshing}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketQueue;
