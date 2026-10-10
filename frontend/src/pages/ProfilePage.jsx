import { useAuth } from "../context/AuthContext";
import { FaUserCircle, FaEnvelope, FaIdBadge, FaBuilding, FaCalendarAlt } from "react-icons/fa";

const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-8 page-enter relative z-10 animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-slate-900 dark:text-white tracking-tight">My Profile</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400 font-medium">
          View your personal information and account details.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="glass-card shadow-soft p-8 md:col-span-1 flex flex-col items-center text-center">
          <div className="w-32 h-32 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white shadow-xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-6">
            <img 
              src={`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(user?.name || 'User')}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`} 
              alt={user?.name} 
              className="w-full h-full object-cover" 
            />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display mb-2">{user?.name}</h2>
          <span className="text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-3 py-1 rounded-full uppercase tracking-wider mb-6">
            {user?.role}
          </span>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            This account is managed by your organization's administrator.
          </p>
        </div>

        {/* Details Card */}
        <div className="glass-card shadow-soft p-8 md:col-span-2">
          <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
            Account Information
          </h3>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                <FaIdBadge className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Full Name</p>
                <p className="text-base font-semibold text-slate-900 dark:text-white">{user?.name}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                <FaEnvelope className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Email Address</p>
                <p className="text-base font-semibold text-slate-900 dark:text-white">{user?.email}</p>
              </div>
            </div>

            {user?.role === 'client' && user?.organization_name && (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                  <FaBuilding className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Organization</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">{user?.organization_name}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                <FaCalendarAlt className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Account Status</p>
                <p className="text-base font-semibold text-emerald-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
