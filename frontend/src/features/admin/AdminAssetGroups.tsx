import { useAssetFamilies } from '../../lib/asset-hooks';

export default function AdminAssetGroups() {
  const families = useAssetFamilies();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">Asset Groups</h1>
      <div className="rounded-lg border bg-white p-4">
        {(families.data?.data || []).map((family) => (
          <div key={family.id} className="border-b py-3 last:border-0">
            <div className="font-medium text-gray-900">{family.icon} {family.name}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {family.groups.map((group) => (
                <span key={group.id} className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700">{group.icon} {group.name}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
