import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { del, get, post, put } from './api-enhanced';
import type { Asset, AssetFamily } from './asset-types';

export const assetKeys = {
  all: ['assets'] as const,
  list: (params?: any) => ['assets', 'list', params] as const,
  detail: (id?: string) => ['assets', 'detail', id] as const,
  families: () => ['assets', 'families'] as const,
  search: (q: string) => ['assets', 'search', q] as const,
  entity: (entityType?: string, entityId?: string) => ['assets', 'entity', entityType, entityId] as const,
};

export function useAssets(params?: any) {
  return useQuery({
    queryKey: assetKeys.list(params),
    queryFn: () => get<Asset[]>('/assets', params),
    staleTime: 30000,
  });
}

export function useAsset(id?: string) {
  return useQuery({
    queryKey: assetKeys.detail(id),
    queryFn: () => get<Asset>(`/assets/${id}`),
    enabled: !!id,
  });
}

export function useAssetFamilies() {
  return useQuery({
    queryKey: assetKeys.families(),
    queryFn: () => get<AssetFamily[]>('/assets/groups'),
    staleTime: 120000,
  });
}

export function useAssetGroups(familyId?: string) {
  const families = useAssetFamilies();
  const groups = families.data?.data?.flatMap((family) => family.groups || []) || [];
  return { ...families, data: familyId ? groups.filter((group) => group.familyId === familyId) : groups };
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData | Record<string, any>) => post<Asset>('/assets', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assetKeys.all });
      toast.success('Asset uploaded');
    },
  });
}

export function useBulkUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => post<Asset[]>('/assets/bulk', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assetKeys.all });
      toast.success('Assets uploaded');
    },
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Asset> }) => put<Asset>(`/assets/${id}`, data),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: assetKeys.all });
      qc.invalidateQueries({ queryKey: assetKeys.detail(vars.id) });
      toast.success('Asset updated');
    },
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<Asset>(`/assets/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assetKeys.all });
      toast.success('Asset archived');
    },
  });
}

export function useSearchAssets(query: string) {
  return useQuery({
    queryKey: assetKeys.search(query),
    queryFn: () => get<Asset[]>('/assets/search', { q: query }),
    enabled: query.trim().length > 0,
  });
}

export function useAssetsByEntity(entityType?: string, entityId?: string) {
  return useQuery({
    queryKey: assetKeys.entity(entityType, entityId),
    queryFn: () => get<Asset[]>(`/assets/by-entity/${entityType}/${entityId}`),
    enabled: !!entityType && !!entityId,
  });
}

export function useLinkAssetToEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, entityType, entityId }: { id: string; entityType: string; entityId: string }) =>
      post<Asset>(`/assets/${id}/link`, { entityType, entityId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: assetKeys.all }),
  });
}
