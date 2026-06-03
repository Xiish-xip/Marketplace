import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bike, CheckCircle2, Clock3, LocateFixed, MapPin, Package,
  Power, Truck, Wallet, MessageCircle, Navigation, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { patch, post } from '../../lib/api-enhanced';
import {
  useAvailableDeliveries, useDeliveryProfile, useMyDeliveries,
  useMyDeliveryPayouts, queryKeys,
} from '../../lib/query-hooks';
import { SkeletonPage } from '../../components/Skeleton';
import LiveTrackingMap, { MapLocation } from '../../components/LiveTrackingMap';
import OrderGroupChat from '../../components/OrderGroupChat';
import {
  deliveryStatusLabels, deliveryStatusStyles,
  formatDate, formatMoney, personName,
} from './delivery-utils';

export default function DeliveryDashboard() {
  const qc = useQueryClient();
  const profile = useDeliveryProfile();
  const available = useAvailableDeliveries();
  const mine = useMyDeliveries();
  const payouts = useMyDeliveryPayouts();
  const [form, setForm] = useState({
    vehicleType: 'Motorbike', vehiclePlate: '', serviceArea: '', maxDistance: 50,
  });
  const [sharing, setSharing] = useState(false);
  const [expandedDeliveryId, setExpandedDeliveryId] = useState<string | null>(null);
  const watchIdRef = React.useRef<number | null>(null);

  const register = useMutation({
    mutationFn: () => post('/delivery/register', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['delivery'] }); toast.success('Delivery profile ready'); },
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => patch('/delivery/status', { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.delivery.profile() }); toast.success('Status updated'); },
  });

  const sendLocation = useMutation({
    mutationFn: ({ latitude, longitude }: { latitude: number; longitude: number }) =>
      patch('/delivery/location', { latitude, longitude }),
  });

  const action = useMutation({
    mutationFn: ({ id, step }: { id: string; step: 'accept' | 'pick-up' | 'deliver' }) =>
      post(`/delivery/${id}/${step}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['delivery'] }); toast.success('Delivery updated'); },
  });

  const locate = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not available'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => sendLocation.mutate({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => toast.error('Could not read your location'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const stopSharing = React.useCallback(() => {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    setSharing(false);
  }, []);

  const toggleLiveSharing = () => {
    if (sharing) { stopSharing(); return; }
    if (!navigator.geolocation) { toast.error('Geolocation not available'); return; }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => sendLocation.mutate({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => { toast.error('Could not keep sharing location'); stopSharing(); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    setSharing(true);
    toast.success('Live location sharing started');
  };

  React.useEffect(() => stopSharing, [stopSharing]);

  if (profile.isLoading) return <SkeletonPage cards={6} columns={3} />;

  if (profile.isError) {
    return (
      <div className="max-w-2xl mx-auto card p-6">
        <div className="w-12 h-12 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center mb-4">
          <Bike className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Register as a delivery person</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Set your vehicle and service area to start accepting marketplace deliveries.
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mt-5">
          <input className="input-field" placeholder="Vehicle type" value={form.vehicleType}
            onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} />
          <input className="input-field" placeholder="Plate number" value={form.vehiclePlate}
            onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })} />
          <input className="input-field sm:col-span-2" placeholder="Service area" value={form.serviceArea}
            onChange={(e) => setForm({ ...form, serviceArea: e.target.value })} />
          <label className="text-sm text-gray-600 dark:text-gray-400 sm:col-span-2">
            Max distance: {form.maxDistance} km
            <input className="w-full mt-2" type="range" min="5" max="100" value={form.maxDistance}
              onChange={(e) => setForm({ ...form, maxDistance: Number(e.target.value) })} />
          </label>
        </div>
        <button className="btn-primary mt-5" onClick={() => register.mutate()} disabled={register.isPending}>
          <CheckCircle2 className="w-4 h-4" /> Complete registration
        </button>
      </div>
    );
  }

  const person = profile.data?.data;
  const canAcceptDeliveries = person?.status === 'AVAILABLE' && person?.isActive;
  const availableDeliveries = available.data?.data || [];
  const myDeliveries = mine.data?.data || [];
  const payoutRows = payouts.data?.data || [];
  const active = myDeliveries.filter((d: any) => !['COMPLETED', 'CANCELLED'].includes(d.status));

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-3">
        <Metric icon={<Power className="w-5 h-5" />} label="Status" value={person?.status?.replace(/_/g, ' ')} />
        <Metric icon={<Package className="w-5 h-5" />} label="Active deliveries" value={active.length} />
        <Metric icon={<CheckCircle2 className="w-5 h-5" />} label="Completed" value={person?.totalDeliveries || 0} />
        <Metric icon={<Wallet className="w-5 h-5" />} label="Pending payout"
          value={formatMoney(payoutRows.filter((p: any) => p.status === 'PENDING').reduce((s: number, p: any) => s + (p.totalAmount || 0), 0))} />
      </div>

      {/* Profile & Controls */}
      <div className="card p-4 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">{personName(person)}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {person?.vehicleType || 'Vehicle'} {person?.vehiclePlate ? `- ${person.vehiclePlate}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary btn-sm" onClick={locate} disabled={sendLocation.isPending}>
            <LocateFixed className="w-4 h-4" /> Update location
          </button>
          <button className={sharing ? 'btn-danger btn-sm' : 'btn-primary btn-sm'} onClick={toggleLiveSharing}>
            <MapPin className="w-4 h-4" />
            {sharing ? 'Stop live sharing' : 'Share live location'}
          </button>
          <button className="btn-secondary btn-sm"
            onClick={() => updateStatus.mutate(person?.status === 'OFFLINE' ? 'AVAILABLE' : 'OFFLINE')}>
            <Power className="w-4 h-4" />
            {person?.status === 'OFFLINE' ? 'Go available' : 'Go offline'}
          </button>
        </div>
      </div>

      {/* Live position map */}
      <section className="card overflow-hidden shadow-md">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">My Live Position</h2>
          </div>
          <span className={sharing ? 'badge-success' : 'badge-neutral'}>
            {sharing ? 'Live • Sharing' : 'Paused'}
          </span>
        </div>
        <LiveTrackingMap
          orderId="driver-self"
          driverLocation={
            person?.currentLat && person?.currentLng
              ? { lat: person.currentLat, lng: person.currentLng, label: 'You' }
              : null
          }
          driverName={personName(person)}
          driverVehicle={person?.vehicleType}
          driverPlate={person?.vehiclePlate}
          height="300px"
          showRoute={false}
        />
        <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 text-center">
          {sharing
            ? 'Your location is being shared in real-time with all active deliveries.'
            : 'Enable "Share live location" to broadcast your position to customers and sellers.'}
        </div>
      </section>

      {/* Available deliveries (2-col card grid on mobile+) */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Available deliveries</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {availableDeliveries.length ? availableDeliveries.map((delivery: any) => (
            <DeliveryCard
              key={delivery.id}
              delivery={delivery}
              action={
                <button
                  className="btn-primary btn-sm"
                  disabled={!canAcceptDeliveries || action.isPending}
                  onClick={() => {
                    if (!canAcceptDeliveries) { toast.error('Go available first'); return; }
                    action.mutate({ id: delivery.id, step: 'accept' });
                  }}
                >
                  Accept
                </button>
              }
            />
          )) : <EmptyPanel text="No open deliveries right now." />}
        </div>
      </section>

      {/* My active deliveries — expandable with map + chat */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          My deliveries ({myDeliveries.length})
        </h2>
        <div className="space-y-4">
          {myDeliveries.length ? myDeliveries.map((delivery: any) => (
            <ActiveDeliveryCard
              key={delivery.id}
              delivery={delivery}
              isExpanded={expandedDeliveryId === delivery.id}
              onToggle={() => setExpandedDeliveryId(expandedDeliveryId === delivery.id ? null : delivery.id)}
              action={
                <div className="flex gap-2">
                  {delivery.status === 'ACCEPTED' && (
                    <button className="btn-primary btn-sm" onClick={() => action.mutate({ id: delivery.id, step: 'pick-up' })}>
                      Pick up
                    </button>
                  )}
                  {delivery.status === 'IN_TRANSIT' && (
                    <button className="btn-primary btn-sm" onClick={() => action.mutate({ id: delivery.id, step: 'deliver' })}>
                      Mark delivered
                    </button>
                  )}
                </div>
              }
            />
          )) : <EmptyPanel text="Accepted deliveries will appear here." />}
        </div>
      </section>

      {/* Payouts */}
      <section className="card overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Payout history</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {payoutRows.length ? payoutRows.map((payout: any) => (
            <div key={payout.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {payout.delivery?.order?.orderNumber || 'Delivery payout'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(payout.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatMoney(payout.totalAmount)}</p>
                <span className={payout.status === 'PAID' ? 'badge-success' : 'badge-warning'}>{payout.status}</span>
              </div>
            </div>
          )) : <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No payouts yet.</div>}
        </div>
      </section>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center">{icon}</div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{value}</p>
        </div>
      </div>
    </div>
  );
}

function DeliveryCard({ delivery, action }: { delivery: any; action?: React.ReactNode }) {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{delivery.order?.orderNumber}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{delivery.order?.items?.length || 0} items</p>
        </div>
        <span className={deliveryStatusStyles[delivery.status] || 'badge-neutral'}>
          {deliveryStatusLabels[delivery.status] || delivery.status}
        </span>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <LocationBlock label="Pickup" address={delivery.pickup?.address || delivery.order?.seller?.storeLocation} />
        <LocationBlock label="Dropoff" address={delivery.dropoff?.address} />
      </div>
      <div className="flex justify-end">{action}</div>
    </div>
  );
}

function ActiveDeliveryCard({
  delivery, isExpanded, onToggle, action,
}: { delivery: any; isExpanded: boolean; onToggle: () => void; action?: React.ReactNode }) {
  const driver = delivery.deliveryPerson;
  const order = delivery.order;

  const pickupLocation: MapLocation | undefined = delivery.pickup
    ? { lat: delivery.pickup.latitude || 0, lng: delivery.pickup.longitude || 0, address: delivery.pickup.address, label: 'Pickup' }
    : undefined;

  const dropoffLocation: MapLocation | undefined = delivery.dropoff
    ? { lat: delivery.dropoff.latitude || 0, lng: delivery.dropoff.longitude || 0, address: delivery.dropoff.address, label: 'Dropoff' }
    : undefined;

  const driverLocation: MapLocation | null =
    driver?.currentLat && driver?.currentLng ? { lat: driver.currentLat, lng: driver.currentLng, label: 'You' } : null;

  return (
    <div className="card overflow-hidden shadow-md">
      {/* Header */}
      <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={onToggle}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
            <Truck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {order?.orderNumber || `#${delivery.orderId?.slice(0, 8)}`}
              </p>
              <span className={deliveryStatusStyles[delivery.status] || 'badge-neutral'}>
                {deliveryStatusLabels[delivery.status] || delivery.status?.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {order?.seller?.storeName || 'Seller'} → {order?.user?.firstName || 'Customer'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          {!isExpanded && <><Navigation className="w-4 h-4" /><MessageCircle className="w-4 h-4" /></>}
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {/* Expanded: Map + Chat */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <LiveTrackingMap
            orderId={delivery.orderId}
            pickupLocation={pickupLocation}
            dropoffLocation={dropoffLocation}
            driverLocation={driverLocation}
            deliveryStatus={delivery.status}
            driverName={personName(driver)}
            driverPhone={driver?.user?.phone}
            driverVehicle={driver?.vehicleType}
            driverPlate={driver?.vehiclePlate}
            height="300px"
            showRoute={true}
          />
          <div className="grid lg:grid-cols-[1fr_1fr] gap-0">
            <div className="border-r border-gray-200 dark:border-gray-700">
              <OrderGroupChat orderId={delivery.orderId} maxHeight="350px" />
            </div>
            <div className="p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
              <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Delivery Details</h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">📦 Pickup</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {delivery.pickup?.address || order?.seller?.storeLocation}
                </p>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">📍 Dropoff</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {delivery.dropoff?.address || 'Customer address'}
                </p>
              </div>
              <div className="border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 bg-indigo-50 dark:bg-indigo-900/30">
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">👤 Customer</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {order?.user?.firstName} {order?.user?.lastName}
                </p>
                {order?.user?.phone && (
                  <a href={`tel:${order.user.phone}`}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1 inline-block">
                    📞 {order.user.phone}
                  </a>
                )}
              </div>
              {action && <div className="flex justify-end pt-2">{action}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LocationBlock({ label, address }: { label: string; address?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-gray-900 dark:text-gray-100 text-sm">{address || 'Address unavailable'}</p>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="card p-6 text-center text-sm text-gray-500 dark:text-gray-400">
      <Clock3 className="w-6 h-6 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
      {text}
    </div>
  );
}