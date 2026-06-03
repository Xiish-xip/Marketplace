import React from 'react';
import { Link } from 'react-router-dom';
import { assetUrl } from '../lib/assets';
import VerifiedBadge from './VerifiedBadge';

interface ClickableUserAvatarProps {
  userId: string;
  avatar?: string | null;
  firstName?: string;
  lastName?: string;
  role?: string;
  showBadge?: boolean;
  isVerified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
  storeSlug?: string;
}

export default function ClickableUserAvatar({
  userId,
  avatar,
  firstName,
  lastName,
  role,
  showBadge = true,
  isVerified = false,
  size = 'sm',
  showName = false,
  className = '',
  storeSlug,
}: ClickableUserAvatarProps) {
  const sizeMap = { sm: 7, md: 9, lg: 12 };
  const textSize = { sm: 'text-xs', md: 'text-sm', lg: 'text-lg' };
  const px = sizeMap[size];
  
  // Determine if badge should be shown (sellers, delivery, admin)
  const shouldShowBadge = showBadge && isVerified && 
    (role === 'SELLER' || role === 'DELIVERY' || role === 'ADMIN' || role === 'SUPER_ADMIN');
  
  // For sellers, link to store page. For others, link to user landing page
  const linkTo = storeSlug ? `/sellers/${storeSlug}` : `/user/${userId}`;

  const avatarContent = avatar ? (
    <img
      src={assetUrl(avatar)}
      alt={firstName || 'User'}
      className="w-full h-full rounded-full object-cover"
    />
  ) : (
    <div
      className="w-full h-full rounded-full flex items-center justify-center font-semibold"
      style={{
        background: 'linear-gradient(135deg, rgb(var(--color-primary-100)), rgb(var(--color-primary-200)))',
        color: 'rgb(var(--color-primary-700))',
      }}
    >
      <span className={textSize[size]}>
        {firstName?.[0]?.toUpperCase() || 'U'}
        {lastName?.[0]?.toUpperCase() || ''}
      </span>
    </div>
  );

  return (
    <Link
      to={linkTo}
      className={`inline-flex items-center gap-1.5 group ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <span
        className="relative inline-block shrink-0"
        style={{ width: `${px * 4}px`, height: `${px * 4}px` }}
      >
        {avatarContent}
        {shouldShowBadge && (
          <span className="absolute -bottom-0.5 -right-0.5">
            <VerifiedBadge size={14} />
          </span>
        )}
      </span>
      {showName && (
        <span
          className="text-xs font-medium truncate group-hover:underline max-w-[120px]"
          style={{ color: 'rgb(var(--color-text-secondary))' }}
        >
          {firstName} {lastName}
        </span>
      )}
    </Link>
  );
}