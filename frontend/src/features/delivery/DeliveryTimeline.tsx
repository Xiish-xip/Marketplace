import { CheckCircle2, Circle, Clock3, PackageCheck, Truck } from 'lucide-react';
import { deliveryStatusLabels, deliveryStatuses, formatDate } from './delivery-utils';

const icons: Record<string, JSX.Element> = {
  PENDING_ACCEPTANCE: <Clock3 className="w-4 h-4" />,
  ACCEPTED: <Truck className="w-4 h-4" />,
  IN_TRANSIT: <Truck className="w-4 h-4" />,
  DELIVERED: <PackageCheck className="w-4 h-4" />,
  COMPLETED: <CheckCircle2 className="w-4 h-4" />,
};

export default function DeliveryTimeline({ delivery }: { delivery: any }) {
  const activeIndex = Math.max(0, deliveryStatuses.indexOf(delivery?.status));
  const dates: Record<string, string | null | undefined> = {
    PENDING_ACCEPTANCE: delivery?.createdAt,
    ACCEPTED: delivery?.acceptedAt,
    IN_TRANSIT: delivery?.pickedUpAt,
    DELIVERED: delivery?.deliveredAt,
    COMPLETED: delivery?.customerConfirmedAt,
  };

  return (
    <div className="space-y-3">
      {deliveryStatuses.map((status, index) => {
        const complete = index <= activeIndex;
        return (
          <div key={status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${complete ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {complete ? icons[status] : <Circle className="w-4 h-4" />}
              </div>
              {index < deliveryStatuses.length - 1 && <div className={`w-px h-8 ${index < activeIndex ? 'bg-primary-300' : 'bg-gray-200'}`} />}
            </div>
            <div className="pt-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{deliveryStatusLabels[status]}</p>
              <p className="text-xs text-gray-500">{dates[status] ? formatDate(dates[status]) : 'Waiting'}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
