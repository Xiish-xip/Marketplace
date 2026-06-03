import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Calculator,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  GitBranch,
  Loader2,
  PackageCheck,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Send,
  Settings,
  ShieldAlert,
  Truck,
  Warehouse,
  Zap,
} from 'lucide-react';
import { del, get, post } from '../../lib/api-enhanced';
import { useSocket } from '../../lib/socket';

type WorkspaceTab = 'fulfillment' | 'inventory' | 'pricing' | 'shipping' | 'returns' | 'finance' | 'analytics' | 'automation';

type Props = {
  tone?: 'admin' | 'seller';
  scope?: 'admin' | 'seller';
};

const tabConfig: Array<{ key: WorkspaceTab; label: string; icon: ReactNode; adminOnly?: boolean }> = [
  { key: 'fulfillment', label: 'Fulfillment', icon: <PackageCheck className="h-4 w-4" /> },
  { key: 'inventory', label: 'Inventory', icon: <Warehouse className="h-4 w-4" /> },
  { key: 'pricing', label: 'Pricing', icon: <Calculator className="h-4 w-4" /> },
  { key: 'shipping', label: 'Shipping', icon: <Truck className="h-4 w-4" /> },
  { key: 'returns', label: 'Returns', icon: <RotateCcw className="h-4 w-4" /> },
  { key: 'finance', label: 'Finance', icon: <DollarSign className="h-4 w-4" />, adminOnly: true },
  { key: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
  { key: 'automation', label: 'Automation', icon: <GitBranch className="h-4 w-4" />, adminOnly: true },
];

function toneClasses(tone: 'admin' | 'seller') {
  return tone === 'seller'
    ? { active: 'border-teal-500 bg-teal-50 text-teal-700', button: 'bg-teal-500 hover:bg-teal-600', text: 'text-teal-600' }
    : { active: 'border-indigo-500 bg-indigo-50 text-indigo-700', button: 'bg-indigo-500 hover:bg-indigo-600', text: 'text-indigo-600' };
}

function StatusPill({ value }: { value?: string }) {
  const status = String(value || 'UNKNOWN').toUpperCase();
  const colors: Record<string, string> = {
    COMPLETED: 'border-green-200 bg-green-50 text-green-700',
    ACTIVE: 'border-green-200 bg-green-50 text-green-700',
    DELIVERED: 'border-green-200 bg-green-50 text-green-700',
    SUPPLIER_ACCEPTED: 'border-blue-200 bg-blue-50 text-blue-700',
    PROCESSING: 'border-blue-200 bg-blue-50 text-blue-700',
    SHIPPED: 'border-purple-200 bg-purple-50 text-purple-700',
    RUNNING: 'border-blue-200 bg-blue-50 text-blue-700',
    PENDING: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    PREORDER: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    ON_HOLD: 'border-orange-200 bg-orange-50 text-orange-700',
    FAILED: 'border-red-200 bg-red-50 text-red-700',
    REJECTED: 'border-red-200 bg-red-50 text-red-700',
  };
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${colors[status] || 'border-gray-200 bg-gray-50 text-gray-600'}`}>{status}</span>;
}

function Card({ title, icon, children, action }: { title: string; icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-8 text-center text-sm text-gray-500">{label}</td>
    </tr>
  );
}

export default function DropshipOperationsWorkspace({ tone = 'admin', scope = 'admin' }: Props) {
  const [active, setActive] = useState<WorkspaceTab>('fulfillment');
  const qc = useQueryClient();
  const colors = toneClasses(tone);
  const visibleTabs = useMemo(() => tabConfig.filter((tab) => !tab.adminOnly || scope === 'admin'), [scope]);
  const { on } = useSocket();

  useEffect(() => {
    const cleanupFulfillment = on('dropship:fulfillment-updated', () => {
      qc.invalidateQueries({ queryKey: ['dropship-fulfillment-queue'] });
    });
    const cleanupInventory = on('dropship:inventory-updated', () => {
      qc.invalidateQueries({ queryKey: ['dropship-sync-alerts'] });
    });
    return () => {
      cleanupFulfillment?.();
      cleanupInventory?.();
    };
  }, [on, qc]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium ${
              active === tab.key ? colors.active : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'fulfillment' && <FulfillmentPanel colors={colors} />}
      {active === 'inventory' && <InventoryPanel colors={colors} />}
      {active === 'pricing' && <PricingPanel colors={colors} />}
      {active === 'shipping' && <ShippingPanel colors={colors} />}
      {active === 'returns' && <ReturnsPanel colors={colors} />}
      {active === 'finance' && scope === 'admin' && <FinancePanel colors={colors} />}
      {active === 'analytics' && <AnalyticsPanel colors={colors} scope={scope} />}
      {active === 'automation' && scope === 'admin' && <AutomationPanel colors={colors} />}
    </div>
  );
}

function FulfillmentPanel({ colors }: { colors: ReturnType<typeof toneClasses> }) {
  const qc = useQueryClient();
  const [orderId, setOrderId] = useState('');
  const [batchIds, setBatchIds] = useState('');
  const queueQuery = useQuery({
    queryKey: ['dropship-fulfillment-queue'],
    queryFn: () => get<any>('/dropship/fulfillment/queue'),
    refetchInterval: 30000,
  });
  const queue = queueQuery.data?.data?.fulfillments || [];

  const autoRoute = useMutation({
    mutationFn: () => post(`/dropship/fulfillment/auto-route/${orderId}`, { force: true }),
    onSuccess: () => {
      toast.success('Order routed');
      setOrderId('');
      qc.invalidateQueries({ queryKey: ['dropship-fulfillment-queue'] });
    },
  });
  const batch = useMutation({
    mutationFn: () => post('/dropship/fulfillment/batch-process', { orderIds: batchIds.split('\n').map((item) => item.trim()).filter(Boolean), options: { force: true } }),
    onSuccess: () => {
      toast.success('Batch submitted');
      setBatchIds('');
      qc.invalidateQueries({ queryKey: ['dropship-fulfillment-queue'] });
    },
  });
  const hold = useMutation({
    mutationFn: (id: string) => post(`/dropship/fulfillment/${id}/hold`, { reason: 'Manual review' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dropship-fulfillment-queue'] }),
  });
  const release = useMutation({
    mutationFn: (id: string) => post(`/dropship/fulfillment/${id}/release`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dropship-fulfillment-queue'] }),
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
      <Card title="Fulfillment Queue" icon={<PackageCheck className={colors.text} />}>
        {queueQuery.isLoading ? <Loader2 className={`h-6 w-6 animate-spin ${colors.text}`} /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Order</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Items</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Tracking</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {queue.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 font-mono text-xs">{item.orderId?.slice(0, 12) || '-'}</td>
                    <td className="px-3 py-2"><StatusPill value={item.status} /></td>
                    <td className="px-3 py-2 text-gray-600">{item.items?.length || 0}</td>
                    <td className="px-3 py-2 text-gray-600">{item.trackingNumber || '-'}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => hold.mutate(item.id)} className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50" title="Hold">
                          <PauseCircle className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => release.mutate(item.id)} className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50" title="Release">
                          <PlayCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {queue.length === 0 && <EmptyRow colSpan={5} label="No fulfillment items" />}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="space-y-4">
        <Card title="Route Order" icon={<Send className={colors.text} />}>
          <div className="space-y-3">
            <input value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="Order ID" className="input-field" />
            <button type="button" onClick={() => autoRoute.mutate()} disabled={!orderId || autoRoute.isPending} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${colors.button}`}>
              {autoRoute.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Auto-route
            </button>
          </div>
        </Card>
        <Card title="Batch Processing" icon={<Boxes className={colors.text} />}>
          <div className="space-y-3">
            <textarea value={batchIds} onChange={(event) => setBatchIds(event.target.value)} placeholder="One order ID per line" className="input-field min-h-[120px]" />
            <button type="button" onClick={() => batch.mutate()} disabled={!batchIds.trim() || batch.isPending} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${colors.button}`}>
              {batch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Process batch
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function InventoryPanel({ colors }: { colors: ReturnType<typeof toneClasses> }) {
  const qc = useQueryClient();
  const [connectionId, setConnectionId] = useState('');
  const [mappingIds, setMappingIds] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const jobsQuery = useQuery({ queryKey: ['dropship-sync-jobs'], queryFn: () => get<any>('/dropship/sync/jobs'), refetchInterval: 30000 });
  const alertsQuery = useQuery({ queryKey: ['dropship-sync-alerts'], queryFn: () => get<any>('/dropship/sync/alerts', { openOnly: true }) });
  const healthQuery = useQuery({ queryKey: ['dropship-health', supplierId], queryFn: () => get<any>(`/dropship/inventory/health/${supplierId}`), enabled: Boolean(supplierId) });
  const jobs = jobsQuery.data?.data?.jobs || [];
  const alerts = alertsQuery.data?.data?.alerts || [];

  const forceConnection = useMutation({
    mutationFn: () => post(`/dropship/sync/connections/${connectionId}`, { type: 'FULL' }),
    onSuccess: () => {
      toast.success('Connection sync started');
      qc.invalidateQueries({ queryKey: ['dropship-sync-jobs'] });
    },
  });
  const forceProducts = useMutation({
    mutationFn: () => post('/dropship/sync/products', { mappingIds: mappingIds.split(',').map((item) => item.trim()).filter(Boolean) }),
    onSuccess: () => {
      toast.success('Products synced');
      qc.invalidateQueries({ queryKey: ['dropship-sync-jobs'] });
      qc.invalidateQueries({ queryKey: ['dropship-sync-alerts'] });
    },
  });
  const schedule = useMutation({ mutationFn: (intervalMinutes: number) => post('/dropship/sync/start', { intervalMinutes, type: 'INVENTORY' }), onSuccess: () => toast.success('Schedule started') });
  const stop = useMutation({ mutationFn: () => post('/dropship/sync/stop', { key: 'all' }), onSuccess: () => toast.success('Schedule stopped') });

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card title="Sync Controls" icon={<RefreshCw className={colors.text} />}>
        <div className="space-y-3">
          <input value={connectionId} onChange={(event) => setConnectionId(event.target.value)} placeholder="Connection ID" className="input-field" />
          <button type="button" onClick={() => forceConnection.mutate()} disabled={!connectionId || forceConnection.isPending} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${colors.button}`}>
            <RefreshCw className="h-4 w-4" /> Force sync
          </button>
          <input value={mappingIds} onChange={(event) => setMappingIds(event.target.value)} placeholder="Mapping IDs, comma separated" className="input-field" />
          <button type="button" onClick={() => forceProducts.mutate()} disabled={!mappingIds || forceProducts.isPending} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Sync products</button>
          <div className="flex flex-wrap gap-2">
            {[15, 30, 60].map((minutes) => (
              <button key={minutes} type="button" onClick={() => schedule.mutate(minutes)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">{minutes}m</button>
            ))}
            <button type="button" onClick={() => stop.mutate()} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">Stop</button>
          </div>
        </div>
      </Card>

      <Card title="Inventory Alerts" icon={<AlertTriangle className="text-yellow-500" />}>
        <div className="space-y-2">
          {alerts.slice(0, 8).map((alert: any) => (
            <div key={alert.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-2 text-sm">
              <span className="font-medium text-gray-700">{alert.type}</span>
              <span className="font-mono text-xs text-gray-500">{alert.mappingId.slice(0, 10)}</span>
            </div>
          ))}
          {alerts.length === 0 && <p className="py-6 text-center text-sm text-gray-500">No open alerts</p>}
        </div>
      </Card>

      <Card title="Supplier Health" icon={<ShieldAlert className={colors.text} />}>
        <div className="space-y-3">
          <input value={supplierId} onChange={(event) => setSupplierId(event.target.value)} placeholder="Supplier ID" className="input-field" />
          {healthQuery.data?.data && (
            <div className="grid gap-3">
              <Metric label="Health" value={`${healthQuery.data.data.healthScore}%`} sub={healthQuery.data.data.status} />
              <Metric label="Availability" value={`${healthQuery.data.data.stockAvailability}%`} sub={`${healthQuery.data.data.outOfStockAlerts} stock alerts`} />
            </div>
          )}
        </div>
      </Card>

      <Card title="Sync Jobs" icon={<Clock className={colors.text} />}>
        <div className="overflow-x-auto xl:col-span-3">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <tbody className="divide-y divide-gray-200">
              {jobs.slice(0, 10).map((job: any) => (
                <tr key={job.id}>
                  <td className="px-3 py-2"><StatusPill value={job.status} /></td>
                  <td className="px-3 py-2 text-gray-600">{job.type}</td>
                  <td className="px-3 py-2 text-gray-600">{job.syncedItems}/{job.totalItems}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{new Date(job.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {jobs.length === 0 && <EmptyRow colSpan={4} label="No sync jobs" />}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function PricingPanel({ colors }: { colors: ReturnType<typeof toneClasses> }) {
  const qc = useQueryClient();
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState('FIXED_MARGIN');
  const [value, setValue] = useState(30);
  const [mappingId, setMappingId] = useState('');
  const rulesQuery = useQuery({ queryKey: ['dropship-pricing-rules'], queryFn: () => get<any>('/dropship/pricing-rules') });
  const marginQuery = useQuery({ queryKey: ['dropship-margin-report'], queryFn: () => get<any>('/dropship/pricing/margin-report') });
  const previewQuery = useQuery({ queryKey: ['dropship-price-preview', mappingId], queryFn: () => get<any>(`/dropship/pricing-rules/evaluate/${mappingId}`), enabled: Boolean(mappingId) });
  const rules = rulesQuery.data?.data?.rules || [];
  const margins = marginQuery.data?.data?.products || [];

  const createRule = useMutation({
    mutationFn: () => post('/dropship/pricing-rules', { name: ruleName, ruleType, value, priority: rules.length + 1, appliesTo: 'ALL' }),
    onSuccess: () => {
      toast.success('Rule created');
      setRuleName('');
      qc.invalidateQueries({ queryKey: ['dropship-pricing-rules'] });
    },
  });
  const recalc = useMutation({ mutationFn: () => post('/dropship/pricing-rules/recalculate', {}), onSuccess: () => toast.success('Prices recalculated') });

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
      <Card title="Pricing Rules" icon={<Calculator className={colors.text} />} action={<button type="button" onClick={() => recalc.mutate()} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Recalculate</button>}>
        <div className="mb-4 grid gap-2 sm:grid-cols-4">
          <input value={ruleName} onChange={(event) => setRuleName(event.target.value)} placeholder="Rule name" className="input-field sm:col-span-2" />
          <select value={ruleType} onChange={(event) => setRuleType(event.target.value)} className="select-field">
            <option value="FIXED_MARGIN">Margin %</option>
            <option value="FIXED_MARKUP">Markup</option>
            <option value="MIN_PRICE">Min price</option>
            <option value="MAX_PRICE">Max price</option>
            <option value="COMPETITOR_MATCH">Competitor</option>
          </select>
          <input type="number" value={value} onChange={(event) => setValue(Number(event.target.value))} className="input-field" />
          <button type="button" onClick={() => createRule.mutate()} disabled={!ruleName} className={`sm:col-span-4 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${colors.button}`}>Create rule</button>
        </div>
        <div className="space-y-2">
          {rules.slice(0, 8).map((rule: any) => (
            <div key={rule.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                <p className="text-xs text-gray-500">{rule.ruleType} · {rule.value}</p>
              </div>
              <StatusPill value={rule.isActive ? 'ACTIVE' : 'INACTIVE'} />
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        <Card title="Price Preview" icon={<CheckCircle2 className={colors.text} />}>
          <input value={mappingId} onChange={(event) => setMappingId(event.target.value)} placeholder="Mapping ID" className="input-field" />
          {previewQuery.data?.data && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Metric label="Old" value={previewQuery.data.data.oldPrice?.toFixed?.(2) || '-'} />
              <Metric label="New" value={previewQuery.data.data.newPrice?.toFixed?.(2) || '-'} />
              <Metric label="Margin" value={`${previewQuery.data.data.margin}%`} />
            </div>
          )}
        </Card>
        <Card title="Margin Report" icon={<BarChart3 className={colors.text} />}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <tbody className="divide-y divide-gray-200">
                {margins.slice(0, 6).map((item: any) => (
                  <tr key={item.mappingId}>
                    <td className="px-3 py-2 text-gray-900">{item.title}</td>
                    <td className="px-3 py-2 text-right font-mono">{item.margin}%</td>
                    <td className="px-3 py-2 text-right font-mono">{item.grossProfit}</td>
                  </tr>
                ))}
                {margins.length === 0 && <EmptyRow colSpan={3} label="No margin data" />}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ShippingPanel({ colors }: { colors: ReturnType<typeof toneClasses> }) {
  const qc = useQueryClient();
  const [zoneName, setZoneName] = useState('');
  const [countries, setCountries] = useState('US,CA');
  const [destination, setDestination] = useState('US');
  const [dropshipOrderId, setDropshipOrderId] = useState('');
  const zonesQuery = useQuery({ queryKey: ['dropship-shipping-zones'], queryFn: () => get<any>('/dropship/shipping-zones') });
  const rates = useMutation({ mutationFn: () => post<any>('/dropship/shipping/rates', { destination: { country: destination }, weightKg: 1, value: 100, subtotal: 100 }) });
  const createZone = useMutation({
    mutationFn: () => post('/dropship/shipping-zones', { name: zoneName, countries: countries.split(',').map((item) => item.trim()), baseRate: 6, perKgRate: 2, estimatedMinDays: 5, estimatedMaxDays: 10, carriers: ['DHL', 'FedEx', 'UPS'] }),
    onSuccess: () => {
      toast.success('Zone created');
      setZoneName('');
      qc.invalidateQueries({ queryKey: ['dropship-shipping-zones'] });
    },
  });
  const label = useMutation({ mutationFn: () => post('/dropship/shipping/label', { dropshipOrderId }), onSuccess: () => toast.success('Label generated') });
  const zones = zonesQuery.data?.data?.zones || [];

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card title="Shipping Zones" icon={<Truck className={colors.text} />}>
        <div className="mb-3 grid gap-2">
          <input value={zoneName} onChange={(event) => setZoneName(event.target.value)} placeholder="Zone name" className="input-field" />
          <input value={countries} onChange={(event) => setCountries(event.target.value)} placeholder="Countries" className="input-field" />
          <button type="button" onClick={() => createZone.mutate()} disabled={!zoneName} className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${colors.button}`}>Create zone</button>
        </div>
        <div className="space-y-2">
          {zones.slice(0, 6).map((zone: any) => (
            <div key={zone.id} className="rounded-lg border border-gray-200 p-2">
              <p className="text-sm font-medium text-gray-900">{zone.name}</p>
              <p className="text-xs text-gray-500">{zone.countries?.join?.(', ')} · {zone.estimatedMinDays}-{zone.estimatedMaxDays} days</p>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Live Rates" icon={<Calculator className={colors.text} />}>
        <div className="space-y-3">
          <input value={destination} onChange={(event) => setDestination(event.target.value.toUpperCase())} placeholder="Country code" className="input-field" />
          <button type="button" onClick={() => rates.mutate()} className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${colors.button}`}>Calculate</button>
          {(rates.data?.data?.options || []).map((option: any) => (
            <div key={option.serviceName} className="flex items-center justify-between rounded-lg border border-gray-200 p-2 text-sm">
              <span>{option.serviceName}</span>
              <span className="font-mono">{option.currency} {option.cost}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Labels & Customs" icon={<FileText className={colors.text} />}>
        <div className="space-y-3">
          <input value={dropshipOrderId} onChange={(event) => setDropshipOrderId(event.target.value)} placeholder="Dropship order ID" className="input-field" />
          <button type="button" onClick={() => label.mutate()} disabled={!dropshipOrderId} className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${colors.button}`}>Generate label</button>
          {label.data?.data && <p className="rounded-lg bg-gray-50 p-2 text-xs text-gray-600">{label.data.data.trackingNumber}</p>}
        </div>
      </Card>
    </div>
  );
}

function ReturnsPanel({ colors }: { colors: ReturnType<typeof toneClasses> }) {
  const returnsQuery = useQuery({ queryKey: ['dropship-returns'], queryFn: () => get<any>('/dropship/returns') });
  const analyticsQuery = useQuery({ queryKey: ['dropship-returns-analytics'], queryFn: () => get<any>('/dropship/returns/analytics') });
  const returns = returnsQuery.data?.data?.returns || [];
  const analytics = analyticsQuery.data?.data;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_2fr]">
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
        <Metric label="Returns" value={analytics?.totalReturns || 0} sub={`${analytics?.returnRate || 0}% rate`} />
        <Metric label="Refund cost" value={analytics?.refundCost || 0} />
        <Metric label="Fraud flags" value={analytics?.fraudFlags || 0} />
      </div>
      <Card title="Return Queue" icon={<RotateCcw className={colors.text} />}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Order</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Reason</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">Refund</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {returns.map((item: any) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 font-mono text-xs">{item.orderId.slice(0, 12)}</td>
                  <td className="px-3 py-2">{item.reason}</td>
                  <td className="px-3 py-2"><StatusPill value={item.status} /></td>
                  <td className="px-3 py-2 text-right font-mono">{item.refundAmount || '-'}</td>
                </tr>
              ))}
              {returns.length === 0 && <EmptyRow colSpan={4} label="No dropship returns" />}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function FinancePanel({ colors }: { colors: ReturnType<typeof toneClasses> }) {
  const dashboardQuery = useQuery({ queryKey: ['dropship-finance-dashboard'], queryFn: () => get<any>('/dropship/finance/dashboard') });
  const payoutsQuery = useQuery({ queryKey: ['dropship-payouts'], queryFn: () => get<any>('/dropship/finance/payouts') });
  const process = useMutation({ mutationFn: () => post('/dropship/finance/payouts/process', {}), onSuccess: () => toast.success('Payouts processed') });
  const totals = dashboardQuery.data?.data?.totals;
  const payouts = payoutsQuery.data?.data?.payouts || [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Commission" value={totals?.totalCommission || 0} />
        <Metric label="Escrow held" value={totals?.heldEscrow || 0} />
        <Metric label="Pending payouts" value={totals?.pendingPayouts || 0} />
        <Metric label="Receivables" value={totals?.invoiceReceivable || 0} />
      </div>
      <Card title="Payouts" icon={<DollarSign className={colors.text} />} action={<button type="button" onClick={() => process.mutate()} className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white ${colors.button}`}>Process</button>}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <tbody className="divide-y divide-gray-200">
              {payouts.slice(0, 10).map((payout: any) => (
                <tr key={payout.id}>
                  <td className="px-3 py-2 font-mono text-xs">{payout.supplierId.slice(0, 10)}</td>
                  <td className="px-3 py-2"><StatusPill value={payout.status} /></td>
                  <td className="px-3 py-2 text-right font-mono">{payout.currency} {payout.netAmount}</td>
                </tr>
              ))}
              {payouts.length === 0 && <EmptyRow colSpan={3} label="No payouts" />}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AnalyticsPanel({ colors, scope }: { colors: ReturnType<typeof toneClasses>; scope: 'admin' | 'seller' }) {
  const dashboardQuery = useQuery({ queryKey: ['dropship-analytics-dashboard'], queryFn: () => get<any>('/dropship/analytics/dashboard'), enabled: scope === 'admin' });
  const productsQuery = useQuery({ queryKey: ['dropship-analytics-products'], queryFn: () => get<any>('/dropship/analytics/products') });
  const forecastQuery = useQuery({ queryKey: ['dropship-forecast'], queryFn: () => get<any>('/dropship/analytics/inventory-forecast') });
  const dashboard = dashboardQuery.data?.data;
  const products = productsQuery.data?.data?.products || [];
  const forecasts = forecastQuery.data?.data?.forecasts || [];

  return (
    <div className="space-y-4">
      {scope === 'admin' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Today" value={dashboard?.revenue?.today || 0} />
          <Metric label="Week" value={dashboard?.revenue?.week || 0} />
          <Metric label="Suppliers" value={dashboard?.activeSuppliers || 0} />
          <Metric label="Products" value={dashboard?.activeProducts || 0} />
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Product Profitability" icon={<BarChart3 className={colors.text} />}>
          <div className="space-y-2">
            {products.slice(0, 8).map((product: any) => (
              <div key={product.mappingId} className="flex items-center justify-between rounded-lg border border-gray-200 p-2 text-sm">
                <span className="truncate text-gray-800">{product.title}</span>
                <span className="font-mono">{product.margin}%</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Inventory Forecast" icon={<Warehouse className={colors.text} />}>
          <div className="space-y-2">
            {forecasts.slice(0, 8).map((forecast: any) => (
              <div key={forecast.mappingId} className="grid grid-cols-3 gap-2 rounded-lg border border-gray-200 p-2 text-sm">
                <span className="col-span-2 truncate text-gray-800">{forecast.title}</span>
                <span className="text-right font-mono">{forecast.reorderPoint}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function AutomationPanel({ colors }: { colors: ReturnType<typeof toneClasses> }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [strategy, setStrategy] = useState('LOWEST_PRICE');
  const automationsQuery = useQuery({ queryKey: ['dropship-automation-rules'], queryFn: () => get<any>('/dropship/automation-rules') });
  const routingQuery = useQuery({ queryKey: ['dropship-routing-rules'], queryFn: () => get<any>('/dropship/routing-rules') });
  const createAutomation = useMutation({
    mutationFn: () => post('/dropship/automation-rules', { name, trigger: 'PAYMENT_CAPTURED', triggerConfig: {}, actions: [{ type: 'AUTO_ROUTE_ORDER' }] }),
    onSuccess: () => {
      toast.success('Automation created');
      setName('');
      qc.invalidateQueries({ queryKey: ['dropship-automation-rules'] });
    },
  });
  const createRouting = useMutation({
    mutationFn: () => post('/dropship/routing-rules', { name: `${strategy} routing`, strategy, priority: 1 }),
    onSuccess: () => {
      toast.success('Routing rule created');
      qc.invalidateQueries({ queryKey: ['dropship-routing-rules'] });
    },
  });
  const removeAutomation = useMutation({ mutationFn: (id: string) => del(`/dropship/automation-rules/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['dropship-automation-rules'] }) });
  const automations = automationsQuery.data?.data?.automations || [];
  const routingRules = routingQuery.data?.data || [];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Workflow Automations" icon={<Zap className={colors.text} />}>
        <div className="mb-4 flex gap-2">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Automation name" className="input-field" />
          <button type="button" onClick={() => createAutomation.mutate()} disabled={!name} className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${colors.button}`}>Create</button>
        </div>
        <div className="space-y-2">
          {automations.slice(0, 8).map((automation: any) => (
            <div key={automation.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{automation.name}</p>
                <p className="text-xs text-gray-500">{automation.trigger}</p>
              </div>
              <button type="button" onClick={() => removeAutomation.mutate(automation.id)} className="text-xs font-medium text-red-600">Delete</button>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Smart Routing" icon={<GitBranch className={colors.text} />}>
        <div className="mb-4 flex gap-2">
          <select value={strategy} onChange={(event) => setStrategy(event.target.value)} className="select-field">
            <option value="LOWEST_PRICE">Lowest price</option>
            <option value="FASTEST_DELIVERY">Fastest delivery</option>
            <option value="BEST_RATING">Best rating</option>
            <option value="GEOGRAPHIC">Geographic</option>
            <option value="LOAD_BALANCE">Load balance</option>
          </select>
          <button type="button" onClick={() => createRouting.mutate()} className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${colors.button}`}>Add</button>
        </div>
        <div className="space-y-2">
          {routingRules.map((rule: any) => (
            <div key={rule.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-2 text-sm">
              <span>{rule.name}</span>
              <span className="font-mono text-xs text-gray-500">{rule.strategy}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
