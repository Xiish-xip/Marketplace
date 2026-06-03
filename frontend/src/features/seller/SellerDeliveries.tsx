import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, PackageCheck, Plus, Truck, ChevronDown, ChevronUp, MessageCircle, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import { post } from '../../lib/api-enhanced';
import { queryKeys, useSellerDeliveries, useSellerOrders } from '../../lib/query-hooks';
import { SkeletonPage } from '../../components/Skeleton';
import LiveTrackingMap, { MapLocation } from '../../components/LiveTrackingMap';
import OrderGroupChat from '../../components/OrderGroupChat';
import { deliveryStatusLabels, deliveryStatusStyles, formatDate, parseAddress, personName } from '../delivery/delivery-utils';

const readyStatuses = ['PROCESSING', 'READY_TO_SHIP', 'PAYMENT_CONFIRMED'];

export default function SellerDeliveries() {
  const qc = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [form, setForm] = useState({ pickupAddress: '', dropoffAddress: '', scheduledPickup: '', notes: '' });
  const [expandedDeliveryId, setExpandedDeliveryId] = useState<string | null>(null);
  const deliveries = useSellerDeliveries();
  const orders = useSellerOrders({ limit: 50, sortBy: 'createdAt', sortOrder: 'desc' });

  const createDelivery = useMutation({
    mutationFn: () => post(`/delivery/order/${selectedOrderId}`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.delivery.seller() });
      toast.success('Delivery created');
      setSelectedOrderId('');
      setForm({ pickupAddress: '', dropoffAddress: '', scheduledPickup: '', notes: '' });
    },
  });

  const deliveryRows = deliveries.data?.data || [];
  const orderRows = (orders.data?.data || []).filter((order: any) => readyStatuses.includes(order.status));
  const selectedOrder = orderRows.find((order: any) => order.id === selectedOrderId);

  React.useEffect(() => {
    if (!selectedOrder) return;
    setForm((current) => ({
      ...current,
      dropoffAddress: current.dropoffAddress || parseAddress(selectedOrder.shippingAddress),
    }));
  }, [selectedOrder]);

  if (deliveries.isLoading || orders.isLoading) return <SkeletonPage cards={6} columns={3} />;

  return (
    <div className="space-y-6">
      {/* Create Delivery Section */}
      <section className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-primary-700" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Create delivery</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <select
            className="input-field"
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
          >
            <option value="">Select ready order</option>
            {orderRows.map((order: any) => (
              <option key={order.id} value={order.id}>
                {order.orderNumber} - {order.user?.firstName || 'Customer'}
              </option>
            ))}
          </select>
          <input
            className="input-field"
            type="datetime-local"
            value={form.scheduledPickup}
            onChange={(e) => setForm({ ...form, scheduledPickup: e.target.value })}
          />
          <input
            className="input-field"
            placeholder="Pickup address"
            value={form.pickupAddress}
            onChange={(e) => setForm({ ...form, pickupAddress: e.target.value })}
          />
          <input
            className="input-field"
            placeholder="Dropoff address"
            value={form.dropoffAddress}
            onChange={(e) => setForm({ ...form, dropoffAddress: e.target.value })}
          />
          <textarea
            className="input-field lg:col-span-2"
            placeholder="Delivery notes"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <button
          className="btn-primary mt-4"
          disabled={
            !selectedOrderId ||
            !form.pickupAddress ||
            !form.dropoffAddress ||
            createDelivery.isPending
          }
          onClick={() => createDelivery.mutate()}
        >
          <Truck className="w-4 h-4" />
          Publish delivery
        </button>
      </section>

      {/* Live Deliveries */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Active Deliveries ({deliveryRows.length})
        </h2>
        <div className="space-y-4">
          {deliveryRows.length ? (
            deliveryRows.map((delivery: any) => (
              <SellerDeliveryCard
                key={delivery.id}
                delivery={delivery}
                isExpanded={expandedDeliveryId === delivery.id}
                onToggle={() =>
                  setExpandedDeliveryId(expandedDeliveryId === delivery.id ? null : delivery.id)
                }
              />
            ))
          ) : (
            <div className="card p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              <PackageCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              No deliveries have been created yet. Use the form above to create one.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SellerDeliveryCard({
  delivery,
  isExpanded,
  onToggle,
}: {
  delivery: any;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const driver = delivery.deliveryPerson;
  const order = delivery.order;

  const pickupLocation: MapLocation | undefined = delivery.pickup
    ? {
        lat: delivery.pickup.latitude || 0,
        lng: delivery.pickup.longitude || 0,
        address: delivery.pickup.address,
        label: 'Pickup',
      }
    : undefined;

  const dropoffLocation: MapLocation | undefined = delivery.dropoff
    ? {
        lat: delivery.dropoff.latitude || 0,
        lng: delivery.dropoff.longitude || 0,
        address: delivery.dropoff.address,
        label: 'Dropoff',
      }
    : undefined;

  const driverLocation: MapLocation | null =
    driver?.currentLat && driver?.currentLng
      ? { lat: driver.currentLat, lng: driver.currentLng, label: 'Driver' }
      : null;

  const driverName = driver ? personName(driver) : undefined;

  return (
    <div className="card overflow-hidden shadow-md">
      {/* Card Header — always visible */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
            <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
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
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {driver ? `Driver: ${driverName}` : 'Waiting for driver'} · Created {formatDate(delivery.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          {!isExpanded && (
            <>
              <Navigation className="w-4 h-4" />
              <MessageCircle className="w-4 h-4" />
            </>
          )}
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Full-width Tracking Map */}
          <LiveTrackingMap
            orderId={delivery.orderId}
            pickupLocation={pickupLocation}
            dropoffLocation={dropoffLocation}
            driverLocation={driverLocation}
            deliveryStatus={delivery.status}
            driverName={driverName}
            driverPhone={driver?.user?.phone}
            driverVehicle={driver?.vehicleType}
            driverPlate={driver?.vehiclePlate}
            driverRating={driver?.rating}
            height="350px"
            showRoute={true}
          />

          {/* Chat + Details Grid */}
          <div className="grid lg:grid-cols-[1fr_1fr] gap-0">
            {/* Group Chat */}
            <div className="border-r border-gray-200 dark:border-gray-700">
              <OrderGroupChat orderId={delivery.orderId} maxHeight="400px" />
            </div>

            {/* Route Details */}
            <div className="p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
              <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Route Info</h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">📦 Pickup</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                  {delivery.pickup?.address || 'Pickup location'}
                </p>
              </div>
              <div className="flex justify-center">
                <span className="text-gray-300 dark:text-gray-600 text-lg">↓</span>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">📍 Dropoff</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                  {delivery.dropoff?.address || 'Customer address'}
                </p>
              </div>

              {driver && (
                <div className="border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 bg-indigo-50 dark:bg-indigo-900/30">
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">🚚 Driver</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{driverName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {driver.vehicleType || 'Vehicle'} {driver.vehiclePlate ? `• ${driver.vehiclePlate}` : ''}
                  </p>
                  {driver.user?.phone && (
                    <a
                      href={`tel:${driver.user.phone}`}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1 inline-block"
                    >
                      📞 Call {driver.user.phone}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}