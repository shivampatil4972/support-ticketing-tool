const DashboardCard = ({ title, value, icon, color, subtitle = "", trend = null }) => {
  return (
    <div className={`stat-card ${color}`}>
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium opacity-80 tracking-wide uppercase">{title}</p>
            <h2 className="mt-2 text-4xl font-bold tracking-tight font-display">{value}</h2>
          </div>
          
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 dark:bg-white/10 backdrop-blur-md shadow-inner-glow">
            <span className="text-2xl drop-shadow-md">{icon}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          {subtitle && (
            <p className="text-xs font-medium opacity-70">{subtitle}</p>
          )}
          
          {trend && (
            <div className="flex items-center gap-1 text-xs font-semibold bg-white/10 px-2 py-1 rounded-full backdrop-blur-sm">
              {trend.direction === 'up' ? (
                <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg className="w-3 h-3 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              <span>{trend.value}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardCard;
