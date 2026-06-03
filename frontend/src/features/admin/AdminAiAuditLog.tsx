import { useQuery } from '@tanstack/react-query';
import { get } from '../../lib/api-enhanced';
import { useState } from 'react';
import { Search, Terminal, AlertTriangle, CheckCircle, XCircle, Loader2, ChevronDown } from 'lucide-react';

export default function AdminAiAuditLog() {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'ai-audit-logs', riskFilter, statusFilter, search, page],
    queryFn: () => get('/ai-tools/audit-logs', { riskLevel: riskFilter || undefined, status: statusFilter || undefined, search: search || undefined, page, limit: 25 }),
  });

  const logs = data?.data?.data || [];
  const pagination = data?.data?.pagination;

  const riskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'executed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'denied': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default: return <Loader2 className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Audit Log</h1>
        <p className="text-sm text-gray-500">Track all AI tool executions, approvals, and errors</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search tool name or user..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <select value={riskFilter} onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All Risk Levels</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All Status</option>
          <option value="executed">Executed</option>
          <option value="denied">Denied</option>
          <option value="error">Error</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tool</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Risk</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Arguments</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No audit logs found</td></tr>
              ) : logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-800">{log.toolName}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{log.userId ? log.userId.slice(0, 8) + '...' : 'System'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${riskColor(log.riskLevel)}`}>{log.riskLevel}</span></td>
                  <td className="px-4 py-3 text-center">{statusIcon(log.status)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{log.arguments || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{log.result?.slice(0, 100) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50">Prev</button>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}