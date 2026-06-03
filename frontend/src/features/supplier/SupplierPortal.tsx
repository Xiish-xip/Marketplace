import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  BarChart3,
  Box,
  CheckCircle2,
  DollarSign,
  FileText,
  MessageSquare,
  Package,
  Settings,
  Truck,
  Upload,
  XCircle,
} from 'lucide-react';
import { SkeletonPage } from '../../components/Skeleton';
import { get, post, put } from '../../lib/api-enhanced';

type Tab = 'dashboard' | 'catalog' | 'orders' | 'shipping' | 'payouts' | 'analytics' | 'messages' | 'settings';

const tabs: Array<{ key: Tab; label: string; icon: ReactNode }> = [
  { key: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-4 w-4" /> },
  { key: 'catalog', label: 'Catalog', icon: <Package className="h-4 w-4" /> },
  { key: 'orders', label: 'Orders', icon: <Box className="h-4 w-4" /> },
  { key: 'shipping', label: 'Shipping', icon: <Truck className="h-4 w-4" /> },
  { key: 'payouts', label: 'Payouts', icon: <DollarSign className="h-4 w-4" /> },
  { key: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
  { key: 'messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" /> },
  { key: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
];

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function Status({ value }: { value?: string }) {
  return <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700">{String(value || 'PENDING').toUpperCase()}</span>;
}

export default function SupplierPortal() {
  const [active, setActive] = useState<Tab>('dashboard');

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-gradient-to-r from-slate-800 to-teal-700 p-5 text-white">
        <h1 className="text-2xl font-bold">Supplier Portal</h1>
        <p className="mt-1 text-sm text-teal-100">Orders, catalog, shipping, payouts, and performance in one workspace.</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium ${
              active === tab.key ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-transparent text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'dashboard' && <Dashboard />}
      {active === 'catalog' && <Catalog />}
      {active === 'orders' && <Orders shippingOnly={false} />}
      {active === 'shipping' && <Orders shippingOnly />}
      {active === 'payouts' && <Payouts />}
      {active === 'analytics' && <Analytics />}
      {active === 'messages' && <Messages />}
      {active === 'settings' && <PortalSettings />}
    </div>
  );
}

function Dashboard() {
  const query = useQuery({ queryKey: ['supplier-portal-dashboard'], queryFn: () => get<any>('/supplier-portal/dashboard') });
  const data = query.data?.data;
  if (query.isLoading) return <SkeletonPage cards={4} columns={2} className="min-h-[420px]" />;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Revenue" value={data?.stats?.revenue || 0} />
        <Metric label="Orders" value={data?.stats?.orders || 0} />
        <Metric label="Products" value={data?.stats?.activeProducts || 0} />
        <Metric label="Score" value={data?.stats?.performanceScore || 0} />
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 font-semibold text-gray-900">Recent Orders</h3>
        <OrderTable orders={data?.recentOrders || []} />
      </div>
    </div>
  );
}

function Catalog() {
  const qc = useQueryClient();
  const [sku, setSku] = useState('');
  const [title, setTitle] = useState('');
  const [quantity, setQuantity] = useState(0);
  const query = useQuery({ queryKey: ['supplier-portal-products'], queryFn: () => get<any>('/supplier-portal/products') });
  const products = query.data?.data || [];
  const create = useMutation({
    mutationFn: () => post('/supplier-portal/products', { supplierSku: sku, supplierTitle: title, supplierPrice: 0, costPrice: 0, sellingPrice: 0, quantity }),
    onSuccess: () => {
      toast.success('Product saved');
      setSku('');
      setTitle('');
      setQuantity(0);
      qc.invalidateQueries({ queryKey: ['supplier-portal-products'] });
    },
  });
  const bulk = useMutation({
    mutationFn: () => post('/supplier-portal/products/bulk-upload', { rows: [] }),
    onSuccess: () => toast.success('Bulk job accepted'),
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_2fr]">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 font-semibold text-gray-900">Catalog Item</h3>
        <div className="space-y-3">
          <input value={sku} onChange={(event) => setSku(event.target.value)} placeholder="SKU" className="input-field" />
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" className="input-field" />
          <input type="number" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="input-field" />
          <button type="button" onClick={() => create.mutate()} disabled={!sku || !title} className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-50">
            <CheckCircle2 className="h-4 w-4" /> Save
          </button>
          <button type="button" onClick={() => bulk.mutate()} className="ml-2 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Upload className="h-4 w-4" /> Bulk upload
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">SKU</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Product</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Stock</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((product: any) => (
              <tr key={product.id}>
                <td className="px-3 py-2 font-mono text-xs">{product.supplierSku}</td>
                <td className="px-3 py-2">{product.supplierTitle}</td>
                <td className="px-3 py-2 text-right">{product.quantity}</td>
                <td className="px-3 py-2 text-right">{product.sellingPrice}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Orders({ shippingOnly }: { shippingOnly: boolean }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['supplier-portal-orders'], queryFn: () => get<any>('/supplier-portal/orders') });
  const accept = useMutation({ mutationFn: (id: string) => post(`/supplier-portal/orders/${id}/accept`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ['supplier-portal-orders'] }) });
  const reject = useMutation({ mutationFn: (id: string) => post(`/supplier-portal/orders/${id}/reject`, { reason: 'Rejected by supplier' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['supplier-portal-orders'] }) });
  const ship = useMutation({ mutationFn: (id: string) => post(`/supplier-portal/orders/${id}/ship`, { carrierCode: 'DHL', trackingNumber: `SUP${Date.now()}` }), onSuccess: () => qc.invalidateQueries({ queryKey: ['supplier-portal-orders'] }) });
  const label = useMutation({ mutationFn: (id: string) => post(`/supplier-portal/orders/${id}/label`, { carrierCode: 'DHL' }), onSuccess: () => toast.success('Label generated') });
  const orders = query.data?.data || [];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 font-semibold text-gray-900">{shippingOnly ? 'Shipping Portal' : 'Order Processing'}</h3>
      <OrderTable orders={orders} actions={(order) => (
        <div className="flex justify-end gap-2">
          {!shippingOnly && (
            <>
              <button type="button" onClick={() => accept.mutate(order.id)} className="rounded-lg border border-green-200 p-1.5 text-green-600 hover:bg-green-50" title="Accept"><CheckCircle2 className="h-4 w-4" /></button>
              <button type="button" onClick={() => reject.mutate(order.id)} className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50" title="Reject"><XCircle className="h-4 w-4" /></button>
            </>
          )}
          <button type="button" onClick={() => ship.mutate(order.id)} className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50" title="Ship"><Truck className="h-4 w-4" /></button>
          <button type="button" onClick={() => label.mutate(order.id)} className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50" title="Label"><FileText className="h-4 w-4" /></button>
        </div>
      )} />
    </div>
  );
}

function OrderTable({ orders, actions }: { orders: any[]; actions?: (order: any) => ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-500">Supplier Order</th>
            <th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500">Total</th>
            {actions && <th className="px-3 py-2 text-right font-medium text-gray-500">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="px-3 py-2 font-mono text-xs">{order.supplierOrderId}</td>
              <td className="px-3 py-2"><Status value={order.status} /></td>
              <td className="px-3 py-2 text-right font-mono">{order.currency} {order.totalCost}</td>
              {actions && <td className="px-3 py-2">{actions(order)}</td>}
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td colSpan={actions ? 4 : 3} className="px-3 py-8 text-center text-sm text-gray-500">No orders</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Payouts() {
  const query = useQuery({ queryKey: ['supplier-portal-payouts'], queryFn: () => get<any>('/supplier-portal/payouts') });
  const payouts = query.data?.data?.payouts || [];
  const invoices = query.data?.data?.invoices || [];
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 font-semibold text-gray-900">Earnings</h3>
        {payouts.map((payout: any) => <div key={payout.id} className="flex justify-between border-b border-gray-100 py-2 text-sm"><Status value={payout.status} /><span>{payout.currency} {payout.netAmount}</span></div>)}
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 font-semibold text-gray-900">Invoices</h3>
        {invoices.map((invoice: any) => <div key={invoice.id} className="flex justify-between border-b border-gray-100 py-2 text-sm"><span>{invoice.invoiceNumber}</span><span>{invoice.totalAmount}</span></div>)}
      </div>
    </div>
  );
}

function Analytics() {
  const query = useQuery({ queryKey: ['supplier-portal-analytics'], queryFn: () => get<any>('/supplier-portal/analytics') });
  const data = query.data?.data;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Metric label="Score" value={data?.scorecard?.overallScore || 0} />
      <Metric label="Tier" value={data?.scorecard?.tier || '-'} />
      <Metric label="Profit" value={data?.profit?.netProfit || 0} />
    </div>
  );
}

function Messages() {
  const query = useQuery({ queryKey: ['supplier-portal-messages'], queryFn: () => get<any>('/supplier-portal/messages') });
  const messages = query.data?.data || [];
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 font-semibold text-gray-900">Messages</h3>
      {messages.map((conversation: any) => <div key={conversation.id} className="border-b border-gray-100 py-2 text-sm">{conversation.lastMessage || 'Conversation'}</div>)}
      {messages.length === 0 && <p className="py-8 text-center text-sm text-gray-500">No conversations</p>}
    </div>
  );
}

function PortalSettings() {
  const qc = useQueryClient();
  const [currency, setCurrency] = useState('USD');
  const query = useQuery({ queryKey: ['supplier-portal-settings'], queryFn: () => get<any>('/supplier-portal/settings') });
  const save = useMutation({ mutationFn: () => put('/supplier-portal/settings', { currency }), onSuccess: () => { toast.success('Settings saved'); qc.invalidateQueries({ queryKey: ['supplier-portal-settings'] }); } });
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 font-semibold text-gray-900">Supplier Settings</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} className="input-field" />
        <button type="button" onClick={() => save.mutate()} className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600">Save</button>
      </div>
      <pre className="mt-4 max-h-72 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-600">{JSON.stringify(query.data?.data?.supplier || {}, null, 2)}</pre>
    </div>
  );
}
