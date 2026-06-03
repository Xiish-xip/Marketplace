export const deliveryStatuses = ['PENDING_ACCEPTANCE', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'];

export const deliveryStatusLabels: Record<string, string> = {
  PENDING_ACCEPTANCE: 'Pending acceptance',
  ACCEPTED: 'Driver assigned',
  IN_TRANSIT: 'In transit',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
};

export const deliveryStatusStyles: Record<string, string> = {
  PENDING_ACCEPTANCE: 'badge-warning',
  ACCEPTED: 'badge-info',
  IN_TRANSIT: 'badge-info',
  DELIVERED: 'badge-success',
  COMPLETED: 'badge-success',
  CANCELLED: 'badge-error',
};

export function formatMoney(value?: number | null) {
  return `${Number(value || 0).toLocaleString()} TZS`;
}

export function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-';
}

export function personName(person?: any) {
  const user = person?.user || person;
  return `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Unassigned';
}

export function parseAddress(value?: string | null) {
  if (!value) return '';
  try {
    const parsed = JSON.parse(value);
    return [parsed.street, parsed.city, parsed.region, parsed.country].filter(Boolean).join(', ');
  } catch {
    return value;
  }
}

export function mapLink(lat?: number | null, lng?: number | null, address?: string | null) {
  if (lat && lng) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return undefined;
}
