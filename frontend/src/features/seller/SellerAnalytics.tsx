import React, { useState } from 'react';
import { DollarSign, ShoppingCart, TrendingUp, BarChart3, Package, Star, Users, AlertTriangle, Eye, EyeOff, ChevronDown, User, Clock, ArrowUp, ArrowDown, CreditCard } from 'lucide-react';
import { useSellerAnalytics } from '../../lib/query-hooks';
import { assetUrl } from '../../lib/assets';
import { SkeletonPage } from '../../components/Skeleton';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const periodOptions = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '1y', label: '1 Year' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: '#f59e0b',
  PAID: '#3b82f6',
  PROCESSING: '#8b5cf6',
  SHIPPED: '#06b6d4',
  DELIVERED: '#22c55e',
  CANCELLED: '#ef4444',
  REFUNDED: '#ec4899',
};

function StatCard({ icon, label, value, sublabel, trend, color }: { icon: React.ReactNode; label: string; value: string | number; sublabel?: string; trend?: { value: number; positive: boolean }; color: string }) {
  return (
    <div className="card p-4 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>{label}</p>
          <p className="mt-1 text-xl font-bold truncate" style={{ color: 'rgb(var(--color-text))' }}>{value}</p>
          {sublabel && <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>{sublabel}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.positive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              <span>{trend.value}% vs prev</span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function SellerAnalytics() {
  const [period, setPeriod] = useState('30d');
  const [showLowStock, setShowLowStock] = useState(true);
  const { data, isLoading } = useSellerAnalytics(period);
  const analytics = data?.data;

  if (isLoading) return <SkeletonPage cards={6} columns={3} />;

  const chartData = analytics?.salesByDate || [];
  const summary = analytics?.summary || {};
  const topProducts = analytics?.topProducts || [];
  const topCustomers = analytics?.topCustomers || [];
  const revenueByStatus = analytics?.revenueByStatus || {};
  const ordersByStatus = analytics?.ordersByStatus || {};
  const lowStockProducts = analytics?.lowStockProducts || [];
  const revenuePieData = Object.entries(revenueByStatus).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
  const ordersPieData = Object.entries(ordersByStatus).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Analytics & Insights</h2>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Track performance, products, and customer behavior</p>
        </div>
        <div className="flex gap-1 p-0.5 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
          {periodOptions.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
              style={{
                backgroundColor: period === p.value ? 'rgb(var(--color-primary-600))' : 'transparent',
                color: period === p.value ? 'white' : 'rgb(var(--color-text-muted))',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={<DollarSign className="w-5 h-5" />} label="Total Revenue" value={`${(summary.totalRevenue || 0).toLocaleString()} TZS`} sublabel={`${summary.totalOrders || 0} orders`} color="bg-green-500" />
        <StatCard icon={<ShoppingCart className="w-5 h-5" />} label="Avg Order Value" value={`${(summary.avgOrderValue || 0).toLocaleString()} TZS`} color="bg-blue-500" />
        <StatCard icon={<Package className="w-5 h-5" />} label="Products" value={summary.totalProducts || 0} sublabel={`${summary.avgRating || 0} ★ avg rating`} color="bg-purple-500" />
        <StatCard icon={<Users className="w-5 h-5" />} label="Unique Customers" value={summary.uniqueCustomers || 0} sublabel={`${summary.totalReviews || 0} reviews`} color="bg-indigo-500" />
        <StatCard icon={<Star className="w-5 h-5" />} label="Seller Rating" value={summary.sellerRating || 0} sublabel={`${summary.responseRate || 0}% response`} color="bg-amber-500" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-sm mb-4" style={{ color: 'rgb(var(--color-text))' }}>Revenue Over Time</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs><linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: any) => `${Number(value).toLocaleString()} TZS`} />
                <Area type="monotone" dataKey="revenue" stroke="#22c55e" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-[280px] flex items-center justify-center text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>No revenue data for this period</div>}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-sm mb-4" style={{ color: 'rgb(var(--color-text))' }}>Orders Over Time</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip formatter={(value: any) => `${Number(value)} orders`} />
                <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[280px] flex items-center justify-center text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>No order data for this period</div>}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-sm mb-4" style={{ color: 'rgb(var(--color-text))' }}>Revenue by Status</h3>
          {revenuePieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={revenuePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} label={({ name, percent }: any) => `${name} ${(Number(percent) * 100).toFixed(0)}%`}>
                  {revenuePieData.map((entry) => <Cell key={entry.name} fill={STATUS_COLORS[entry.name.toUpperCase().replace(/ /g, '_')] || '#6b7280'} />)}
                </Pie>
                <Tooltip formatter={(value: any) => `${Number(value).toLocaleString()} TZS`} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-[280px] flex items-center justify-center text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>No data</div>}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-sm mb-4" style={{ color: 'rgb(var(--color-text))' }}>Orders by Status</h3>
          {ordersPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={ordersPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} label={({ name, value }: any) => `${name} (${value})`}>
                  {ordersPieData.map((entry) => <Cell key={entry.name} fill={STATUS_COLORS[entry.name.toUpperCase().replace(/ /g, '_')] || '#6b7280'} />)}
                </Pie>
                <Tooltip formatter={(value: any) => `${Number(value)} orders`} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-[280px] flex items-center justify-center text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>No data</div>}
        </div>
      </div>

      {/* Top Products */}
      <div className="card">
        <div className="px-5 py-4 border-b" style={{ borderColor: 'rgb(var(--color-divider))' }}>
          <h3 className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text))' }}>🏆 Top Selling Products</h3>
        </div>
        <div className="divide-y" style={{ borderColor: 'rgb(var(--color-divider))' }}>
          {topProducts.length > 0 ? topProducts.map((product: any, i: number) => (
            <div key={product.id} className="flex items-center gap-3 px-5 py-3">
              <span className="text-xs font-bold w-5" style={{ color: 'rgb(var(--color-text-disabled))' }}>#{i + 1}</span>
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
                {product.image ? <img src={assetUrl(product.image)} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 m-2.5" style={{ color: 'rgb(var(--color-text-disabled))' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>{product.title}</p>
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{product.price.toLocaleString()} TZS</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{product.totalSold}</p>
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>sold</p>
              </div>
              <div className="text-right w-16">
                <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{product.orderCount}</p>
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>orders</p>
              </div>
              <div className="text-right w-16">
                <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{product.reviewCount}</p>
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>reviews</p>
              </div>
            </div>
          )) : (
            <div className="px-5 py-8 text-center text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>No product sales data yet</div>
          )}
        </div>
      </div>

      {/* Top Customers + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <div className="card">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgb(var(--color-divider))' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text))' }}>👤 Top Customers</h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgb(var(--color-divider))' }}>
            {topCustomers.length > 0 ? topCustomers.map((customer: any, i: number) => (
              <div key={customer.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'rgb(var(--color-primary-100))', color: 'rgb(var(--color-primary-700))' }}>
                  {customer.firstName[0]}{customer.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>{customer.firstName} {customer.lastName}</p>
                  <p className="text-xs truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>{customer.email || 'No email'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{customer.totalSpent.toLocaleString()} TZS</p>
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{customer.orderCount} orders</p>
                </div>
              </div>
            )) : (
              <div className="px-5 py-8 text-center text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>No customer data yet</div>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="card">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgb(var(--color-divider))' }}>
            <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock Alerts
            </h3>
            <button onClick={() => setShowLowStock(!showLowStock)} className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {showLowStock ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {showLowStock && (
            <div className="divide-y" style={{ borderColor: 'rgb(var(--color-divider))' }}>
              {lowStockProducts.length > 0 ? lowStockProducts.map((variant: any) => (
                <div key={variant.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
                    {variant.product?.images?.[0]?.url ? <img src={assetUrl(variant.product.images[0].url)} alt="" className="w-full h-full object-cover" /> : <Package className="w-4 h-4 m-2" style={{ color: 'rgb(var(--color-text-disabled))' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>{variant.product?.title || 'Unknown'}</p>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>SKU: {variant.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${variant.stock <= (variant.lowStockThreshold || 5) ? 'text-red-600' : 'text-green-600'}`}>
                      {variant.stock}
                    </p>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>in stock</p>
                  </div>
                </div>
              )) : (
                <div className="px-5 py-8 text-center text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>All products well-stocked ✅</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}