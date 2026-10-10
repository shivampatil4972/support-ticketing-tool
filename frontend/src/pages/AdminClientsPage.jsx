import { useEffect, useState } from "react";
import Loader from "../components/Loader";
import Table from "../components/Table/Table";
import api from "../services/api";
import { FaBuilding, FaCalendarAlt } from "react-icons/fa";

const AdminClientsPage = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const clientsPerPage = 10;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/admin/clients");
        setClients(response.data.data || []);
        setCurrentPage(1);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load clients.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalPages = Math.ceil(clients.length / clientsPerPage);
  const startIndex = (currentPage - 1) * clientsPerPage;
  const endIndex = startIndex + clientsPerPage;
  const currentClients = clients.slice(startIndex, endIndex);

  const columns = [
    {
      key: "organization_name",
      label: "Client Organization",
      render: (client) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center">
            <FaBuilding className="w-5 h-5" />
          </div>
          <span className="font-semibold text-slate-900 dark:text-white text-base">
            {client.organization_name}
          </span>
        </div>
      ),
    },
    {
      key: "created_at",
      label: "Registration Date",
      align: "right",
      render: (client) => (
        <div className="flex items-center justify-end gap-2 text-slate-500 dark:text-slate-400 font-medium">
          <FaCalendarAlt className="w-4 h-4 opacity-50" />
          {new Date(client.created_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      ),
    },
  ];

  if (loading) return <Loader size="large" />;

  return (
    <div className="space-y-8 page-enter relative z-10 animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-slate-900 dark:text-white tracking-tight">Client Organizations</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400 font-medium">
          View all registered client organizations in the system.
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
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-800/50">
          <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">Organization Directory</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Showing {currentClients.length} of {clients.length} total organizations</p>
        </div>

        <Table columns={columns} data={currentClients} />

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between bg-slate-50/50 dark:bg-black/20">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
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

export default AdminClientsPage;