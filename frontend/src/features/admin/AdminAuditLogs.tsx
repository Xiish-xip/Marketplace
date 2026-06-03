import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity, Search, ChevronDown, ChevronUp, Download, Filter, X,
  RefreshCw, Clock, UserCheck, UserX, ShoppingCart, LogIn, AlertTriangle,
  Settings, Shield, Package, CreditCard, Globe, Database, Bot, Trash2,
  BarChart3, CalendarDays, Eye, EyeOff, MoreHorizontal, FileJson,
  Copy, CheckCircle2, TrendingUp, Users, FileEdit
} from 'lucide-react';
import { get } from '../../lib/api-enhanced';
import { useQuery } from '@tanstack/react-query';
import { useSocket } from '../../lib/socket';
import DataTable from '../shared/DataTable';

// ── Types ──
interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: string; firstName: string | null; lastName: string | null; email: string | null } | null;
}

interface AnalyticsSummary {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
}

// ── Constants ──
const ACTION_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  CREATE: { label: 'Create', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  UPDATE: { label: 'Update', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <FileEdit className="w-3.5 h-3.5" /> },
  DELETE: { label: 'Delete', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <Trash2 className="w-3.5 h-3.5" /> },
  LOGIN: { label: 'Login', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', icon: <LogIn className="w-3.5 h-3.5" /> },
  LOGOUT: { label: 'Logout', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: <LogIn className="w-3.5 h-3.5 rotate-180" /> },
  EXPORT: { label: 'Export', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <Download className="w-3.5 h-3.5" /> },
  VERIFY: { label: 'Verify', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400', icon: <UserCheck className="w-3.5 h-3.5" /> },
  REJECT: { label: 'Reject', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: <UserX className="w-3.5 h-3.5" /> },
  PAYMENT: { label: 'Payment', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400', icon: <CreditCard className="w-3.5 h-3.5" /> },
  SETTINGS: { label: 'Settings', color: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400', icon: <Settings className="w-3.5 h-3.5" /> },
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  USER: <Users className="w-3.5 h-3.5" />,
  PRODUCT: <Package className="w-3.5 h-3.5" />,
  ORDER: <ShoppingCart className="w-3.5 h-3.5" />,
  PAYMENT: <CreditCard className="w-3.5 h-3.5" />,
  SETTINGS: <Settings className="w-3.5 h-3.5" />,
  ROLE: <Shield className="w-3.5 h-3.5" />,
  AI: <Bot className="w-3.5 h-3.5" />,
  CACHE: <Database className="w-3.5 h-3.5" />,
  TRANSLATION: <Globe className="w-3.5 h-3.5" />,
};

const ACTION_TYPES = ['', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'VERIFY', 'REJECT', 'PAYMENT', 'SETTINGS'];
const ENTITY_TYPES = ['', 'USER', 'PRODUCT', 'ORDER', 'PAYMENT', 'SETTINGS', 'ROLE', 'AI', 'CACHE', 'TRANSLATION', 'SELLER', 'CATEGORY', 'PROMOTION', 'REVIEW'];

// ── Helpers ──
function getActionConfig(action: string) {
  return ACTION_CONFIG[action] || { label: action, color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: <Activity className="w-3.5 h-3.5" /> };
}

function getEntityIcon(entity: string) {
  return ENTITY_ICONS[entity] || <Activity className="w-3.5 h-3.5" />;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getTimeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

// ── Component ──
export default function AdminAuditLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [liveEvents, setLiveEvents] = useState<AuditLogEntry[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { socket, connected, on } = useSocket();

  // ── Query ──
  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['admin-audit-logs', page, search, actionFilter, entityFilter, dateFrom, dateTo],
    queryFn: () => get('/admin/audit-logs', {
      page, limit: 20,
      search: search || undefined,
      action: actionFilter || undefined,
      entity: entityFilter || undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
    }),
    refetchOnWindowFocus: autoRefresh,
  });

  const logs = data?.data || [];
  const pagination = data?.pagination;

  // ── Analytics summary ──
  const { data: analyticsData } = useQuery({
    queryKey: ['admin-analytics-summary'],
    queryFn: () => get<AnalyticsSummary>('/analytics/summary'),
    staleTime: 60000,
  });

  const summary = analyticsData?.data;

  // ── Auto-refresh timer ──
  const [countdown, setCountdown] = useState(refreshInterval);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (autoRefresh) {
      setCountdown(refreshInterval);
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            refetch();
            return refreshInterval;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, refreshInterval, refetch]);

  // ── Real-time socket listener for new audit events ──
  useEffect(() => {
    if (!socket) return;
    on('audit-event', (event: AuditLogEntry) => {
      setLiveEvents((prev) => [event, ...prev].slice(0, 50));
      // Auto-refresh if enabled
      if (autoRefresh) refetch();
    });
  }, [socket, on, autoRefresh, refetch]);

  // ── Export ──
  const exportCSV = useCallback(() => {
    const headers = 'Timestamp,User,Action,Entity,Entity ID,IP Address,User Agent,Details\n';
    const rows = logs.map((log: AuditLogEntry) =>
      `"${new Date(log.createdAt).toISOString()}","${log.user?.firstName || ''} ${log.user?.lastName || ''} ${log.user?.email || ''}","${log.action}","${log.entity}","${log.entityId || ''}","${log.ipAddress || ''}","${(log.userAgent || '').replace(/"/g, '""')}","${(log.details || '').replace(/"/g, '""')}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [logs]);

  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  }, [logs]);

  // ── Stats from logs ──
  const actionCounts = logs.reduce((acc: Record<string, number>, log: AuditLogEntry) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const deleteActions = actionCounts['DELETE'] || 0;
  const createActions = actionCounts['CREATE'] || 0;
  const updateActions = actionCounts['UPDATE'] || 0;
  const loginActions = (actionCounts['LOGIN'] || 0) + (actionCounts['LOGOUT'] || 0);

  // ── Render detail modal ──
  const expandedLog = expandedId ? logs.find((l: AuditLogEntry) => l.id === expandedId) || liveEvents.find((l: AuditLogEntry) => l.id === expandedId) : null;

  // ── Copy handler ──
  const handleCopy = (text: string, id: string) => {
    copyToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Clear live events ──
  const clearLiveEvents = () => setLiveEvents([]);

  // ── Dismiss single live event ──
  const dismissLiveEvent = (id: string) => {
    setLiveEvents((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Audit Logs & Analytics</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Track all platform activities, user actions, and system events
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Live indicator */}
          {connected && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          )}
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              autoRefresh
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? `Auto (${countdown}s)` : 'Auto'}
          </button>
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              showFilters || entityFilter || dateFrom || dateTo
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {(entityFilter || dateFrom || dateTo) && <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />}
          </button>
          {/* Export dropdown */}
          <div className="relative group">
            <button className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button onClick={exportCSV} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">CSV</button>
              <button onClick={exportJSON} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">JSON</button>
            </div>
          </div>
          <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* ── Analytics Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Events Today</span>
            <Activity className="w-4 h-4 text-primary-500" />
          </div>
          <p className="text-2xl font-bold">{pagination?.total || 0}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-emerald-600 font-medium">
              {liveEvents.length > 0 ? `+${liveEvents.length} new` : 'Synced'}
            </span>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</span>
            <ShoppingCart className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold">{summary?.totalOrders || 0}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Users</span>
            <Users className="w-4 h-4 text-violet-500" />
          </div>
          <p className="text-2xl font-bold">{summary?.totalUsers || 0}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold">${(summary?.totalRevenue || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* ── Action Distribution Bar ── */}
      {logs.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-500 font-medium flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> Activity</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Create: {createActions}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Update: {updateActions}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Delete: {deleteActions}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              Auth: {loginActions}
            </span>
          </div>
        </div>
      )}

      {/* ── Action Filter Pills ── */}
      <div className="flex flex-wrap gap-2">
        {ACTION_TYPES.map((a) => (
          <button
            key={a}
            onClick={() => { setActionFilter(a); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
              actionFilter === a
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            {a || 'All'}
          </button>
        ))}
      </div>

      {/* ── Advanced Filters ── */}
      {showFilters && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-1.5"><Filter className="w-4 h-4" /> Advanced Filters</h4>
            <button
              onClick={() => { setEntityFilter(''); setDateFrom(''); setDateTo(''); setSearch(''); }}
              className="text-xs text-primary-600 hover:underline"
            >
              Clear all
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Entity Type</label>
              <select
                value={entityFilter}
                onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
                className="input-field text-sm w-full"
              >
                {ENTITY_TYPES.map((e) => (
                  <option key={e} value={e}>{e || 'All Entities'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date From</label>
              <input
                type="datetime-local"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="input-field text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date To</label>
              <input
                type="datetime-local"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="input-field text-sm w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Live Events Banner ── */}
      {liveEvents.length > 0 && (
        <div className="card p-3 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {liveEvents.length} New Event{liveEvents.length > 1 ? 's' : ''}
            </span>
            <button onClick={clearLiveEvents} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Clear all</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {liveEvents.slice(0, 10).map((event) => {
              const cfg = getActionConfig(event.action);
              return (
                <span key={event.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  {cfg.icon}
                  {event.action}
                  <button onClick={() => dismissLiveEvent(event.id)} className="ml-0.5 hover:text-gray-900 dark:hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {liveEvents.length > 10 && <span className="text-[10px] text-gray-400">+{liveEvents.length - 10} more</span>}
          </div>
        </div>
      )}

      {/* ── Main Data Table ── */}
      <DataTable
        columns={[
          {
            key: 'createdAt',
            label: 'Timestamp',
            render: (val: string, row: AuditLogEntry) => (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{formatDate(val)}</p>
                  <p className="text-[10px] text-gray-400">{getTimeAgo(val)}</p>
                </div>
              </div>
            ),
          },
          {
            key: 'user',
            label: 'User',
            render: (val: any) => {
              if (!val) return <span className="text-xs text-gray-400 italic">System</span>;
              const name = `${val.firstName || ''} ${val.lastName || ''}`.trim() || val.email || 'Unknown';
              return (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-400 shrink-0">
                    {(val.firstName?.[0] || val.email?.[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium truncate max-w-[160px]">{name}</p>
                    {val.email && <p className="text-[10px] text-gray-400 truncate max-w-[160px]">{val.email}</p>}
                  </div>
                </div>
              );
            },
          },
          {
            key: 'action',
            label: 'Action',
            render: (val: string) => {
              const cfg = getActionConfig(val);
              return (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                  {cfg.icon}
                  {cfg.label}
                </span>
              );
            },
          },
          {
            key: 'entity',
            label: 'Entity',
            render: (val: string) => (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {getEntityIcon(val)}
                {val}
              </span>
            ),
          },
          {
            key: 'entityId',
            label: 'Entity ID',
            render: (val: string) => val ? (
              <code className="text-[11px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono">
                {val.length > 12 ? `${val.slice(0, 12)}...` : val}
              </code>
            ) : <span className="text-xs text-gray-400">-</span>,
          },
          {
            key: 'id',
            label: 'Details',
            render: (_: any, row: AuditLogEntry) => row.details ? (
              <button
                onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                className="text-primary-600 dark:text-primary-400 hover:underline text-xs font-medium inline-flex items-center gap-1"
              >
                {expandedId === row.id ? (
                  <><EyeOff className="w-3.5 h-3.5" /> Hide</>
                ) : (
                  <><Eye className="w-3.5 h-3.5" /> View</>
                )}
              </button>
            ) : <span className="text-xs text-gray-400">-</span>,
          },
        ]}
        data={logs}
        loading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search by user, action, entity, details..."
        emptyTitle="No audit logs found"
        emptyDescription="Actions performed on the platform will appear here. Try adjusting your filters."
      />

      {/* ── Expanded Detail Panel ── */}
      {expandedLog && (
        <div className="card p-5 animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <FileJson className="w-4 h-4 text-primary-500" />
              Event Details
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getActionConfig(expandedLog.action).color}`}>
                {expandedLog.action}
              </span>
            </h4>
            <button
              onClick={() => setExpandedId(null)}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Timestamp</label>
              <p className="text-sm">{formatDate(expandedLog.createdAt)}</p>
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">User</label>
              <p className="text-sm">{expandedLog.user ? `${expandedLog.user.firstName || ''} ${expandedLog.user.lastName || ''}`.trim() || expandedLog.user.email || 'N/A' : 'System'}</p>
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Entity</label>
              <p className="text-sm">{expandedLog.entity} {expandedLog.entityId && <code className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded font-mono">{expandedLog.entityId}</code>}</p>
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">IP Address</label>
              <p className="text-sm font-mono text-xs">{expandedLog.ipAddress || 'N/A'}</p>
            </div>
          </div>

          {expandedLog.userAgent && (
            <div className="mb-4">
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">User Agent</label>
              <p className="text-xs text-gray-600 dark:text-gray-400 break-words">{expandedLog.userAgent}</p>
            </div>
          )}

          {/* JSON Details Viewer */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Payload</label>
              <button
                onClick={() => handleCopy(expandedLog.details || '{}', expandedLog.id)}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                {copiedId === expandedLog.id ? (
                  <><CheckCircle2 className="w-3 h-3" /> Copied!</>
                ) : (
                  <><Copy className="w-3 h-3" /> Copy</>
                )}
              </button>
            </div>
            <pre className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl text-xs overflow-x-auto font-mono border dark:border-gray-700 max-h-64 overflow-y-auto">
              {(() => {
                try {
                  const parsed = JSON.parse(expandedLog.details || '{}');
                  return JSON.stringify(parsed, null, 2);
                } catch {
                  return expandedLog.details || '{}';
                }
              })()}
            </pre>
          </div>
        </div>
      )}

      {/* ── Last updated indicator ── */}
      <div className="text-center">
        <p className="text-[10px] text-gray-400">
          Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
          {connected && ' • Connected via WebSocket'}
        </p>
      </div>
    </div>
  );
}