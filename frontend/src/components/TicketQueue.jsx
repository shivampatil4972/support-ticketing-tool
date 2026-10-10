import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Loader from "./Loader";
import StatusBadge from "./StatusBadge";
import Table from "./Table/Table";
import AttachmentButton from "./AttachmentButton";
import api from "../services/api";

const TICKETS_PER_PAGE = 10;

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
    key: "organization_name",
    label: "Organization",
    render: (ticket) => (
      <span className="text-slate-500 dark:text-slate-400 font-medium">
        {ticket.organization_name || "N/A"}
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

// Paginated, searchable ticket list backed by a /tickets/* list endpoint
const TicketQueue = ({ endpoint, title, subtitle, errorMessage }) => {
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const loadTickets = async (page = 1, searchText = search) => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(endpoint, {
        params: { page, limit: TICKETS_PER_PAGE, search: searchText },
      });
      setTickets(response.data.data.tickets || []);
      setPagination(response.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const { page, total, totalPages } = pagination;

  if (loading) return <Loader size="large" />;

  return (
    <div className="space-y-8 page-enter relative z-10 animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-slate-900 dark:text-white tracking-tight">{title}</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400 font-medium">
          {subtitle}
        </p>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-200/50 dark:border-slate-800/50 gap-4">
          <div>
            <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">Ticket Queue</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Showing {tickets.length} of {total} results</p>
          </div>

          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadTickets(1)}
              className="input-premium !pl-10 w-full"
            />
          </div>
        </div>

        <Table
          columns={columns}
          data={tickets}
          onRowClick={(row) => navigate(`/tickets/${row.id}`)}
        />

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between bg-slate-50/50 dark:bg-black/20">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadTickets(page - 1)}
                disabled={page <= 1}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => loadTickets(page + 1)}
                disabled={page >= totalPages}
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
