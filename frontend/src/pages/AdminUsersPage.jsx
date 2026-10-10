import { useEffect, useState } from "react";
import Loader from "../components/Loader";
import Table from "../components/Table/Table";
import Button from "../components/Button";
import Input from "../components/Input";
import api from "../services/api";
import toast from "react-hot-toast";
import { FaUserPlus } from "react-icons/fa";

const emptyForm = { name: "", email: "", password: "", role: "agent", client_id: "" };

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const [deactivating, setDeactivating] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);
  const [clients, setClients] = useState([]);

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

  const openForm = async () => {
    setFormError("");
    setShowForm(true);

    // Organizations are only needed when creating a client user
    if (clients.length === 0) {
      try {
        const response = await api.get("/admin/clients");
        setClients(response.data.data || []);
      } catch {
        setFormError("Failed to load organizations. Client users cannot be created right now.");
      }
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");

    if (form.role === "client" && !form.client_id) {
      setFormError("Choose the organization this client belongs to.");
      return;
    }

    try {
      setCreating(true);
      const response = await api.post("/admin/users", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        client_id: form.role === "client" ? Number(form.client_id) : null,
      });
      setUsers((prev) => [response.data.data, ...prev]);
      setCurrentPage(1);
      setForm(emptyForm);
      setShowForm(false);
      toast.success(`${response.data.data.name} was added as ${response.data.data.role}`);
    } catch (err) {
      const details = err.response?.data?.error;
      setFormError(
        (Array.isArray(details) && details[0]?.msg) ||
          err.response?.data?.message ||
          "Failed to create user.",
      );
    } finally {
      setCreating(false);
    }
  };

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
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900 dark:text-white tracking-tight">User Management</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400 font-medium">
            Add agents and admins, and deactivate accounts.
          </p>
        </div>
        {!showForm && (
          <Button onClick={openForm} className="flex items-center gap-2 whitespace-nowrap">
            <FaUserPlus className="w-4 h-4" />
            Add User
          </Button>
        )}
      </div>

      {showForm && (
        <div className="glass-card shadow-soft p-6 animate-fade-in">
          <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white mb-1">Add User</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Agents and admins can only be created here. Clients can also sign up themselves.
          </p>

          {formError && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500 font-medium">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Full Name"
              required
              minLength={2}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label="Email Address"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Temporary Password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <label className="block w-full">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Role</span>
              <select
                className="input-premium cursor-pointer"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
                <option value="client">Client</option>
              </select>
            </label>

            {form.role === "client" && (
              <label className="block w-full md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Organization</span>
                <select
                  className="input-premium cursor-pointer"
                  value={form.client_id}
                  onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                >
                  <option value="">Select an organization</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.organization_name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="md:col-span-2 flex items-center justify-end gap-4">
              <Button
                type="button"
                variant="secondary"
                disabled={creating}
                onClick={() => { setShowForm(false); setForm(emptyForm); setFormError(""); }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Adding..." : "Add User"}
              </Button>
            </div>
          </form>
        </div>
      )}

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