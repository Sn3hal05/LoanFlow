import { useState, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Clock, FileText, AlertCircle, DollarSign, XCircle } from 'lucide-react';
import api from '../../services/api';

const TYPE_ICONS = {
  status_update: Clock,
  document_request: FileText,
  document_verified: Check,
  approval: CheckCheck,
  rejection: XCircle,
  disbursement: DollarSign,
  info: AlertCircle,
};

const TYPE_COLORS = {
  status_update: 'text-blue-600 bg-blue-50',
  document_request: 'text-amber-600 bg-amber-50',
  document_verified: 'text-green-600 bg-green-50',
  approval: 'text-emerald-600 bg-emerald-50',
  rejection: 'text-red-600 bg-red-50',
  disbursement: 'text-purple-600 bg-purple-50',
  info: 'text-gray-600 bg-gray-100',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications?limit=10');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((o) => !o); if (!open) fetchNotifications(); }}
        className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600" />
                <p className="font-semibold text-sm text-gray-900">Notifications</p>
                {unreadCount > 0 && (
                  <span className="bg-indigo-100 text-indigo-700 text-xs font-medium px-1.5 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded ml-2">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {loading && notifications.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
              )}
              {!loading && notifications.length === 0 && (
                <div className="py-8 text-center">
                  <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No notifications yet</p>
                </div>
              )}
              {notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] || AlertCircle;
                const iconColor = TYPE_COLORS[n.type] || TYPE_COLORS.info;
                return (
                  <div
                    key={n._id}
                    className={`flex gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? 'bg-indigo-50/30' : ''}`}
                    onClick={() => !n.read && markRead(n._id)}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium leading-snug ${!n.read ? 'text-gray-900' : 'text-gray-600'}`}>
                          {n.title}
                        </p>
                        {!n.read && <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-1.5" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.message}</p>
                      {n.applicationNumber && (
                        <p className="text-xs text-indigo-600 mt-0.5 font-mono">{n.applicationNumber}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
