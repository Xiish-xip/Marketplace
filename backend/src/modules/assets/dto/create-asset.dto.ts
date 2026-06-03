export class CreateAssetDto {
  title?: string;
  description?: string;
  altText?: string;
  caption?: string;
  credit?: string;
  copyright?: string;
  tags?: string[];
  category?: string;
  subtype?: string;
  entityType?: string;
  entityId?: string;
  isPublic?: boolean;
}