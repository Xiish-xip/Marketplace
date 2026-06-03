import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from './api-enhanced';
import { useAuthStore } from './auth-store';
import toast from 'react-hot-toast';

export const pageBuilderKeys = {
  components: {
    all: ['page-builder', 'components'] as const,
    type: (type: string) => ['page-builder', 'components', type] as const,
  },
  layouts: {
    all: ['page-builder', 'layouts'] as const,
    list: (params?: any) => ['page-builder', 'layouts', 'list', params] as const,
    detail: (id: string) => ['page-builder', 'layouts', id] as const,
    slug: (slug: string) => ['page-builder', 'layouts', 'slug', slug] as const,
    published: (slug: string) => ['page-builder', 'published', slug] as const,
  },
};

// ── Component Definitions ──
export function useComponentTypes() {
  return useQuery({
    queryKey: pageBuilderKeys.components.all,
    queryFn: () => get('/page-builder/components'),
    staleTime: 300000,
  });
}

export function useSeedComponents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => post('/page-builder/components/seed', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pageBuilderKeys.components.all });
      toast.success('Components seeded');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to seed components'),
  });
}

// ── Layouts ──
export function useLayouts(params?: any) {
  return useQuery({
    queryKey: pageBuilderKeys.layouts.list(params),
    queryFn: () => get('/page-builder/layouts', params),
    staleTime: 30000,
  });
}

export function useLayoutBySlug(slug: string) {
  return useQuery({
    queryKey: pageBuilderKeys.layouts.slug(slug),
    queryFn: () => get(`/page-builder/layouts/slug/${slug}`),
    enabled: !!slug,
  });
}

export function useLayoutById(id: string) {
  return useQuery({
    queryKey: pageBuilderKeys.layouts.detail(id),
    queryFn: () => get(`/page-builder/layouts/${id}`),
    enabled: !!id,
  });
}

export function useCreateLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => post('/page-builder/layouts', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pageBuilderKeys.layouts.all });
      toast.success('Layout created');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create layout'),
  });
}

export function useUpdateLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => put(`/page-builder/layouts/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pageBuilderKeys.layouts.all });
      toast.success('Layout updated');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update layout'),
  });
}

export function useDeleteLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/page-builder/layouts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pageBuilderKeys.layouts.all });
      toast.success('Layout deleted');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete layout'),
  });
}

export function useDuplicateLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post(`/page-builder/layouts/${id}/duplicate`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pageBuilderKeys.layouts.all });
      toast.success('Layout duplicated');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to duplicate layout'),
  });
}

// ── Sections ──
export function useAddSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ layoutId, data }: { layoutId: string; data: any }) =>
      post(`/page-builder/layouts/${layoutId}/sections`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pageBuilderKeys.layouts.all });
      toast.success('Section added');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to add section'),
  });
}

export function useUpdateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => put(`/page-builder/sections/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pageBuilderKeys.layouts.all });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update section'),
  });
}

export function useReorderSections() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ layoutId, sectionIds }: { layoutId: string; sectionIds: string[] }) =>
      put(`/page-builder/layouts/${layoutId}/reorder`, { sectionIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pageBuilderKeys.layouts.all });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to reorder sections'),
  });
}

export function useDeleteSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/page-builder/sections/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pageBuilderKeys.layouts.all });
      toast.success('Section deleted');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete section'),
  });
}

// ── JSON Tree API ──
export function useLayoutTree(id: string) {
  return useQuery({
    queryKey: ['page-builder', 'layout-tree', id],
    queryFn: () => get(`/page-builder/layouts/${id}/tree`),
    enabled: !!id,
  });
}

export function useSaveLayoutTree() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tree, silent }: { id: string; tree: any[]; silent?: boolean }) =>
      put(`/page-builder/layouts/${id}/tree`, { tree }),
    onSuccess: (_, variables) => {
      // Silently update query data to avoid feedback loop - do NOT invalidate tree query
      qc.setQueryData(['page-builder', 'layout-tree', variables.id], (old: any) => {
        if (!old) return old;
        return { ...old, data: { ...old.data, tree: variables.tree, updatedAt: new Date().toISOString() } };
      });
      qc.invalidateQueries({ queryKey: pageBuilderKeys.layouts.all });
      // Only show toast on manual saves (not silent auto-saves)
      if (!variables.silent) {
        toast.success('Layout saved');
      }
    },
    onError: (err: any) => {
      // Only show error toast on manual saves
      if (err?.config?.silent !== true) {
        toast.error(err.response?.data?.message || 'Failed to save layout tree');
      }
    },
  });
}

export function usePublishedLayoutTree(slug: string) {
  return useQuery({
    queryKey: pageBuilderKeys.layouts.published(slug),
    queryFn: async () => {
      try {
        return await get(`/page-builder/published-tree/${slug}`);
      } catch {
        return { success: true, data: { tree: [] }, demoMode: true };
      }
    },
    enabled: !!slug,
    staleTime: 60000,
    retry: false,
  });
}

// ── Templates (Header/Footer) ──
export function useTemplates(params?: any) {
  return useQuery({
    queryKey: ['page-builder', 'templates', 'list', params],
    queryFn: () => get('/page-builder/templates', params),
    staleTime: 30000,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => post('/page-builder/templates', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['page-builder', 'templates'] });
      toast.success('Template created');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create template'),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => put(`/page-builder/templates/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['page-builder', 'templates'] });
      qc.invalidateQueries({ queryKey: ['page-builder', 'site-settings'] });
      toast.success('Template updated');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update template'),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/page-builder/templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['page-builder', 'templates'] });
      toast.success('Template deleted');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete template'),
  });
}

// ── Site Settings ──
export function useSiteSettings() {
  return useQuery({
    queryKey: ['page-builder', 'site-settings'],
    queryFn: () => get('/page-builder/site-settings'),
    staleTime: 60000,
  });
}

export function useUpdateSiteSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => put('/page-builder/site-settings', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['page-builder', 'site-settings'] });
      toast.success('Site settings updated');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update site settings'),
  });
}

// ── Public ──
export function usePublishedLayout(slug: string) {
  return useQuery({
    queryKey: pageBuilderKeys.layouts.published(slug),
    queryFn: () => get(`/page-builder/published/${slug}`),
    enabled: !!slug,
    staleTime: 60000,
  });
}

export function useActiveHeaderFooter() {
  return useQuery({
    queryKey: ['page-builder', 'active-templates'],
    queryFn: async () => {
      const [headerRes, footerRes] = await Promise.allSettled([
        get('/page-builder/published-tree/active-header'),
        get('/page-builder/published-tree/active-footer'),
      ]);
      return {
        header: headerRes.status === 'fulfilled' ? headerRes.value?.data : null,
        footer: footerRes.status === 'fulfilled' ? footerRes.value?.data : null,
      };
    },
    staleTime: 60000,
  });
}
