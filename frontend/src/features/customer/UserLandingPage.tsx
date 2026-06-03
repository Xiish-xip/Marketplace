import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  MapPin, Package, ShieldCheck, Star, Store, ShoppingBag, Grid3X3, List,
  ChevronRight, Phone, Mail, Clock, Award, TrendingUp, Tag, Heart, User,
  CalendarDays, Users,
} from 'lucide-react';
import { useProducts, useUserPublicProfile, useFollowUser, useUnfollowUser, useFollowers, useWishlist } from '../../lib/query-hooks';
import { useAuthStore } from '../../lib/auth-store';
import { assetUrl } from '../../lib/assets';
import { SkeletonPage } from '../../components/Skeleton';
import EmptyState from '../shared/EmptyState';
import VerifiedBadge from '../../components/VerifiedBadge';

function ScrollToggle({ id, children }: { id: string; children: React.ReactNode }) {
  const [viewMode, setViewMode] = useState<'grid' | 'scroll'>('scroll');
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('scroll')}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'scroll' ? 'text-white' : ''}`}
            style={{
              backgroundColor: viewMode === 'scroll' ? 'rgb(var(--color-primary-600))' : 'transparent',
              color: viewMode === 'scroll' ? 'white' : 'rgb(var(--color-text-muted))',
            }}
            aria-label="Horizontal scroll view"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'text-white' : ''}`}
            style={{
              backgroundColor: viewMode === 'grid' ? 'rgb(var(--color-primary-600))' : 'transparent',
              color: viewMode === 'grid' ? 'white' : 'rgb(var(--color-text-muted))',
            }}
            aria-label="Grid view"
          >
            <Grid3X3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {viewMode === 'scroll' ? (
        <div className="flex gap-3 overflow-x-auto scroll-smooth pb-2" id={id}>
          {children}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {children}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: any }) {
  const price = product.discountPrice || product.basePrice;
  return (
    <Link to={`/products/${product.slug || product.id}`}
      className="group block shrink-0 w-[180px] sm:w-auto overflow-hidden rounded-xl transition-all duration-200 hover:shadow-lg"
      style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid', borderColor: 'rgb(var(--color-border))' }}>
      <div className="aspect-square overflow-hidden relative" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
        {product.images?.[0]?.url ? (
          <img src={assetUrl(product.images[0].url)} alt={product.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="grid h-full w-full place-items-center" style={{ color: 'rgb(var(--color-text-disabled))' }}><Package className="w-10 h-10" /></div>
        )}
        {product.discountPrice && (
          <span className="absolute top-2 left-2 text-white text-xs font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgb(var(--color-danger))' }}>
            -{Math.round((1 - product.discountPrice / product.basePrice) * 100)}%
          </span>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="line-clamp-2 text-xs font-medium leading-tight min-h-[2.5rem] group-hover:text-primary-600" style={{ color: 'rgb(var(--color-text))' }}>{product.title}</h3>
        <div className="mt-1.5 flex items-center gap-1 flex-wrap">
          <span className="text-xs font-bold" style={{ color: 'rgb(var(--color-primary-600))' }}>{price?.toLocaleString()} TZS</span>
          {product.discountPrice && <span className="text-[10px] line-through" style={{ color: 'rgb(var(--color-text-muted))' }}>{product.basePrice?.toLocaleString()}</span>}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {product.rating && <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'rgb(var(--color-warning))' }}><Star className="w-2.5 h-2.5 fill-current" /> {product.rating}</span>}
          {product.totalSales > 0 && <span className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>{product.totalSales} sold</span>}
        </div>
      </div>
    </Link>
  );
}

export default function UserLandingPage() {
  const { userId } = useParams<{ userId: string }>();
  const { data, isLoading } = useUserPublicProfile(userId || '');
  const { data: productsData } = useProducts({ sellerId: userId ? undefined : undefined, limit: 24, sortBy: 'createdAt', sortOrder: 'desc' });
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();
  const { data: followersData } = useFollowers(userId || '');

  const profileData = data?.data;
  const user = profileData;
  const seller = user?.seller;
  const followerCount = user?._count?.followers || 0;
  const followingCount = user?._count?.following || 0;
  const followers = followersData?.data || [];

  // Check if current user is following this profile
  const isFollowing = isAuthenticated && followers.some((f: any) => f.follower?.id === currentUser?.id);

  if (isLoading) return <SkeletonPage cards={6} columns={3} />;
  if (!user) return (
    <div className="page-container">
      <EmptyState icon={<User className="h-8 w-8" />} title="User not found" description="This user profile is unavailable." actionLabel="Home" actionHref="/" />
    </div>
  );

  return (
    <div className="min-h-screen transition-colors" style={{ backgroundColor: 'rgb(var(--color-gray-50))' }}>
      {/* User Hero Banner */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, rgb(var(--color-primary-700)), rgb(var(--color-primary-900)))` }}>
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
            <div className="flex items-center gap-5">
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-xl border-4 border-white/20 flex items-center justify-center text-3xl font-bold"
                style={{ backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-primary-600))' }}>
                {user.avatar ? (
                  <img src={assetUrl(user.avatar)} alt={user.firstName} className="h-full w-full object-cover" />
                ) : (
                  <span>{user.firstName?.[0]?.toUpperCase() || 'U'}{user.lastName?.[0]?.toUpperCase() || ''}</span>
                )}
                {(user.role === 'SELLER' || user.role === 'DELIVERY' || user.role === 'ADMIN') && seller?.isVerified && (
                  <span className="absolute -bottom-1 -right-1">
                    <VerifiedBadge size={20} />
                  </span>
                )}
              </div>
              <div className="text-white">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold">
                    {user.firstName} {user.lastName}
                  </h1>
                  {(user.role === 'SELLER' || user.role === 'DELIVERY' || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && seller?.isVerified && (
                    <VerifiedBadge size={20} />
                  )}
                  {user.role === 'SELLER' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
                      <Store className="w-3 h-3" /> Seller
                    </span>
                  )}
                  {user.role === 'DELIVERY' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
                      <Package className="w-3 h-3" /> Delivery
                    </span>
                  )}
                  {user.role === 'ADMIN' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
                      <ShieldCheck className="w-3 h-3" /> Admin
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm max-w-xl" style={{ color: 'rgb(var(--color-primary-50) / 0.8)' }}>
                  {seller?.storeDescription || user.bio || 'Marketplace user'}
                </p>
                <div className="flex flex-wrap gap-4 mt-3 text-sm">
                  {seller && (
                    <>
                      <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> {seller.rating?.toFixed?.(1) || 'New'}</span>
                      <span className="flex items-center gap-1"><Package className="w-4 h-4" /> {seller._count?.products || 0} products</span>
                      {seller.storeLocation && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {seller.storeLocation}</span>}
                    </>
                  )}
                  <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {followerCount} followers</span>
                  <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4" /> Joined {new Date(user.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Follow/Unfollow Button & Link to Store */}
            <div className="md:ml-auto flex items-center gap-3">
              {seller && (
                <Link to={`/sellers/${seller.storeSlug}`} className="px-5 py-2 rounded-full font-semibold text-sm transition-all hover:scale-105"
                  style={{ backgroundColor: 'white', color: 'rgb(var(--color-primary-700))' }}>
                  View Store <ChevronRight className="w-3.5 h-3.5 inline" />
                </Link>
              )}
              {isAuthenticated && currentUser?.id !== userId && (
                <button
                  onClick={() => isFollowing ? unfollowUser.mutate(userId!) : followUser.mutate(userId!)}
                  disabled={followUser.isPending || unfollowUser.isPending}
                  className="px-5 py-2 rounded-full font-semibold text-sm transition-all hover:scale-105"
                  style={{
                    backgroundColor: isFollowing ? 'rgba(255,255,255,0.2)' : 'white',
                    color: isFollowing ? 'white' : 'rgb(var(--color-primary-700))',
                    border: isFollowing ? '2px solid rgba(255,255,255,0.5)' : '2px solid transparent',
                  }}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
        {/* Seller Store Info */}
        {seller && (
          <section className="rounded-2xl overflow-hidden border" style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                {seller.storeLogo ? (
                  <img src={assetUrl(seller.storeLogo)} alt={seller.storeName} className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold" style={{ backgroundColor: 'rgb(var(--color-primary-100))', color: 'rgb(var(--color-primary-700))' }}>
                    {seller.storeName?.[0]}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold" style={{ color: 'rgb(var(--color-text))' }}>{seller.storeName}</h3>
                    {seller.isVerified && <VerifiedBadge size={16} />}
                  </div>
                  <Link to={`/sellers/${seller.storeSlug}`} className="text-xs" style={{ color: 'rgb(var(--color-primary-600))' }}>
                    View store &rarr;
                  </Link>
                </div>
              </div>
              {seller.storeDescription && (
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{seller.storeDescription}</p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
                <div><span className="font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>Products:</span> {seller._count?.products || 0}</div>
                <div><span className="font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>Rating:</span> {seller.rating?.toFixed(1) || 'New'}</div>
                <div><span className="font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>Orders:</span> {seller.totalOrders || 0}</div>
                <div><span className="font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>Location:</span> {seller.storeLocation || 'N/A'}</div>
              </div>
            </div>
          </section>
        )}

        {/* User Stats Bar */}
        <div className="border-b" style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-3 overflow-x-auto gap-6 text-xs">
              {[
                { icon: Users, label: 'Followers', value: String(followerCount) },
                { icon: Users, label: 'Following', value: String(followingCount) },
                ...(seller ? [
                  { icon: Star, label: 'Rating', value: seller.rating?.toFixed?.(1) || 'New' },
                  { icon: Package, label: 'Products', value: String(seller._count?.products || 0) },
                  { icon: TrendingUp, label: 'Sales', value: String(seller.totalOrders || 0) },
                ] : []),
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-2 shrink-0">
                  <stat.icon className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
                  <div className="leading-tight">
                    <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{stat.value}</p>
                    <p style={{ color: 'rgb(var(--color-text-muted))' }}>{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Products Section (for sellers) */}
        {seller && productsData?.data && productsData.data.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--color-text))' }}>Products</h2>
            </div>
            <ScrollToggle id="user-products">
              {(productsData.data || []).slice(0, 20).map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ScrollToggle>
          </section>
        )}

        {/* Followers Section */}
        {followers.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: 'rgb(var(--color-text))' }}>Followers ({followerCount})</h2>
            <div className="flex flex-wrap gap-2">
              {followers.slice(0, 20).map((f: any) => (
                <Link
                  key={f.id}
                  to={`/user/${f.follower.id}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors text-xs"
                  style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text-secondary))' }}
                >
                  {f.follower.avatar ? (
                    <img src={assetUrl(f.follower.avatar)} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                      style={{ backgroundColor: 'rgb(var(--color-primary-100))', color: 'rgb(var(--color-primary-700))' }}>
                      {f.follower.firstName?.[0] || 'U'}
                    </div>
                  )}
                  {f.follower.firstName} {f.follower.lastName}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}