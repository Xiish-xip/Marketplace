export class UpdateAssetGroupDto {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  parentId?: string;
  isSystem?: boolean;
}