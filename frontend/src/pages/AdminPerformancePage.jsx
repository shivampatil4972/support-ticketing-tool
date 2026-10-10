import { useEffect, useState } from "react";
import { FaBolt, FaCheckCircle, FaClock, FaExclamationTriangle, FaInbox } from "react-icons/fa";
import DashboardCard from "../components/dashboardCard";
import Loader from "../components/Loader";
import Table from "../components/Table/Table";
import api from "../services/api";
import { formatDuration } from "../utils/time";

const formatRate = (rate) => (rate === null || rate === undefined ? "—" : `${rate}%`);

const rateColor = (rate) =>
  rate === null || rate === undefined ? "text-slate-400" :
  rate >= 90 ? "text-emerald-500" :
  rate >= 70 ? "text-amber-500" :
  "text-rose-500";

const columns = [
  {
    key: "name",
    label: "Agent",
    render: (agent) => (
      <div>
        <p className="font-semibold text-slate-900 dark:text-white">{agent.name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{agent.email}</p>
      </div>
    ),
  },
  { key: "activeTickets", label: "Active", align: "center" },
  {
    key: "overdueTickets",
    label: "Overdue",
    align: "center",
    render: (agent) => (
      <span className={agent.overdueTickets > 0 ? "font-bold text-rose-500" : ""}>
        {agent.overdueTickets}
      </span>
    ),
  },
  { key: "closedTickets", label: "Closed", align: "center" },
  {
    key: "avgFirstResponseMinutes",
    label: "Avg First Response",
    align: "center",
    render: (agent) => formatDuration(agent.avgFirstResponseMinutes),
  },
  {
    key: "avgResolutionMinutes",
    label: "Avg Resolution",
    align: "center",
    render: (agent) => formatDuration(agent.avgResolutionMinutes),
  },
  {
    key: "slaHitRate",
    label: "SLA Hit Rate",
    align: "center",
    render: (agent) => (
      <span className={`font-bold ${rateColor(agent.slaHitRate)}`}>
        {formatRate(agent.slaHitRate)}
      </span>
    ),
  },
];

const AdminPerformancePage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get("/admin/performance");
        setData(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load performance data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Loader size="large" />;

  if (!data) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-500 flex items-center justify-center font-medium animate-fade-in-up">
        {error}
      </div>
    );
  }

  const { overall, agents } = data;

  return (
    <div className="space-y-8 page-enter relative z-10 animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-slate-900 dark:text-white tracking-tight">Performance</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400 font-medium">
          Response times, resolution times and SLA results across the support team.
        </p>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">All Tickets</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-5">
          <DashboardCard title="First Response" value={formatDuration(overall.avgFirstResponseMinutes)} subtitle="Average" icon={<FaBolt />} color="bg-gradient-to-br from-blue-500 to-indigo-600 shadow-glow-primary" />
          <DashboardCard title="Resolution" value={formatDuration(overall.avgResolutionMinutes)} subtitle="Average, created to closed" icon={<FaClock />} color="bg-gradient-to-br from-violet-500 to-purple-600" />
          <DashboardCard title="SLA Hit Rate" value={formatRate(overall.slaHitRate)} subtitle="Closed before due" icon={<FaCheckCircle />} color="bg-gradient-to-br from-emerald-500 to-teal-600" />
          <DashboardCard title="Overdue" value={overall.overdueTickets} subtitle="Open past SLA" icon={<FaExclamationTriangle />} color="bg-gradient-to-br from-rose-500 to-red-600" />
          <DashboardCard title="Unassigned" value={overall.unassignedTickets} subtitle="Waiting for an agent" icon={<FaInbox />} color="bg-gradient-to-br from-amber-400 to-orange-500" />
        </div>
      </div>

      <div className="glass-card shadow-soft overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-800/50">
          <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">By Agent</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Based on the tickets currently assigned to each agent. A dash means there is no data yet.
          </p>
        </div>

        <Table columns={columns} data={agents} />
      </div>
    </div>
  );
};

export default AdminPerformancePage;
