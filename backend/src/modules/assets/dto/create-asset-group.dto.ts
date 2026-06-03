export class CreateAssetGroupDto {
  familyId: string = '';
  name: string = '';
  slug: string = '';
  description?: string;
  icon?: string;
  sortOrder?: number;
  parentId?: string;
  isSystem: boolean = false;

  constructor() {}
}