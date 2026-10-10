import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaTicketAlt,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaUsers,
  FaBuilding,
  FaUserTie,
  FaTasks,
  FaPlus,
} from "react-icons/fa";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';

import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table/Table";
import DashboardCard from "../components/dashboardCard";
import AttachmentButton from "../components/AttachmentButton";
import Button from "../components/Button";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const DashboardPage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    pendingTickets: 0,
    closedTickets: 0,
    totalUsers: 0,
    totalClients: 0,
    totalAgents: 0,
  });

  const [agentStats, setAgentStats] = useState({
    assignedTickets: 0,
    pendingTickets: 0,
    closedTickets: 0,
  });

  const [clientStats, setClientStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    pendingTickets: 0,
    closedTickets: 0,
  });

  const { user } = useAuth();

  const loadTickets = async (searchText = "") => {
    try {
      setLoading(true);

      const endpoint = user.role === "agent" ? "/tickets/assigned" : "/tickets";
      const response = await api.get(`${endpoint}?search=${encodeURIComponent(searchText)}`);
      setTickets(response.data.data.tickets || []);

      if (user.role === "admin") {
        const statsResponse = await api.get("/admin/dashboard");
        setStats(statsResponse.data.data);
      } else if (user.role === "agent") {
        const statsResponse = await api.get("/tickets/dashboard");
        setAgentStats(statsResponse.data.data);
      } else if (user.role === "client") {
        const statsResponse = await api.get("/tickets/client-dashboard");
        setClientStats(statsResponse.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Load once on mount; later loads come from search
  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute Chart Data
  const priorityData = useMemo(() => {
    const counts = { urgent: 0, high: 0, medium: 0, low: 0 };
    tickets.forEach(t => { if (counts[t.priority] !== undefined) counts[t.priority]++; });
    return [
      { name: 'Urgent', count: counts.urgent, fill: '#ef4444' },
      { name: 'High', count: counts.high, fill: '#f59e0b' },
      { name: 'Medium', count: counts.medium, fill: '#3b82f6' },
      { name: 'Low', count: counts.low, fill: '#10b981' },
    ];
  }, [tickets]);

  const statusData = useMemo(() => {
    const counts = { open: 0, pending: 0, closed: 0 };
    tickets.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++; });
    return [
      { name: 'Open', value: counts.open, color: '#10b981' },
      { name: 'Pending', value: counts.pending, color: '#f59e0b' },
      { name: 'Closed', value: counts.closed, color: '#ef4444' },
    ];
  }, [tickets]);

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

  // Helper for rendering skeleton stat cards
  const renderSkeletonCards = (count) => (
    Array(count).fill(0).map((_, i) => (
      <Skeleton key={i} className="h-32 w-full rounded-2xl" />
    ))
  );

  return (
    <div className="space-y-8 page-enter relative z-10">
      
      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900 dark:text-white tracking-tight">
            {user.role === "admin" ? "Admin Overview" : user.role === "agent" ? "Agent Workspace" : "My Dashboard"}
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400 font-medium">
            {user.role === "admin"
              ? "Monitor system performance and ticket volumes."
              : user.role === "agent"
                ? "Manage and resolve your assigned support tickets."
                : "Track your support requests and create new tickets."}
          </p>
        </div>

        {user.role === "client" && (
          <Button onClick={() => navigate("/tickets/new")} className="flex items-center gap-2 whitespace-nowrap">
            <FaPlus className="w-3 h-3" />
            New Ticket
          </Button>
        )}
      </div>

      {/* Role-specific Dashboards */}
      {user.role === "admin" && (
        <div className="space-y-8 animate-fade-in-up">
          <div>
            <h3 className="mb-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">Ticket Metrics</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {loading ? renderSkeletonCards(4) : (
                <>
                  <DashboardCard title="Total Tickets" value={stats.totalTickets} subtitle="All Time" icon={<FaTicketAlt />} color="bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-800 dark:to-slate-950" />
                  <DashboardCard title="Open" value={stats.openTickets} subtitle="Awaiting Support" icon={<FaCheckCircle />} color="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-glow-success" />
                  <DashboardCard title="Pending" value={stats.pendingTickets} subtitle="Awaiting Client" icon={<FaClock />} color="bg-gradient-to-br from-amber-400 to-orange-500" />
                  <DashboardCard title="Closed" value={stats.closedTickets} subtitle="Resolved" icon={<FaTimesCircle />} color="bg-gradient-to-br from-rose-500 to-red-600" />
                </>
              )}
            </div>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">System Users</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {loading ? renderSkeletonCards(3) : (
                <>
                  <DashboardCard title="Clients" value={stats.totalClients} subtitle="Organizations" icon={<FaBuilding />} color="bg-gradient-to-br from-indigo-500 to-blue-600" />
                  <DashboardCard title="Users" value={stats.totalUsers} subtitle="Registered Accounts" icon={<FaUsers />} color="bg-gradient-to-br from-violet-500 to-purple-600" />
                  <DashboardCard title="Agents" value={stats.totalAgents} subtitle="Support Staff" icon={<FaUserTie />} color="bg-gradient-to-br from-fuchsia-500 to-pink-600" />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {user.role === "agent" && (
        <div className="animate-fade-in-up">
          <h3 className="mb-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">My Queue</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {loading ? renderSkeletonCards(3) : (
              <>
                <DashboardCard title="Assigned" value={agentStats.assignedTickets} subtitle="To You" icon={<FaTasks />} color="bg-gradient-to-br from-blue-500 to-indigo-600 shadow-glow-primary" />
                <DashboardCard title="Pending" value={agentStats.pendingTickets} subtitle="Awaiting Client" icon={<FaClock />} color="bg-gradient-to-br from-amber-400 to-orange-500" />
                <DashboardCard title="Resolved" value={agentStats.closedTickets} subtitle="All Time" icon={<FaCheckCircle />} color="bg-gradient-to-br from-emerald-500 to-teal-600" />
              </>
            )}
          </div>
        </div>
      )}

      {user.role === "client" && (
        <div className="animate-fade-in-up">
          <h3 className="mb-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">My Summary</h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {loading ? renderSkeletonCards(4) : (
              <>
                <DashboardCard title="Total" value={clientStats.totalTickets} subtitle="Tickets Created" icon={<FaTicketAlt />} color="bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-800 dark:to-slate-950" />
                <DashboardCard title="Open" value={clientStats.openTickets} subtitle="Awaiting Agent" icon={<FaCheckCircle />} color="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-glow-success" />
                <DashboardCard title="Pending" value={clientStats.pendingTickets} subtitle="Awaiting Your Reply" icon={<FaClock />} color="bg-gradient-to-br from-amber-400 to-orange-500" />
                <DashboardCard title="Closed" value={clientStats.closedTickets} subtitle="Resolved" icon={<FaTimesCircle />} color="bg-gradient-to-br from-rose-500 to-red-600" />
              </>
            )}
          </div>
        </div>
      )}

      {/* Analytics Section (Only show if not loading and has tickets) */}
      {!loading && tickets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {/* Priority Chart */}
          <div className="glass-card p-6 shadow-soft">
            <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white mb-6">Tickets by Priority</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.2} vertical={false} />
                  <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)', backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#fff' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Chart */}
          <div className="glass-card p-6 shadow-soft">
            <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white mb-6">Ticket Status</h3>
            <div className="h-64 flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)', backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#fff' }}
                  />
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="glass-card shadow-soft overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-200/50 dark:border-slate-800/50 gap-4">
          <div>
            <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">Recent Tickets</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Showing {loading ? '...' : tickets.length} results</p>
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
              onKeyDown={(e) => e.key === "Enter" && loadTickets(search)}
              className="input-premium !pl-10 w-full"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState 
            title="No Tickets Found"
            message={search ? `We couldn't find any tickets matching "${search}".` : "You're all caught up! There are no tickets to display."}
            action={
              user.role === 'client' && !search ? (
                <Button onClick={() => navigate("/tickets/new")}>Create Your First Ticket</Button>
              ) : null
            }
          />
        ) : (
          <Table 
            columns={columns} 
            data={tickets} 
            onRowClick={(row) => navigate(`/tickets/${row.id}`)}
          />
        )}
      </div>
    </div>
  );
};

export default DashboardPage;