import { useEffect, useState } from "react";
import Loader from "../components/Loader";
import Table from "../components/Table/Table";
import api from "../services/api";

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const [deactivating, setDeactivating] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/admin/users");
        setUsers(response.data.data || []);
        setCurrentPage(1);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load users.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDeactivate = async (user) => {
    if (!window.confirm(`Are you sure you want to deactivate ${user.name}?\n\nThe user will no longer be active, but their historical data will be preserved.`)) {
      setOpenMenu(null);
      return;
    }

    try {
      setDeactivating(user.id);
      setError("");
      await api.delete(`/admin/users/${user.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setOpenMenu(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to deactivate user.");
    } finally {
      setDeactivating(null);
    }
  };

  const totalPages = Math.ceil(users.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentUsers = users.slice(startIndex, endIndex);

  const columns = [
    {
      key: "name",
      label: "Full Name",
      render: (user) => <span className="font-semibold text-slate-900 dark:text-white">{user.name}</span>,
    },
    {
      key: "email",
      label: "Email Address",
      render: (user) => <span className="text-slate-500 dark:text-slate-400">{user.email}</span>,
    },
    {
      key: "role",
      label: "Role",
      render: (user) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
          user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
          user.role === 'agent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
          'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
        }`}>
          {user.role}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (user) => (
        <div className="relative inline-block text-left">
          <button
            onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === user.id ? null : user.id); }}
            disabled={deactivating === user.id}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors focus:outline-none"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          
          {openMenu === user.id && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)}></div>
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-slate-800 shadow-soft-lg ring-1 ring-black ring-opacity-5 z-50 overflow-hidden transform opacity-100 scale-100 transition-all origin-top-right">
                <div className="py-1">
                  <button
                    onClick={() => handleDeactivate(user)}
                    disabled={deactivating === user.id}
                    className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors flex items-center gap-2 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    {deactivating === user.id ? "Deactivating..." : "Deactivate Account"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )
    }
  ];

  if (loading) return <Loader size="large" />;

  return (
    <div className="space-y-8 page-enter relative z-10 animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-slate-900 dark:text-white tracking-tight">User Management</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400 font-medium">
          Manage system access, roles, and deactivate accounts.
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
          <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">Active Users Directory</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Showing {currentUsers.length} of {users.length} total users</p>
        </div>

        <Table columns={columns} data={currentUsers} />

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between bg-slate-50/50 dark:bg-black/20">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); setOpenMenu(null); }}
                disabled={currentPage === 1}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); setOpenMenu(null); }}
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

export default AdminUsersPage;