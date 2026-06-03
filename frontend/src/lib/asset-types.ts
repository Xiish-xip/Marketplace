export interface Asset {
  id: string;
  groupId: string | null;
  filename: string;
  originalName: string;
  mimeType: string;
  extension: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  dominantColor: string | null;
  blurHash: string | null;
  storageProvider: string;
  storagePath: string;
  url: string;
  thumbnailUrl: string | null;
  optimizedUrl: string | null;
  title: string | null;
  slug: string | null;
  description: string | null;
  altText: string | null;
  caption: string | null;
  credit: string | null;
  copyright: string | null;
  tags: string[] | string | null;
  category: string | null;
  subtype: string | null;
  entityType: string | null;
  entityId: string | null;
  isPublic: boolean;
  isSystem: boolean;
  status: string;
  usageCount: number;
  uploadedById: string | null;
  uploadedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetGroup {
  id: string;
  familyId: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  parentId: string | null;
  children: AssetGroup[];
  level: number;
  assets?: Asset[];
}

export interface AssetFamily {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  groups: AssetGroup[];
}

export interface AssetPickerResult {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  optimizedUrl: string | null;
  altText: string | null;
  title: string | null;
  width: number | null;
  height: number | null;
  mimeType: string;
}

export function toPickerResult(asset: Asset): AssetPickerResult {
  return {
    id: asset.id,
    url: asset.url,
    thumbnailUrl: asset.thumbnailUrl,
    optimizedUrl: asset.optimizedUrl,
    altText: asset.altText,
    title: asset.title,
    width: asset.width,
    height: asset.height,
    mimeType: asset.mimeType,
  };
}
