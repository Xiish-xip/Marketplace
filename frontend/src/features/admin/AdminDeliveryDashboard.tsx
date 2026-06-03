import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, MapPin, Package, Power, Truck, Users, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { patch, post } from '../../lib/api-enhanced';
import { queryKeys, useAdminDeliveries, useAdminOrders, useDeliveryPayouts, useDeliveryPersons, useDeliveryStats } from '../../lib/query-hooks';
import { SkeletonPage } from '../../components/Skeleton';
import { deliveryStatusLabels, deliveryStatusStyles, formatDate, formatMoney, mapLink, personName } from '../delivery/delivery-utils';

const statusFilters = ['ALL', 'PENDING_ACCEPTANCE', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'];

export default function AdminDeliveryDashboard() {
  const qc = useQueryClient();
  const [status, setStatus] = React.useState('ALL');
  const [orderId, setOrderId] = React.useState('');
  const [createForm, setCreateForm] = React.useState({ pickupAddress: '', dropoffAddress: '', scheduledPickup: '', notes: '' });
  const params = status === 'ALL' ? undefined : { status };
  const stats = useDeliveryStats();
  const deliveries = useAdminDeliveries(params);
  const persons = useDeliveryPersons();
  const payouts = useDeliveryPayouts({ status: 'PENDING' });
  const orders = useAdminOrders({ limit: 50, sortBy: 'createdAt', sortOrder: 'desc' });

  const updatePerson = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => patch(`/delivery/persons/${id}`, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.delivery.persons() });
      toast.success('Driver updated');
    },
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => patch(`/delivery/payouts/${id}/pay`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery'] });
      toast.success('Payout marked paid');
    },
  });

  const createDelivery = useMutation({
    mutationFn: () => post(`/delivery/order/${orderId}`, createForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery'] });
      toast.success('Delivery created');
      setOrderId('');
      setCreateForm({ pickupAddress: '', dropoffAddress: '', scheduledPickup: '', notes: '' });
    },
  });

  if (stats.isLoading || deliveries.isLoading || persons.isLoading) return <SkeletonPage cards={6} columns={3} />;

  const stat = stats.data?.data || {};
  const rows = deliveries.data?.data || [];
  const drivers = persons.data?.data || [];
  const payoutRows = payouts.data?.data || [];
  const orderRows = orders.data?.data || [];
  const activeDrivers = drivers.filter((driver: any) => driver.isActive && driver.currentLat && driver.currentLng);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-3">
        <Metric icon={<Package className="w-5 h-5" />} label="Total deliveries" value={stat.total || 0} />
        <Metric icon={<Truck className="w-5 h-5" />} label="In transit" value={stat.inTransit || 0} />
        <Metric icon={<Users className="w-5 h-5" />} label="Available drivers" value={stat.activeDrivers || 0} />
        <Metric icon={<Wallet className="w-5 h-5" />} label="Pending payouts" value={formatMoney(payoutRows.reduce((sum: number, payout: any) => sum + (payout.totalAmount || 0), 0))} />
      </div>

      <section className="card p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">Live driver map</h2>
            <p className="text-sm text-gray-500">Coordinates update from browser geolocation. Open pins in Google Maps for dispatch checks.</p>
          </div>
        </div>
        <div className="min-h-[220px] rounded-lg border border-gray-200 bg-gray-50 p-4 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeDrivers.length ? activeDrivers.map((driver: any) => (
            <a key={driver.id} className="bg-white border border-gray-200 rounded-lg p-3 hover:border-primary-300 transition-colors" href={mapLink(driver.currentLat, driver.currentLng)} target="_blank" rel="noreferrer">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary-700" />
                <p className="text-sm font-medium text-gray-900">{personName(driver)}</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">{driver.currentLat?.toFixed(5)}, {driver.currentLng?.toFixed(5)}</p>
              <p className="text-xs text-gray-500">Updated {formatDate(driver.lastLocationUpdate)}</p>
            </a>
          )) : <p className="text-sm text-gray-500">No active driver coordinates yet.</p>}
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="w-5 h-5 text-primary-700" />
          <h2 className="font-semibold text-gray-900">Create delivery for any order</h2>
        </div>
        <div className="grid lg:grid-cols-2 gap-3">
          <select className="input-field" value={orderId} onChange={(event) => setOrderId(event.target.value)}>
            <option value="">Select order</option>
            {orderRows.map((order: any) => (
              <option key={order.id} value={order.id}>{order.orderNumber} - {order.seller?.storeName || 'Seller'}</option>
            ))}
          </select>
          <input className="input-field" type="datetime-local" value={createForm.scheduledPickup} onChange={(event) => setCreateForm({ ...createForm, scheduledPickup: event.target.value })} />
          <input className="input-field" placeholder="Pickup address" value={createForm.pickupAddress} onChange={(event) => setCreateForm({ ...createForm, pickupAddress: event.target.value })} />
          <input className="input-field" placeholder="Dropoff address" value={createForm.dropoffAddress} onChange={(event) => setCreateForm({ ...createForm, dropoffAddress: event.target.value })} />
          <textarea className="input-field lg:col-span-2" rows={2} placeholder="Notes" value={createForm.notes} onChange={(event) => setCreateForm({ ...createForm, notes: event.target.value })} />
        </div>
        <button className="btn-primary mt-4" disabled={!orderId || !createForm.pickupAddress || !createForm.dropoffAddress || createDelivery.isPending} onClick={() => createDelivery.mutate()}>
          <Package className="w-4 h-4" />
          Create delivery
        </button>
      </section>

      <section>
        <div className="flex gap-1 mb-4 overflow-x-auto">
          {statusFilters.map((item) => (
            <button key={item} onClick={() => setStatus(item)} className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap ${status === item ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {item.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          {rows.length ? rows.map((delivery: any) => <AdminDeliveryCard key={delivery.id} delivery={delivery} />) : <div className="card p-6 text-sm text-gray-500">No deliveries match this filter.</div>}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-5">
        <section className="card overflow-hidden">
          <div className="p-4 border-b"><h2 className="font-semibold text-gray-900">Delivery people</h2></div>
          <div className="divide-y max-h-[420px] overflow-auto">
            {drivers.map((driver: any) => (
              <div key={driver.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{personName(driver)}</p>
                  <p className="text-xs text-gray-500">{driver.status} - {driver._count?.deliveries || 0} deliveries</p>
                </div>
                <button className={driver.isActive ? 'btn-danger btn-sm' : 'btn-secondary btn-sm'} onClick={() => updatePerson.mutate({ id: driver.id, isActive: !driver.isActive })}>
                  <Power className="w-4 h-4" />
                  {driver.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="p-4 border-b"><h2 className="font-semibold text-gray-900">Pending payouts</h2></div>
          <div className="divide-y max-h-[420px] overflow-auto">
            {payoutRows.length ? payoutRows.map((payout: any) => (
              <div key={payout.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{personName(payout.deliveryPerson)}</p>
                  <p className="text-xs text-gray-500">{payout.delivery?.order?.orderNumber} - {formatDate(payout.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatMoney(payout.totalAmount)}</p>
                  <button className="btn-secondary btn-sm mt-2" onClick={() => markPaid.mutate(payout.id)}><CheckCircle2 className="w-4 h-4" />Mark paid</button>
                </div>
              </div>
            )) : <div className="p-4 text-sm text-gray-500">No pending payouts.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center">{icon}</div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function AdminDeliveryCard({ delivery }: { delivery: any }) {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900">{delivery.order?.orderNumber}</p>
          <p className="text-xs text-gray-500">{delivery.order?.seller?.storeName || 'Seller'} to {delivery.order?.user?.firstName || 'customer'}</p>
        </div>
        <span className={deliveryStatusStyles[delivery.status] || 'badge-neutral'}>{deliveryStatusLabels[delivery.status] || delivery.status}</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <p><span className="text-gray-500">Pickup:</span> {delivery.pickup?.address || '-'}</p>
        <p><span className="text-gray-500">Dropoff:</span> {delivery.dropoff?.address || '-'}</p>
        <p><span className="text-gray-500">Driver:</span> {delivery.deliveryPerson ? personName(delivery.deliveryPerson) : 'Unassigned'}</p>
        <p><span className="text-gray-500">Updated:</span> {formatDate(delivery.updatedAt)}</p>
      </div>
    </div>
  );
}
