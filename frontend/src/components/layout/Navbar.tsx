import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../store/authStore.js";
import { api } from "../../services/api.js";
import { 
  Building2, 
  Bell, 
  LogOut, 
  ShieldCheck, 
  User as UserIcon,
  Activity,
  Menu,
  X,
  ChevronDown,
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { ProfileModal, UserAvatarDisplay } from "../profile/ProfileModal.js";

interface NavbarProps {
  onModuleChange?: (module: string) => void;
  isMobileOpen?: boolean;
  onToggleMobileMenu?: () => void;
  onLogout?: () => void;
  alertsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onModuleChange,
  isMobileOpen = false,
  onToggleMobileMenu,
  onLogout,
  alertsCount = 0,
}) => {
  const { user, logout } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const getRoleBadgeColor = (role: string = "") => {
    switch (role.toUpperCase()) {
      case "ADMIN":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "DR":
      case "DOCTOR":
        return "bg-teal-100 text-teal-800 border-teal-300";
      case "PHARMACIST":
        return "bg-sky-100 text-sky-800 border-sky-300";
      case "MANAGER":
      case "INVENTORY_MANAGER":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "STAFF":
        return "bg-indigo-100 text-indigo-800 border-indigo-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notifications popover on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleNotifications = async () => {
    const nextState = !isNotificationsOpen;
    setIsNotificationsOpen(nextState);
    if (nextState) {
      setLoadingAlerts(true);
      try {
        const res = await api.get("/alerts?isResolved=false");
        if (res.data?.success) {
          setRecentAlerts((res.data.data || []).slice(0, 5));
        }
      } catch {
        // ignore
      } finally {
        setLoadingAlerts(false);
      }
    }
  };

  return (
    <header className="shrink-0 w-full bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs safe-area-top select-none transition-all">
      <div className="h-14 sm:h-16 w-full px-2.5 sm:px-6 flex items-center justify-between gap-2 max-w-full">
        {/* Brand & Branch */}
        <div className="flex items-center space-x-1.5 sm:space-x-4 min-w-0 shrink">
          {/* Mobile Hamburger Button */}
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-1.5 sm:p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 shrink-0 cursor-pointer"
              aria-label="Toggle navigation drawer"
            >
              {isMobileOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6 text-slate-800" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-slate-800" />}
            </button>
          )}

          <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Activity className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <span className="font-bold text-sm sm:text-lg tracking-tight text-slate-900 truncate">MedFlow</span>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1 sm:px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Medical Inventory System</p>
            </div>
          </div>

          <div className="hidden xl:flex items-center space-x-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 shrink-0">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Central Pharmacy</span>
          </div>
        </div>

        {/* Right User actions */}
        <div className="flex items-center space-x-1 sm:space-x-3 shrink-0">
          {/* Interactive Alerts & Notifications Bell Button (Visible to all staff) */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={toggleNotifications}
              className={`relative p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer ${
                isNotificationsOpen 
                  ? "bg-emerald-50 text-emerald-700 ring-2 ring-emerald-400" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200"
              }`}
              title={alertsCount > 0 ? `${alertsCount} Unresolved Alert(s) - Click to view` : "No Active Alerts"}
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {alertsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 bg-rose-500 text-white text-[9px] sm:text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white animate-pulse shadow-xs">
                  {alertsCount > 99 ? "99+" : alertsCount}
                </span>
              )}
            </button>

            {/* Notifications Popover Dropdown */}
            {isNotificationsOpen && (
              <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] sm:max-w-none bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="font-bold text-sm text-slate-900">Notifications & Alerts</span>
                </div>
                {alertsCount > 0 ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full border border-rose-200">
                    {alertsCount} Active
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
                  </span>
                )}
              </div>

              {/* Alerts List */}
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {loadingAlerts ? (
                  <div className="p-6 text-center text-xs text-slate-400">Loading alerts...</div>
                ) : recentAlerts.length > 0 ? (
                  recentAlerts.map((alert) => (
                    <div
                      key={alert._id}
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        if (onModuleChange) onModuleChange("alerts");
                      }}
                      className="p-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-start space-x-3 text-left group"
                    >
                      <div className="shrink-0 mt-0.5">
                        {alert.severity === "CRITICAL" ? (
                          <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                            <Clock className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                          {alert.title}
                        </p>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                          {alert.message}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-700">No Unresolved Alerts</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">All stock and expiration checks are normal.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationsOpen(false);
                    if (onModuleChange) onModuleChange("alerts");
                  }}
                  className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <span>Open Alerts Center</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User profile card - Click to open Profile & Avatar Settings */}
        <button
          type="button"
          onClick={() => setIsProfileModalOpen(true)}
          className="flex items-center space-x-1.5 sm:space-x-3 pl-1.5 sm:pl-3 border-l border-slate-200 hover:bg-slate-50 active:bg-slate-100 p-1 sm:p-1.5 rounded-2xl transition-all cursor-pointer group text-left shrink-0"
          title="Click to view & edit profile"
          aria-label="User profile settings"
        >
          <div className="relative shrink-0">
            <UserAvatarDisplay
              avatar={user?.avatar}
              name={user?.name}
              role={user?.role}
              size="md"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-slate-900 leading-tight group-hover:text-emerald-700 transition-colors flex items-center gap-1">
              <span>{user?.name || "Medical Staff"}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </div>
            <div className="flex items-center space-x-1 mt-0.5">
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getRoleBadgeColor(user?.role)}`}>
                {user?.role || "STAFF"}
              </span>
            </div>
          </div>
        </button>

        {/* Logout button */}
        <button
          type="button"
          onClick={() => {
            if (onLogout) {
              onLogout();
            } else {
              logout();
            }
          }}
          className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50/70 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-lg transition-all cursor-pointer shadow-2xs shrink-0"
          title="Sign out of system"
          aria-label="Sign out"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span className="text-[11px] sm:text-xs font-bold text-rose-700">Logout</span>
        </button>
      </div>
    </div>

      {/* Profile Popup Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </header>
  );
};
