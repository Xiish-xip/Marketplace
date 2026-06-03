import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Package, Phone, Clock, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { post } from '../../lib/api-enhanced';
import { queryKeys, useDeliveryByOrder } from '../../lib/query-hooks';
import { SkeletonPage } from '../../components/Skeleton';
import LiveTrackingMap, { MapLocation } from '../../components/LiveTrackingMap';
import OrderGroupChat from '../../components/OrderGroupChat';
import { deliveryStatusLabels, deliveryStatusStyles, formatDate, personName } from '../delivery/delivery-utils';

export default function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const qc = useQueryClient();
  const { data, isLoading, isError } = useDeliveryByOrder(orderId);
  const delivery = data?.data;

  const confirm = useMutation({
    mutationFn: () => post(`/delivery/${delivery.id}/confirm`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.delivery.order(orderId || '') });
      qc.invalidateQueries({ queryKey: queryKeys.orders.all });
      toast.success('Thanks, delivery confirmed');
    },
  });

  if (isLoading) return <SkeletonPage cards={6} columns={3} />;

  if (isError || !delivery) {
    return (
      <div className="page-container max-w-4xl">
        <div className="card p-8 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900">No delivery tracking yet</h1>
          <p className="text-sm text-gray-500 mt-2">
            Tracking appears after the seller or admin creates a delivery for this order.
          </p>
          <Link className="btn-secondary mt-5 inline-flex items-center gap-2" to="/account/orders">
            ← Back to orders
          </Link>
        </div>
      </div>
    );
  }

  const driver = delivery.deliveryPerson;
  const order = delivery.order;

  // Build map locations
  const pickupLocation: MapLocation | undefined = delivery.pickup
    ? {
        lat: delivery.pickup.latitude || 0,
        lng: delivery.pickup.longitude || 0,
        address: delivery.pickup.address || order?.seller?.storeLocation,
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

  const sellerLocation: MapLocation | undefined = undefined; // Would need geocoding for storeLocation

  const driverLocation: MapLocation | null =
    driver?.currentLat && driver?.currentLng
      ? { lat: driver.currentLat, lng: driver.currentLng, label: 'Driver' }
      : null;

  const driverName = driver ? personName(driver) : undefined;
  const driverPhone = driver?.user?.phone;

  return (
    <div className="page-container max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            📦 Track Order #{order?.orderNumber || orderId?.slice(0, 8)}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Last updated {formatDate(delivery.updatedAt)}
          </p>
        </div>
        <span className={deliveryStatusStyles[delivery.status] || 'badge-neutral'}>
          {deliveryStatusLabels[delivery.status] || delivery.status?.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Live Tracking Map — Full Width */}
      <div className="card overflow-hidden shadow-lg">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Live Tracking</h2>
          </div>
          {driver && (
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              <span>
                {driver.vehicleType || 'Vehicle'}{' '}
                {driver.vehiclePlate ? `• ${driver.vehiclePlate}` : ''}
              </span>
              {driverPhone && (
                <a
                  href={`tel:${driverPhone}`}
                  className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
              )}
            </div>
          )}
        </div>
        <LiveTrackingMap
          orderId={orderId!}
          pickupLocation={pickupLocation}
          dropoffLocation={dropoffLocation}
          sellerLocation={sellerLocation}
          driverLocation={driverLocation}
          deliveryStatus={delivery.status}
          driverName={driverName}
          driverPhone={driverPhone}
          driverVehicle={driver?.vehicleType}
          driverPlate={driver?.vehiclePlate}
          driverRating={driver?.rating}
          height="450px"
          showRoute={true}
        />
      </div>

      {/* Two-column layout: Chat + Delivery Details (stacks on mobile) */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Column 1: Group Chat */}
        <OrderGroupChat orderId={orderId!} className="shadow-md" maxHeight="450px" />

        {/* Column 2: Driver + Route Details */}
        <div className="space-y-4">
          {/* Driver Card */}
          <div className="card p-5 shadow-md">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                🚚
              </span>
              Driver Info
            </h2>
            {driver ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-lg">
                    {driverName?.charAt(0)?.toUpperCase() || 'D'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{driverName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {driver.vehicleType || 'Vehicle'}{' '}
                      {driver.vehiclePlate ? `• ${driver.vehiclePlate}` : ''}
                    </p>
                    {driver.rating !== undefined && (
                      <p className="text-xs text-yellow-500">★ {driver.rating.toFixed(1)}</p>
                    )}
                  </div>
                </div>
                {driverPhone && (
                  <a
                    href={`tel:${driverPhone}`}
                    className="btn-secondary btn-sm inline-flex items-center gap-2 w-full justify-center"
                  >
                    <Phone className="w-4 h-4" />
                    Call Driver
                  </a>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Waiting for a driver to accept this delivery
                </p>
              </div>
            )}
          </div>

          {/* Route Info */}
          <div className="card p-5 shadow-md space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Route Details</h2>
            <div className="space-y-3">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                  Pickup
                </p>
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                  {delivery.pickup?.address || order?.seller?.storeLocation || 'Seller location'}
                </p>
              </div>
              <div className="flex justify-center">
                <span className="text-gray-300 dark:text-gray-600">↓</span>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                  Dropoff
                </p>
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                  {delivery.dropoff?.address || 'Customer address'}
                </p>
              </div>
            </div>
          </div>

          {/* Confirm Delivery Button */}
          {delivery.status === 'DELIVERED' && (
            <button
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
              onClick={() => confirm.mutate()}
              disabled={confirm.isPending}
            >
              <CheckCircle2 className="w-5 h-5" />
              {confirm.isPending ? 'Confirming...' : 'Confirm Delivery Received'}
            </button>
          )}

          {/* Status banner for completed deliveries */}
          {delivery.status === 'COMPLETED' && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-green-700 dark:text-green-300 font-semibold">Delivery Completed!</p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                Thank you for confirming your delivery
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}