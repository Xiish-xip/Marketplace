import { MapPin } from 'lucide-react';

interface GoogleMapEmbedProps {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  label?: string;
  heightClass?: string;
}

export default function GoogleMapEmbed({ latitude, longitude, address, label = 'Map', heightClass = 'h-64' }: GoogleMapEmbedProps) {
  const query = latitude && longitude ? `${latitude},${longitude}` : address;

  if (!query) {
    return (
      <div className={`${heightClass} rounded-lg border border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-sm text-gray-500`}>
        <MapPin className="w-6 h-6 text-gray-300 mb-2" />
        Location unavailable
      </div>
    );
  }

  const src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;

  return (
    <div className={`${heightClass} rounded-lg border border-gray-200 overflow-hidden bg-gray-50`}>
      <iframe
        title={label}
        src={src}
        className="w-full h-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
