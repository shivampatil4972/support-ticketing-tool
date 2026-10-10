import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { FaMoon, FaSun, FaSignOutAlt, FaChartPie, FaTicketAlt, FaUsers, FaBuilding, FaPlus, FaBars, FaTimes, FaUserCircle } from "react-icons/fa";

const navItems = {
  client: [
    { to: "/dashboard", label: "Dashboard", icon: <FaChartPie /> },
    { to: "/tickets/new", label: "Create Ticket", icon: <FaPlus /> },
  ],
  agent: [
    { to: "/tickets/assigned", label: "Assigned Tickets", icon: <FaTicketAlt /> },
    { to: "/tickets/unassigned", label: "Unassigned Queue", icon: <FaTicketAlt /> },
  ],
  admin: [
    { to: "/dashboard", label: "Overview", icon: <FaChartPie /> },
    { to: "/admin/users", label: "Manage Users", icon: <FaUsers /> },
    { to: "/admin/clients", label: "Manage Clients", icon: <FaBuilding /> },
  ],
};

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen relative z-10 page-enter">
      {/* Background Orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 flex h-screen w-72 flex-col glass-card border-l-0 border-t-0 border-b-0 rounded-none p-6 z-40 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="flex items-center justify-between mb-12">
          <Link to="/" className="flex items-center gap-3 group" onClick={() => setIsSidebarOpen(false)}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 shadow-glow-primary transition-transform duration-300 group-hover:scale-110">
              <span className="text-xl text-white font-black font-display">S</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight font-display">Support Desk</h2>
              <p className="text-xs text-primary-600 dark:text-primary-400 font-medium tracking-wide uppercase mt-0.5">
                Enterprise Hub
              </p>
            </div>
          </Link>
          <button 
            className="lg:hidden text-slate-500 dark:text-slate-400 p-2"
            onClick={() => setIsSidebarOpen(false)}
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-2 relative z-10 overflow-y-auto pr-2">
          <div className="mb-4 text-xs font-semibold text-slate-400 uppercase tracking-wider px-4">Menu</div>
          {(navItems[user?.role] || navItems.client).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <span className="text-lg opacity-80">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-h-screen flex-1 flex-col relative z-20 lg:ml-72 transition-all duration-300 w-full overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-20 px-4 md:px-8 py-4 backdrop-blur-md bg-white/70 dark:bg-[#050A18]/70 border-b border-slate-200/50 dark:border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setIsSidebarOpen(true)}
            >
              <FaBars size={20} />
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:block">Welcome back</span>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-display tracking-tight truncate max-w-[200px] sm:max-w-xs">
                {user?.name}
              </h1>
            </div>
          </div>

            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-soft text-slate-600 dark:text-slate-300 transition-all duration-300 hover:scale-105 hover:text-primary-500 dark:hover:text-primary-400 border border-slate-100 dark:border-slate-700"
                title="Toggle Theme"
              >
                {darkMode ? <FaSun className="text-yellow-400" /> : <FaMoon />}
              </button>

              {/* Profile Link */}
              <button
                onClick={() => navigate('/profile')}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-soft text-slate-600 dark:text-slate-300 transition-all duration-300 hover:scale-105 hover:text-primary-500 dark:hover:text-primary-400 border border-slate-100 dark:border-slate-700"
                title="My Profile"
              >
                <FaUserCircle size={18} />
              </button>

              {/* Role Badge */}
              <div className="hidden md:flex h-10 items-center rounded-xl bg-primary-50 dark:bg-primary-900/30 px-4 border border-primary-100 dark:border-primary-800/50">
                <span className="text-sm font-bold text-primary-600 dark:text-primary-400 capitalize flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
                  {user?.role}
                </span>
              </div>

              {/* User Dropdown / Logout Area */}
              <div className="h-10 border-l border-slate-200 dark:border-slate-700 mx-1"></div>

              <button
                onClick={logout}
                className="flex h-10 items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-800 px-4 text-sm font-semibold text-rose-500 transition-all hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-100 dark:border-slate-700 shadow-soft"
              >
                <FaSignOutAlt />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 p-4 md:p-8 w-full max-w-[100vw]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
