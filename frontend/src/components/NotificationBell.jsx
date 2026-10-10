import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell } from "react-icons/fa";
import api from "../services/api";
import { timeAgo } from "../utils/time";

const POLL_INTERVAL_MS = 30000;

// Header bell: unread badge plus a dropdown of the latest notifications
const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const response = await api.get("/notifications");
      setNotifications(response.data.data.notifications || []);
      setUnreadCount(response.data.data.unreadCount || 0);
    } catch {
      // Polling is best-effort; the next tick will retry
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const handleToggle = () => {
    if (!open) load();
    setOpen(!open);
  };

  const handleOpenNotification = async (notification) => {
    setOpen(false);

    if (!notification.is_read) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === notification.id ? { ...item, is_read: 1 } : item)),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      api.patch(`/notifications/${notification.id}/read`).catch(() => {});
    }

    if (notification.ticket_id) navigate(`/tickets/${notification.ticket_id}`);
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: 1 })));
    setUnreadCount(0);
    api.patch("/notifications/read-all").catch(() => {});
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-soft text-slate-600 dark:text-slate-300 transition-all duration-300 hover:scale-105 hover:text-primary-500 dark:hover:text-primary-400 border border-slate-100 dark:border-slate-700"
        title="Notifications"
        aria-label={`Notifications, ${unreadCount} unread`}
      >
        <FaBell />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl bg-white dark:bg-slate-800 shadow-soft-lg ring-1 ring-black ring-opacity-5 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Notifications</h4>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-semibold text-primary-500 hover:text-primary-600"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">
                  No notifications yet.
                </p>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleOpenNotification(notification)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors flex gap-3 ${
                      notification.is_read ? "" : "bg-primary-50/60 dark:bg-primary-900/20"
                    }`}
                  >
                    <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${notification.is_read ? "bg-transparent" : "bg-primary-500"}`}></span>
                    <span className="min-w-0">
                      <span className={`block text-sm break-words ${notification.is_read ? "text-slate-600 dark:text-slate-300" : "font-semibold text-slate-900 dark:text-white"}`}>
                        {notification.message}
                      </span>
                      <span className="block mt-0.5 text-xs text-slate-400">
                        {timeAgo(notification.created_at)}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
