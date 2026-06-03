import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Activity, Search, ChevronDown, ChevronUp, Download, Filter, X,
  RefreshCw, Clock, UserCheck, UserX, ShoppingCart, LogIn, AlertTriangle,
  Settings, Shield, Package, CreditCard, Globe, Database, Bot, Trash2,
  BarChart3, CalendarDays, Eye, EyeOff, MoreHorizontal, FileJson,
  Copy, CheckCircle2, TrendingUp, Users, FileEdit, Terminal,
  Loader2, PieChart, Lightbulb, BrainCircuit, Sparkles, ArrowUpDown,
  ListOrdered, MapPin, Hash, AlertCircle, Info, ChevronLeft, ChevronRight
} from 'lucide-react';
import { get, post } from '../../lib/api-enhanced';
import { useQuery } from '@tanstack/react-query';
import { useSocket } from '../../lib/socket';

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
  source?: 'platform' | 'ai-tool';
  riskLevel?: string;
  status?: string;
  toolName?: string;
  arguments?: string;
  result?: string;
  user: { id: string; firstName: string | null; lastName: string | null; email: string | null } | null;
}

interface AiAuditLogEntry {
  id: string;
  toolName: string;
  userId: string | null;
  riskLevel: string;
  status: string;
  arguments: string | null;
  result: string | null;
  createdAt: string;
  approvedBy?: string | null;
}

interface AnalyticsData {
  totalLogs: number;
  aiLogs: number;
  platformLogs: number;
  actionDistribution: Record<string, number>;
  entityDistribution: Record<string, number>;
  topUsers: Array<{ userId: string; count: number; name?: string }>;
  topActions: Array<{ action: string; count: number }>;
  riskDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  hourlyActivity: number[];
  dailyActivity: number[];
  aiSummary: string;
}

// ── Constants ──
const ACTION_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  CREATE: { label: 'Create', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  UPDATE: { label: 'Update', color: 'bg-blue-100 text-blue-700', icon: <FileEdit className="w-3.5 h-3.5" /> },
  DELETE: { label: 'Delete', color: 'bg-red-100 text-red-700', icon: <Trash2 className="w-3.5 h-3.5" /> },
  LOGIN: { label: 'Login', color: 'bg-violet-100 text-violet-700', icon: <LogIn className="w-3.5 h-3.5" /> },
  LOGOUT: { label: 'Logout', color: 'bg-gray-100 text-gray-700', icon: <LogIn className="w-3.5 h-3.5 rotate-180" /> },
  EXPORT: { label: 'Export', color: 'bg-amber-100 text-amber-700', icon: <Download className="w-3.5 h-3.5" /> },
  VERIFY: { label: 'Verify', color: 'bg-teal-100 text-teal-700', icon: <UserCheck className="w-3.5 h-3.5" /> },
  REJECT: { label: 'Reject', color: 'bg-orange-100 text-orange-700', icon: <UserX className="w-3.5 h-3.5" /> },
  PAYMENT: { label: 'Payment', color: 'bg-cyan-100 text-cyan-700', icon: <CreditCard className="w-3.5 h-3.5" /> },
  SETTINGS: { label: 'Settings', color: 'bg-slate-100 text-slate-700', icon: <Settings className="w-3.5 h-3.5" /> },
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

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] || { label: action, color: 'bg-gray-100 text-gray-600', icon: <Activity className="w-3.5 h-3.5" /> };
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

function riskColor(level: string) {
  switch (level) {
    case 'critical': return 'text-red-600 bg-red-50';
    case 'high': return 'text-orange-600 bg-orange-50';
    case 'medium': return 'text-yellow-600 bg-yellow-50';
    default: return 'text-green-600 bg-green-50';
  }
}

function statusIcon(status: string) {
  switch (status) {
    case 'executed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'denied': return <XCircle className="w-4 h-4 text-red-500" />;
    case 'error': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    case 'pending': return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
    default: return <CheckCircle2 className="w-4 h-4 text-gray-400" />;
  }
}

// ── Mini Sparkline Component ──
function MiniSparkline({ data, color = 'emerald' }: { data: number[]; color?: string }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const height = 32;
  const width = 120;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - (v / max) * height}`).join(' ');
  return (
    <svg width={width} height={height} className="inline-block">
      <polyline fill="none" stroke={`var(--color-${color}-500, #10b981)`} strokeWidth="1.5" points={points} />
    </svg>
  );
}

// ── Main Component ──
export default function AdminUnifiedAuditLog() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [logType, setLogType] = useState<'all' | 'platform' | 'ai'>('all');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [liveEvents, setLiveEvents] = useState<AuditLogEntry[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'analytics' | 'ai'>('logs');

  const { socket, connected, on } = useSocket();

  // ── Fetch Platform Audit Logs ──
  const platformQuery = useQuery({
    queryKey: ['admin-audit-logs', page, search, actionFilter, entityFilter, dateFrom, dateTo],
    queryFn: () => get('/admin/audit-logs', {
      page, limit: 25,
      search: search || undefined,
      action: actionFilter || undefined,
      entity: entityFilter || undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
    }),
    enabled: logType === 'all' || logType === 'platform',
    refetchOnWindowFocus: autoRefresh,
  });

  // ── Fetch AI Tool Audit Logs ──
  const aiQuery = useQuery({
    queryKey: ['admin-ai-audit-logs', page, search, riskFilter, statusFilter],
    queryFn: () => get('/ai-tools/audit-logs', {
      page, limit: 25,
      search: search || undefined,
      riskLevel: riskFilter || undefined,
      status: statusFilter || undefined,
    }),
    enabled: logType === 'all' || logType === 'ai',
    refetchOnWindowFocus: autoRefresh,
  });

  // ── Merge & Sort Logs ──
  const mergedLogs: AuditLogEntry[] = useMemo(() => {
    const platformLogs: AuditLogEntry[] = (platformQuery.data?.data || []).map((l: any) => ({ ...l, source: 'platform' as const }));
    const aiLogs: AuditLogEntry[] = (aiQuery.data?.data?.data || aiQuery.data?.data || []).map((l: any) => ({
      id: l.id,
      userId: l.userId,
      action: 'AI_TOOL',
      entity: 'AI',
      entityId: l.toolName,
      details: l.arguments || l.result || null,
      ipAddress: null,
      userAgent: null,
      createdAt: l.createdAt,
      source: 'ai-tool' as const,
      riskLevel: l.riskLevel,
      status: l.status,
      toolName: l.toolName,
      arguments: l.arguments,
      result: l.result,
      user: null,
    }));

    let combined: AuditLogEntry[];
    if (logType === 'all') {
      combined = [...platformLogs, ...aiLogs];
    } else if (logType === 'platform') {
      combined = platformLogs;
    } else {
      combined = aiLogs;
    }

    return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [platformQuery.data, aiQuery.data, logType]);

  const totalCount = platformQuery.data?.pagination?.total || 0;
  const aiTotalCount = aiQuery.data?.pagination?.total || 0;
  const pagination = logType === 'ai' ? aiQuery.data?.pagination : platformQuery.data?.pagination;

  const isLoading = platformQuery.isLoading || aiQuery.isLoading;

  // ── Analytics ──
  const analytics: AnalyticsData = useMemo(() => {
    const actionDist: Record<string, number> = {};
    const entityDist: Record<string, number> = {};
    const riskDist: Record<string, number> = {};
    const statusDist: Record<string, number> = {};
    const userMap: Record<string, { count: number; name?: string }> = {};
    const hourly = new Array(24).fill(0);
    const daily = new Array(7).fill(0);

    mergedLogs.forEach(log => {
      actionDist[log.action] = (actionDist[log.action] || 0) + 1;
      entityDist[log.entity] = (entityDist[log.entity] || 0) + 1;
      if (log.riskLevel) riskDist[log.riskLevel] = (riskDist[log.riskLevel] || 0) + 1;
      if (log.status) statusDist[log.status] = (statusDist[log.status] || 0) + 1;
      if (log.userId) {
        userMap[log.userId] = userMap[log.userId] || { count: 0, name: log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() || log.user.email : undefined };
        userMap[log.userId].count++;
      }
      const date = new Date(log.createdAt);
      hourly[date.getHours()]++;
      daily[date.getDay()]++;
    });

    const sortedActions = Object.entries(actionDist).sort((a, b) => b[1] - a[1]).map(([action, count]) => ({ action, count }));
    const sortedUsers = Object.entries(userMap).sort((a, b) => b[1].count - a[1].count).slice(0, 10).map(([userId, data]) => ({ userId, count: data.count, name: data.name }));

    return {
      totalLogs: mergedLogs.length,
      aiLogs: mergedLogs.filter(l => l.source === 'ai-tool').length,
      platformLogs: mergedLogs.filter(l => l.source === 'platform').length,
      actionDistribution: actionDist,
      entityDistribution: entityDist,
      topUsers: sortedUsers,
      topActions: sortedActions.slice(0, 10),
      riskDistribution: riskDist,
      statusDistribution: statusDist,
      hourlyActivity: hourly,
      dailyActivity: daily,
      aiSummary: '',
    };
  }, [mergedLogs]);

  // ── AI Analysis ──
  const generateAiAnalysis = useCallback(async () => {
    setLoadingAnalysis(true);
    try {
      // Generate local analysis instantly (no AI dependency)
      // This provides comprehensive insights without needing AI providers configured
      const analysis = generateLocalAnalysis(analytics, mergedLogs);
      
      // Simulate a brief delay for UX (shows the "analyzing" animation briefly)
      await new Promise(resolve => setTimeout(resolve, 800));
      setAiAnalysis(analysis);
    } finally {
      setLoadingAnalysis(false);
    }
  }, [analytics, mergedLogs, dateFrom, dateTo]);

  function generateLocalAnalysis(an: AnalyticsData, logs: AuditLogEntry[]): string {
    const lines: string[] = [];
    lines.push(`## 📊 Audit Intelligence Report\n`);
    lines.push(`**Period:** ${dateFrom || 'All time'} → ${dateTo || 'Now'}`);
    lines.push(`**Total Events:** ${an.totalLogs} (${an.platformLogs} platform + ${an.aiLogs} AI tool executions)\n`);

    const deleteCount = an.actionDistribution['DELETE'] || 0;
    if (deleteCount > 5) {
      lines.push(`⚠️ **High Deletion Activity:** ${deleteCount} delete operations detected — review for potential data loss risks.`);
    }

    const criticalRisk = an.riskDistribution['critical'] || 0;
    const highRisk = an.riskDistribution['high'] || 0;
    if (criticalRisk > 0 || highRisk > 0) {
      lines.push(`🚨 **Security Alert:** ${criticalRisk} critical-risk and ${highRisk} high-risk actions detected. Immediate review recommended.`);
    }

    const peakHour = an.hourlyActivity.indexOf(Math.max(...an.hourlyActivity));
    lines.push(`⏰ **Peak Activity Hour:** ${peakHour}:00 (${an.hourlyActivity[peakHour]} events)`);
    lines.push(`📅 **Most Active Day:** ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][an.dailyActivity.indexOf(Math.max(...an.dailyActivity))]}`);

    if (an.topActions.length > 0) {
      lines.push(`\n### Top Actions\n`);
      an.topActions.slice(0, 5).forEach(a => lines.push(`- **${a.action}:** ${a.count} times`));
    }

    if (an.topUsers.length > 0) {
      lines.push(`\n### Most Active Users\n`);
      an.topUsers.slice(0, 5).forEach(u => lines.push(`- ${u.name || u.userId.slice(0, 8)}: ${u.count} actions`));
    }

    lines.push(`\n### Recommendations\n`);
    lines.push(`1. ${criticalRisk > 0 || highRisk > 0 ? 'Review and audit high-risk activities immediately.' : 'Continue monitoring activities for unusual patterns.'}`);
    lines.push(`2. Set up alerts for DELETE operations on critical entities.`);
    lines.push(`3. Schedule regular audit log reviews to maintain security compliance.`);
    lines.push(`4. ${an.aiLogs > 0 ? 'Monitor AI tool usage patterns and ensure proper approval workflows.' : 'Enable AI tool audit logging for complete visibility.'}`);

    return lines.join('\n');
  }

  // ── Auto-refresh ──
  const [countdown, setCountdown] = useState(refreshInterval);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (autoRefresh) {
      setCountdown(refreshInterval);
      intervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            platformQuery.refetch();
            aiQuery.refetch();
            return refreshInterval;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, refreshInterval]);

  // ── Socket listener ──
  useEffect(() => {
    if (!socket) return;
    on('audit-event', (event: any) => {
      const typed: AuditLogEntry = { ...event, source: 'platform' as const };
      setLiveEvents(prev => [typed, ...prev].slice(0, 50));
      if (autoRefresh) platformQuery.refetch();
    });
  }, [socket, on, autoRefresh]);

  // ── Export ──
  const exportCSV = useCallback(() => {
    const headers = 'Timestamp,Source,User,Action,Entity,Entity ID,Risk Level,Status,IP Address,Details\n';
    const rows = mergedLogs.map(log =>
      `"${new Date(log.createdAt).toISOString()}","${log.source || 'platform'}","${log.user?.firstName || ''} ${log.user?.lastName || ''} ${log.user?.email || ''}","${log.action}","${log.entity}","${log.entityId || ''}","${log.riskLevel || ''}","${log.status || ''}","${log.ipAddress || ''}","${(log.details || '').replace(/"/g, '""')}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `unified-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [mergedLogs]);

  // ── Detailed view ──
  const expandedLog = expandedId ? mergedLogs.find(l => l.id === expandedId) || liveEvents.find(l => l.id === expandedId) : null;

  // ── Filters ──
  const clearFilters = () => {
    setSearch(''); setActionFilter(''); setEntityFilter(''); setRiskFilter('');
    setStatusFilter(''); setDateFrom(''); setDateTo(''); setPage(1);
  };

  const hasActiveFilters = search || actionFilter || entityFilter || riskFilter || statusFilter || dateFrom || dateTo;

  const getStatusBadge = (log: AuditLogEntry) => {
    if (log.source === 'ai-tool' && log.status) {
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
          log.status === 'executed' ? 'bg-emerald-100 text-emerald-700' :
          log.status === 'denied' ? 'bg-red-100 text-red-700' :
          log.status === 'error' ? 'bg-orange-100 text-orange-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          {statusIcon(log.status)}
          {log.status}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary-50 text-primary-600">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Unified Audit Intelligence Center</h2>
            <p className="text-sm text-gray-500">
              Real-time platform & AI tool activity monitoring with AI-powered insights
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {connected && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          )}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['all', 'platform', 'ai'] as const).map(t => (
              <button key={t} onClick={() => { setLogType(t); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  logType === t ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t === 'all' ? 'All' : t === 'platform' ? 'Platform' : 'AI Tools'}
              </button>
            ))}
          </div>
          <button onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              autoRefresh ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? `${countdown}s` : 'Auto'}
          </button>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              showFilters || hasActiveFilters ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />}
          </button>
          <div className="relative group">
            <button className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <div className="absolute right-0 mt-1 w-36 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button onClick={exportCSV} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2">CSV</button>
            </div>
          </div>
          <button onClick={() => { platformQuery.refetch(); aiQuery.refetch(); }} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { key: 'logs', label: 'Live Log Feed', icon: <ListOrdered className="w-4 h-4" /> },
          { key: 'analytics', label: 'Analytics & Charts', icon: <BarChart3 className="w-4 h-4" /> },
          { key: 'ai', label: 'AI Intelligence', icon: <BrainCircuit className="w-4 h-4" /> },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════
          TAB 1: LIVE LOG FEED
         ══════════════════════════════════════════════════ */}
      {activeTab === 'logs' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Events</span>
                <Activity className="w-4 h-4 text-primary-500" />
              </div>
              <p className="text-2xl font-bold">{analytics.totalLogs}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-emerald-600 font-medium">{liveEvents.length > 0 ? `+${liveEvents.length} new` : 'Synced'}</span>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</span>
                <Database className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold">{analytics.platformLogs}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">AI Tool Executions</span>
                <Bot className="w-4 h-4 text-violet-500" />
              </div>
              <p className="text-2xl font-bold">{analytics.aiLogs}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Unique Users</span>
                <Users className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold">{analytics.topUsers.length}</p>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-1.5"><Filter className="w-4 h-4" /> Filters</h4>
                <button onClick={clearFilters} className="text-xs text-primary-600 hover:underline">
                  {hasActiveFilters ? 'Clear all' : 'Reset'}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
                  <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">All Actions</option>
                    <option value="CREATE">Create</option>
                    <option value="UPDATE">Update</option>
                    <option value="DELETE">Delete</option>
                    <option value="LOGIN">Login</option>
                    <option value="AI_TOOL">AI Tool</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Entity</label>
                  <select value={entityFilter} onChange={e => { setEntityFilter(e.target.value); setPage(1); }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">All Entities</option>
                    <option value="USER">User</option>
                    <option value="PRODUCT">Product</option>
                    <option value="ORDER">Order</option>
                    <option value="PAYMENT">Payment</option>
                    <option value="AI">AI</option>
                    <option value="SETTINGS">Settings</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Risk Level (AI)</label>
                  <select value={riskFilter} onChange={e => { setRiskFilter(e.target.value); setPage(1); }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">All Risks</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                  <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* Live Events Banner */}
          {liveEvents.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-3 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {liveEvents.length} New Event{liveEvents.length > 1 ? 's' : ''}
                </span>
                <button onClick={() => setLiveEvents([])} className="text-xs text-gray-500 hover:text-gray-700">Clear all</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {liveEvents.slice(0, 10).map(event => (
                  <span key={event.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                    {event.action === 'AI_TOOL' ? <Bot className="w-3 h-3" /> : getEntityIcon(event.entity)}
                    {event.action === 'AI_TOOL' ? event.entityId || 'AI Tool' : event.action}
                    <button onClick={() => setLiveEvents(prev => prev.filter(e => e.id !== event.id))} className="ml-0.5 hover:text-gray-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {liveEvents.length > 10 && <span className="text-[10px] text-gray-400">+{liveEvents.length - 10} more</span>}
              </div>
            </div>
          )}

          {/* Quick Action Distribution Bar */}
          {analytics.topActions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="flex items-center gap-4 text-xs flex-wrap">
                <span className="text-gray-500 font-medium flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> Activity</span>
                {analytics.topActions.slice(0, 6).map(a => (
                  <span key={a.action} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      a.action === 'CREATE' ? 'bg-emerald-500' :
                      a.action === 'UPDATE' ? 'bg-blue-500' :
                      a.action === 'DELETE' ? 'bg-red-500' :
                      a.action === 'LOGIN' ? 'bg-violet-500' :
                      a.action === 'AI_TOOL' ? 'bg-purple-500' :
                      'bg-gray-500'
                    }`} />
                    {a.action === 'AI_TOOL' ? 'AI Tool' : a.action}: {a.count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search across all logs..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm" />
          </div>

          {/* Search Results Count */}
          {search && (
            <p className="text-sm text-gray-500">
              Found {mergedLogs.length} result{mergedLogs.length !== 1 ? 's' : ''} for "{search}"
            </p>
          )}

          {/* Logs Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Entity</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Risk</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...</td></tr>
                  ) : mergedLogs.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <Activity className="w-8 h-8 text-gray-300" />
                        <p className="font-medium">No audit logs found</p>
                        <p className="text-xs">Actions performed on the platform will appear here. Try adjusting your filters.</p>
                      </div>
                    </td></tr>
                  ) : mergedLogs.map(log => (
                    <tr key={`${log.source}-${log.id}`} className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedId(expandedId === `${log.source}-${log.id}` ? null : `${log.source}-${log.id}`)}>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          <span title={formatDate(log.createdAt)}>{getTimeAgo(log.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {log.source === 'ai-tool' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                            <Bot className="w-3 h-3" /> AI
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                            <Database className="w-3 h-3" /> Platform
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {log.user ? (
                          <span className="text-xs font-medium">{log.user.firstName || log.user.email || 'Unknown'}</span>
                        ) : log.userId ? (
                          <span className="text-xs font-mono text-gray-500">{log.userId.slice(0, 8)}...</span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">System</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {log.action === 'AI_TOOL' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            <Terminal className="w-3 h-3" />
                            {log.toolName || log.entityId || 'AI Tool'}
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getActionConfig(log.action).color}`}>
                            {getActionConfig(log.action).icon}
                            {getActionConfig(log.action).label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                          {getEntityIcon(log.entity)}
                          {log.entity === 'AI' && log.toolName ? `${log.toolName}` : log.entity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {log.riskLevel ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${riskColor(log.riskLevel)}`}>
                            {log.riskLevel}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(log) || (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {log.details ? (
                          <button onClick={e => { e.stopPropagation(); setExpandedId(expandedId === `${log.source}-${log.id}` ? null : `${log.source}-${log.id}`); }}
                            className="text-primary-600 hover:underline text-xs font-medium inline-flex items-center gap-1"
                          >
                            {expandedId === `${log.source}-${log.id}` ? <><EyeOff className="w-3 h-3" /> Hide</> : <><Eye className="w-3 h-3" /> View</>}
                          </button>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>
                  <button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 flex items-center gap-1">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Expanded Detail Panel */}
          {expandedLog && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 animate-fadeIn">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-primary-500" />
                  Event Details
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${expandedLog.source === 'ai-tool' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {expandedLog.source === 'ai-tool' ? 'AI Tool' : 'Platform'}
                  </span>
                </h4>
                <button onClick={() => setExpandedId(null)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Timestamp</label>
                  <p className="text-sm">{formatDate(expandedLog.createdAt)}</p>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">User</label>
                  <p className="text-sm">{expandedLog.user ? `${expandedLog.user.firstName || ''} ${expandedLog.user.lastName || ''}`.trim() || expandedLog.user.email || 'N/A' : expandedLog.userId || 'System'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Entity</label>
                  <p className="text-sm">{expandedLog.entity} {expandedLog.entityId && <code className="text-[10px] bg-gray-100 px-1 py-0.5 rounded font-mono">{expandedLog.entityId}</code>}</p>
                </div>
                {expandedLog.riskLevel && (
                  <div>
                    <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Risk Level</label>
                    <p><span className={`px-2 py-0.5 rounded text-xs font-medium ${riskColor(expandedLog.riskLevel)}`}>{expandedLog.riskLevel}</span></p>
                  </div>
                )}
                {expandedLog.status && (
                  <div>
                    <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Status</label>
                    <div className="mt-1">{statusIcon(expandedLog.status)} <span className="text-sm ml-1">{expandedLog.status}</span></div>
                  </div>
                )}
                {expandedLog.ipAddress && (
                  <div>
                    <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">IP Address</label>
                    <p className="text-sm font-mono text-xs">{expandedLog.ipAddress}</p>
                  </div>
                )}
              </div>

              {/* Payload */}
              {expandedLog.details && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Payload</label>
                    <button onClick={() => copyToClipboard(expandedLog.details || '{}')}
                      className="text-xs text-primary-600 hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <pre className="bg-gray-50 p-4 rounded-xl text-xs overflow-x-auto font-mono border max-h-64 overflow-y-auto">
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
              )}

              {expandedLog.result && (
                <div className="mt-4">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Result</label>
                  <pre className="bg-gray-50 p-4 rounded-xl text-xs overflow-x-auto font-mono border max-h-64 overflow-y-auto mt-1">
                    {(() => {
                      try {
                        const parsed = JSON.parse(expandedLog.result);
                        return JSON.stringify(parsed, null, 2);
                      } catch {
                        return expandedLog.result;
                      }
                    })()}
                  </pre>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 2: ANALYTICS & CHARTS
         ══════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.totalLogs}</p>
                  <p className="text-xs text-gray-500">Total Events</p>
                </div>
              </div>
              <MiniSparkline data={analytics.hourlyActivity} color="primary" />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.platformLogs}</p>
                  <p className="text-xs text-gray-500">Platform Events</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-violet-50 text-violet-600">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.aiLogs}</p>
                  <p className="text-xs text-gray-500">AI Tool Executions</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.topUsers.length}</p>
                  <p className="text-xs text-gray-500">Active Users</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Action Distribution */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-primary-500" />
                Action Distribution
              </h3>
              <div className="space-y-2">
                {analytics.topActions.slice(0, 8).map(a => {
                  const maxCount = analytics.topActions[0]?.count || 1;
                  const pct = Math.round((a.count / analytics.totalLogs) * 100);
                  return (
                    <div key={a.action} className="flex items-center gap-3">
                      <span className="text-xs font-medium w-20 text-right">{a.action === 'AI_TOOL' ? 'AI Tool' : a.action}</span>
                      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${
                          a.action === 'CREATE' ? 'bg-emerald-500' :
                          a.action === 'UPDATE' ? 'bg-blue-500' :
                          a.action === 'DELETE' ? 'bg-red-500' :
                          a.action === 'LOGIN' ? 'bg-violet-500' :
                          a.action === 'AI_TOOL' ? 'bg-purple-500' :
                          'bg-gray-500'
                        }`} style={{ width: `${(a.count / maxCount) * 100}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-16">{a.count} ({pct}%)</span>
                    </div>
                  );
                })}
                {analytics.topActions.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No data available</p>}
              </div>
            </div>

            {/* Hourly Activity */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary-500" />
                Hourly Activity
              </h3>
              <div className="flex items-end gap-1 h-32">
                {analytics.hourlyActivity.map((val, i) => {
                  const max = Math.max(...analytics.hourlyActivity, 1);
                  const height = (val / max) * 100;
                  const isPeak = val === Math.max(...analytics.hourlyActivity) && val > 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '100%' }}>
                        <div className={`absolute bottom-0 w-full rounded-t transition-all ${isPeak ? 'bg-primary-500' : 'bg-primary-300'}`}
                          style={{ height: `${height}%` }}
                          title={`${val} events at ${i}:00`}
                        />
                      </div>
                      <span className={`text-[9px] ${isPeak ? 'text-primary-600 font-bold' : 'text-gray-400'}`}>
                        {i === 0 ? '12a' : i < 12 ? `${i}a` : i === 12 ? '12p' : `${i - 12}p`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Users */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary-500" />
                Most Active Users
              </h3>
              <div className="space-y-2">
                {analytics.topUsers.slice(0, 10).map((u, i) => (
                  <div key={u.userId} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                    <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700 shrink-0">
                      {(u.name?.[0] || u.userId[0] || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{u.name || `User ${u.userId.slice(0, 8)}`}</p>
                    </div>
                    <span className="text-xs font-medium text-gray-500">{u.count} actions</span>
                  </div>
                ))}
                {analytics.topUsers.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No users found</p>}
              </div>
            </div>

            {/* Risk Distribution (AI tools only) */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-primary-500" />
                AI Tool Risk Distribution
              </h3>
              {Object.keys(analytics.riskDistribution).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(analytics.riskDistribution).map(([level, count]) => {
                    const maxCount = Math.max(...Object.values(analytics.riskDistribution), 1);
                    const pct = Math.round((count / analytics.totalLogs) * 100);
                    return (
                      <div key={level} className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${riskColor(level)} w-16 text-center`}>{level}</span>
                        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${
                            level === 'critical' ? 'bg-red-500' :
                            level === 'high' ? 'bg-orange-500' :
                            level === 'medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`} style={{ width: `${(count / maxCount) * 100}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-16">{count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">No AI tool risk data available</p>
              )}
            </div>
          </div>

          {/* Entity Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-primary-500" />
              Entity Distribution
            </h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(analytics.entityDistribution).sort((a, b) => b[1] - a[1]).map(([entity, count]) => {
                const pct = Math.round((count / analytics.totalLogs) * 100);
                return (
                  <div key={entity} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                    <span className="text-xs font-medium">{entity}</span>
                    <span className="text-xs font-bold">{count}</span>
                    <span className="text-[10px] text-gray-400">({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 3: AI INTELLIGENCE
         ══════════════════════════════════════════════════ */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          {/* AI Analysis Panel */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-primary-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary-100 text-primary-600">
                    <BrainCircuit className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI-Powered Audit Intelligence</h3>
                    <p className="text-xs text-gray-500">Analyze logs for anomalies, security threats, and actionable insights</p>
                  </div>
                </div>
                <button
                  onClick={() => { generateAiAnalysis(); setShowAiPanel(true); }}
                  disabled={loadingAnalysis || mergedLogs.length === 0}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loadingAnalysis ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Run AI Analysis</>
                  )}
                </button>
              </div>
            </div>

            {showAiPanel && (
              <div className="p-5">
                {loadingAnalysis ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="relative">
                      <BrainCircuit className="w-12 h-12 text-primary-400 animate-pulse" />
                      <Loader2 className="w-6 h-6 text-primary-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">AI is analyzing {analytics.totalLogs} audit events...</p>
                    <p className="text-xs text-gray-400">Examining patterns, anomalies, and security indicators</p>
                  </div>
                ) : aiAnalysis ? (
                  <div className="prose prose-sm max-w-none">
                    <div className="bg-gray-50 rounded-xl p-6 whitespace-pre-wrap text-sm leading-relaxed font-mono">
                      {aiAnalysis.split('\n').map((line, i) => {
                        if (line.startsWith('## ')) return <h3 key={i} className="text-lg font-bold text-gray-900 mt-4 mb-2">{line.replace('## ', '')}</h3>;
                        if (line.startsWith('### ')) return <h4 key={i} className="text-base font-semibold text-gray-800 mt-3 mb-1">{line.replace('### ', '')}</h4>;
                        if (line.startsWith('**')) return <p key={i} className="font-semibold text-gray-700 my-1">{line.replace(/\*\*/g, '')}</p>;
                        if (line.startsWith('- ')) return <li key={i} className="text-gray-600 ml-4">{line.replace('- ', '')}</li>;
                        if (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') || line.startsWith('4.')) return <li key={i} className="text-gray-600 ml-4 list-decimal">{line.replace(/^\d+\.\s*/, '')}</li>;
                        if (line.startsWith('⚠️') || line.startsWith('🚨') || line.startsWith('⏰') || line.startsWith('📅')) return <p key={i} className="text-gray-700 my-1 font-medium">{line}</p>;
                        return <p key={i} className="text-gray-600 my-0.5">{line}</p>;
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                    <Lightbulb className="w-12 h-12" />
                    <p className="text-sm font-medium">Click "Run AI Analysis" to generate intelligence insights</p>
                    <p className="text-xs">The AI will analyze action patterns, detect anomalies, and provide security recommendations</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Stats for AI tab */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Total Analyzed</p>
              <p className="text-xl font-bold">{analytics.totalLogs}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Platform Events</p>
              <p className="text-xl font-bold">{analytics.platformLogs}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">AI Executions</p>
              <p className="text-xl font-bold">{analytics.aiLogs}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Unique Actions</p>
              <p className="text-xl font-bold">{Object.keys(analytics.actionDistribution).length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Last updated */}
      <div className="text-center">
        <p className="text-[10px] text-gray-400">
          Last updated: {new Date().toLocaleTimeString()}
          {connected && ' • Connected via WebSocket'}
        </p>
      </div>
    </div>
  );
}

// Helper for Circle X icon
function XCircle({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}