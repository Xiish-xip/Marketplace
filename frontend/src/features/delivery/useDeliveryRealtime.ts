import React from 'react';
import { getSocket } from '../../lib/socket';

export interface DriverLocationUpdate {
  orderId: string;
  deliveryId: string;
  deliveryPersonId: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
}

export function useDeliveryRealtime(orderIds: string[]) {
  const [locations, setLocations] = React.useState<Record<string, DriverLocationUpdate>>({});
  const key = orderIds.filter(Boolean).sort().join('|');

  React.useEffect(() => {
    const ids = orderIds.filter(Boolean);
    if (!ids.length) return;

    const socket = getSocket();
    if (!socket) return;
    ids.forEach((orderId) => socket.emit('join-order', orderId));

    const onLocation = (update: DriverLocationUpdate) => {
      setLocations((current) => ({ ...current, [update.orderId]: update }));
    };

    socket?.on('driver-location-update', onLocation);

    return () => {
      ids.forEach((orderId) => socket?.emit('leave-order', orderId));
      socket?.off('driver-location-update', onLocation);
    };
  }, [key]);

  return locations;
}
