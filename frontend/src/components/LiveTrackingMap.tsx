import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSocket } from '../lib/socket';

// Fix default marker icon issues with bundlers
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const driverIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconSize: [30, 45],
  iconAnchor: [15, 45],
  popupAnchor: [0, -45],
  className: 'driver-marker',
});

const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const dropoffIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const sellerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export interface MapLocation {
  lat: number;
  lng: number;
  label?: string;
  address?: string;
}

export interface LiveTrackingMapProps {
  orderId: string;
  pickupLocation?: MapLocation;
  dropoffLocation?: MapLocation;
  sellerLocation?: MapLocation;
  customerLocation?: MapLocation;
  driverLocation?: MapLocation | null;
  deliveryStatus?: string;
  estimatedArrival?: string;
  driverName?: string;
  driverPhone?: string;
  driverAvatar?: string;
  driverRating?: number;
  driverVehicle?: string;
  driverPlate?: string;
  isCustomer?: boolean;
  isSeller?: boolean;
  isDriver?: boolean;
  className?: string;
  height?: string;
  showRoute?: boolean;
  onDriverLocationChange?: (lat: number, lng: number) => void;
}

interface DriverPosition {
  lat: number;
  lng: number;
  updatedAt: string;
}

// Component that recenters the map when driver position changes
function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

function LiveTrackingMap({
  orderId,
  pickupLocation,
  dropoffLocation,
  sellerLocation,
  customerLocation,
  driverLocation: initialDriverLocation,
  deliveryStatus,
  estimatedArrival,
  driverName,
  driverPhone,
  driverVehicle,
  driverPlate,
  driverRating,
  isCustomer = false,
  isSeller = false,
  isDriver = false,
  className = '',
  height = '400px',
  showRoute = true,
  onDriverLocationChange,
}: LiveTrackingMapProps) {
  const { socket } = useSocket();
  const [driverPos, setDriverPos] = useState<DriverPosition | null>(
    initialDriverLocation ? { ...initialDriverLocation, updatedAt: new Date().toISOString() } : null
  );
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // Calculate default center
  const defaultCenter: [number, number] = driverPos
    ? [driverPos.lat, driverPos.lng]
    : pickupLocation
    ? [pickupLocation.lat, pickupLocation.lng]
    : [-6.7924, 39.2083]; // Default: Dar es Salaam

  const bounds = L.latLngBounds(
    [
      pickupLocation && [pickupLocation.lat, pickupLocation.lng],
      dropoffLocation && [dropoffLocation.lat, dropoffLocation.lng],
      driverPos && [driverPos.lat, driverPos.lng],
      sellerLocation && [sellerLocation.lat, sellerLocation.lng],
    ].filter(Boolean) as [number, number][]
  );

  // Listen for real-time driver location updates
  useEffect(() => {
    if (!socket) return;

    setIsConnected(socket.connected);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Join the order room to receive location updates
    socket.emit('join-order', orderId);

    // Listen for driver location updates
    socket.on('driver-location-update', (data: any) => {
      if (data.orderId === orderId) {
        const newPos: DriverPosition = {
          lat: data.latitude,
          lng: data.longitude,
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
        setDriverPos(newPos);
        onDriverLocationChange?.(data.latitude, data.longitude);

        // Append to route points for the polyline trail
        setRoutePoints(prev => {
          const last = prev[prev.length - 1];
          // Only add if the position has changed significantly (avoid jitter)
          if (!last || distanceBetween(last[0], last[1], data.latitude, data.longitude) > 5) {
            return [...prev.slice(-200), [data.latitude, data.longitude]];
          }
          return prev;
        });
      }
    });

    // Listen for tracking/status updates
    socket.on('tracking-update', (data: any) => {
      if (data.orderId === orderId && data.location) {
        try {
          const loc = JSON.parse(data.location);
          if (loc?.lat && loc?.lng) {
            setDriverPos({ lat: loc.lat, lng: loc.lng, updatedAt: data.timestamp });
          }
        } catch {
          // location is just a string, not coordinates
        }
      }
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('driver-location-update');
      socket.off('tracking-update');
      socket.emit('leave-order', orderId);
    };
  }, [socket, orderId, onDriverLocationChange]);

  // Initialize route with existing points
  useEffect(() => {
    const points: [number, number][] = [];
    if (sellerLocation && pickupLocation) {
      points.push([sellerLocation.lat, sellerLocation.lng]);
      points.push([pickupLocation.lat, pickupLocation.lng]);
    } else if (pickupLocation && dropoffLocation) {
      points.push([pickupLocation.lat, pickupLocation.lng]);
      points.push([dropoffLocation.lat, dropoffLocation.lng]);
    }
    if (driverPos) {
      points.push([driverPos.lat, driverPos.lng]);
    }
    if (points.length >= 2 && routePoints.length === 0) {
      setRoutePoints(points);
    }
  }, [pickupLocation, dropoffLocation, sellerLocation, driverPos, routePoints.length]);

  return (
    <div className={`relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Connection indicator */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 rounded-full px-3 py-1.5 shadow-md text-xs font-medium">
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-gray-700 dark:text-gray-300">
          {isConnected ? 'Live' : 'Connecting...'}
        </span>
      </div>

      {/* Driver info card */}
      {driverPos && (driverName || driverVehicle) && (
        <div className="absolute top-3 right-3 z-[1000] bg-white/95 dark:bg-gray-800/95 rounded-xl px-4 py-3 shadow-lg border border-gray-200 dark:border-gray-700 max-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            {driverName && (
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                {driverName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              {driverName && (
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{driverName}</p>
              )}
              {driverRating !== undefined && (
                <p className="text-xs text-yellow-500">★ {driverRating.toFixed(1)}</p>
              )}
            </div>
          </div>
          {driverVehicle && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              🚗 {driverVehicle}{driverPlate ? ` • ${driverPlate}` : ''}
            </p>
          )}
          {estimatedArrival && (
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
              ⏱ ETA: {estimatedArrival}
            </p>
          )}
        </div>
      )}

      {/* Delivery status banner */}
      {deliveryStatus && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] bg-indigo-600 text-white rounded-full px-4 py-1.5 shadow-lg text-sm font-semibold">
          {deliveryStatus.replace(/_/g, ' ')}
        </div>
      )}

      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height, width: '100%' }}
        className="z-0"
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController center={driverPos ? [driverPos.lat, driverPos.lng] : null} />

        {/* Seller location */}
        {sellerLocation && (
          <Marker position={[sellerLocation.lat, sellerLocation.lng]} icon={sellerIcon}>
            <Popup>
              <div className="text-sm">
                <strong>Seller / Pickup</strong>
                <p>{sellerLocation.label || sellerLocation.address || 'Pickup location'}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Pickup location */}
        {pickupLocation && !sellerLocation && (
          <Marker position={[pickupLocation.lat, pickupLocation.lng]} icon={pickupIcon}>
            <Popup>
              <div className="text-sm">
                <strong>Pickup</strong>
                <p>{pickupLocation.label || pickupLocation.address || 'Pickup location'}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Dropoff / Customer location */}
        {dropoffLocation && (
          <Marker position={[dropoffLocation.lat, dropoffLocation.lng]} icon={dropoffIcon}>
            <Popup>
              <div className="text-sm">
                <strong>Dropoff</strong>
                <p>{dropoffLocation.label || dropoffLocation.address || 'Delivery location'}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Customer location (if different from dropoff) */}
        {customerLocation && (
          <Circle
            center={[customerLocation.lat, customerLocation.lng]}
            radius={100}
            pathOptions={{ fillColor: '#6366f1', fillOpacity: 0.3, color: '#6366f1', weight: 1 }}
          />
        )}

        {/* Driver location */}
        {driverPos && (
          <Marker position={[driverPos.lat, driverPos.lng]} icon={driverIcon}>
            <Popup>
              <div className="text-sm">
                <strong>{driverName || 'Driver'}</strong>
                {driverPhone && <p>📞 {driverPhone}</p>}
                {driverVehicle && <p>🚗 {driverVehicle} {driverPlate}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  Updated: {new Date(driverPos.updatedAt).toLocaleTimeString()}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route polyline (driver trail + planned route) */}
        {showRoute && routePoints.length >= 2 && (
          <>
            {/* Planned route (dashed) */}
            {pickupLocation && dropoffLocation && (
              <Polyline
                positions={[
                  [pickupLocation.lat, pickupLocation.lng],
                  [dropoffLocation.lat, dropoffLocation.lng],
                ]}
                pathOptions={{
                  color: '#6366f1',
                  weight: 2,
                  dashArray: '10, 8',
                  opacity: 0.5,
                }}
              />
            )}
            {/* Driver trail (solid) */}
            <Polyline
              positions={routePoints}
              pathOptions={{
                color: '#10b981',
                weight: 4,
                opacity: 0.8,
              }}
            />
          </>
        )}

        {/* Route from pickup to current driver position */}
        {showRoute && driverPos && pickupLocation && (
          <Polyline
            positions={[
              [pickupLocation.lat, pickupLocation.lng],
              [driverPos.lat, driverPos.lng],
            ]}
            pathOptions={{
              color: '#f59e0b',
              weight: 2,
              dashArray: '5, 5',
              opacity: 0.6,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

function distanceBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default LiveTrackingMap;