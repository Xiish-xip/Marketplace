import React from 'react';
import { CurrencyProvider } from './lib/currency-context';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { usePublicConfig } from './lib/query-hooks';
import ErrorBoundary from './components/ErrorBoundary';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import { ConfirmProvider } from './components/ConfirmDialog';
import { ToastProvider } from './lib/toast-context';
import './index.css';

// Layouts
import Layout from './features/shared/Layout';
import { SkeletonPage } from './components/Skeleton';
import NotFoundPage from './features/shared/NotFoundPage';

// Auth pages
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';

// Customer pages
import HomePage from './features/customer/HomePage';
import ProductListPage from './features/customer/ProductListPage';
import ProductDetailPage from './features/customer/ProductDetailPage';
import CartPage from './features/customer/CartPage';
import CheckoutPage from './features/customer/CheckoutPage';
import OrderHistoryPage from './features/customer/OrderHistoryPage';
import CustomerDashboard from './features/customer/CustomerDashboard';
import CustomerLayout from './features/customer/CustomerLayout';
import CustomerSettings from './features/customer/CustomerSettings';
import CustomerNotifications from './features/customer/CustomerNotifications';
import CustomerPayments from './features/customer/CustomerPayments';
import SubscriptionList from './features/customer/SubscriptionList';
import LoyaltyDashboard from './features/customer/LoyaltyDashboard';
import B2BDashboard from './features/customer/B2BDashboard';
import ReferralDashboard from './features/customer/ReferralDashboard';
import SellerStorePage from './features/customer/SellerStorePage';
import UserLandingPage from './features/customer/UserLandingPage';
import ProfilePage from './features/customer/ProfilePage';
import WishlistPage from './features/customer/WishlistPage';
import BecomeSellerPage from './features/customer/BecomeSellerPage';
import SellerQA from './features/seller/SellerQA';
import AIChatPage from './features/customer/AIChatPage';
import PublicPage from './features/customer/PublicPage';
import DynamicPageJsonRenderer from './features/page-builder/DynamicPageJsonRenderer';
import OrderTrackingPage from './features/customer/OrderTrackingPage';

// Seller pages
const SellerDashboard = React.lazy(() => import('./features/seller/SellerDashboard'));
const SellerLayout = React.lazy(() => import('./features/seller/SellerLayout'));
const SellerProducts = React.lazy(() => import('./features/seller/SellerProducts'));
const SellerOrders = React.lazy(() => import('./features/seller/SellerOrders'));
const SellerPayouts = React.lazy(() => import('./features/seller/SellerPayouts'));
const SellerAnalytics = React.lazy(() => import('./features/seller/SellerAnalytics'));
const SellerReviews = React.lazy(() => import('./features/seller/SellerReviews'));
const SellerDeliveries = React.lazy(() => import('./features/seller/SellerDeliveries'));
const SellerDropshipping = React.lazy(() => import('./features/seller/SellerDropshipping'));
const SupplierPortal = React.lazy(() => import('./features/supplier/SupplierPortal'));

// Admin pages
const AdminLayout = React.lazy(() => import('./features/admin/AdminLayout'));
const AdminDashboard = React.lazy(() => import('./features/admin/AdminDashboard'));
const AdminUsers = React.lazy(() => import('./features/admin/AdminUsers'));
const AdminProducts = React.lazy(() => import('./features/admin/AdminProducts'));
const AdminCategories = React.lazy(() => import('./features/admin/AdminCategories'));
const AdminConfig = React.lazy(() => import('./features/admin/AdminConfig'));
const AdminBlog = React.lazy(() => import('./features/admin/AdminBlog'));
const AdminRoles = React.lazy(() => import('./features/admin/AdminRoles'));
const AdminTickets = React.lazy(() => import('./features/admin/AdminTickets'));
const AdminAnnouncements = React.lazy(() => import('./features/admin/AdminAnnouncements'));
const AdminApiKeys = React.lazy(() => import('./features/admin/AdminApiKeys'));
const AdminPlugins = React.lazy(() => import('./features/admin/AdminPlugins'));
const AdminGiftCards = React.lazy(() => import('./features/admin/AdminGiftCards'));
const AdminChatbot = React.lazy(() => import('./features/admin/AdminChatbot'));
const AdminVoiceConfig = React.lazy(() => import('./features/admin/AdminVoiceConfig'));
const AdminWorkflows = React.lazy(() => import('./features/admin/AdminWorkflows'));
const AdminAiConfig = React.lazy(() => import('./features/admin/AdminAiConfig'));
const AdminAiProviders = React.lazy(() => import('./features/admin/AdminAiProviders'));
const AdminAiToolRegistry = React.lazy(() => import('./features/admin/AdminAiToolRegistry'));
const AdminPages = React.lazy(() => import('./features/admin/AdminPages'));
const AIContentEditor = React.lazy(() => import('./features/admin/AIContentEditor'));
const AdminPageBuilder = React.lazy(() => import('./features/admin/AdminPageBuilder'));
const AdminTemplateManager = React.lazy(() => import('./features/admin/AdminTemplateManager'));
const AdminAssets = React.lazy(() => import('./features/admin/AdminAssets'));
const AdminDeliveryDashboard = React.lazy(() => import('./features/admin/AdminDeliveryDashboard'));
const AdminOrders = React.lazy(() => import('./features/admin/AdminOrders'));
const AdminReturns = React.lazy(() => import('./features/admin/AdminReturns'));
const AdminPromotions = React.lazy(() => import('./features/admin/AdminPromotions'));
const AdminBrands = React.lazy(() => import('./features/admin/AdminBrands'));
const AdminShipping = React.lazy(() => import('./features/admin/AdminShipping'));
const AdminReviews = React.lazy(() => import('./features/admin/AdminReviews'));
const AdminSellers = React.lazy(() => import('./features/admin/AdminSellers'));
const AdminPayments = React.lazy(() => import('./features/admin/AdminPayments'));
const AdminWebhooks = React.lazy(() => import('./features/admin/AdminWebhooks'));
const AdminCurrencies = React.lazy(() => import('./features/admin/AdminCurrencies'));
const AdminSearchConfig = React.lazy(() => import('./features/admin/AdminSearchConfig'));
const AdminCacheManager = React.lazy(() => import('./features/admin/AdminCacheManager'));
const AdminDropshipping = React.lazy(() => import('./features/admin/AdminUnifiedDropshipping'));
const AdminSubscriptions = React.lazy(() => import('./features/admin/AdminSubscriptions'));
const AdminLoyalty = React.lazy(() => import('./features/admin/AdminLoyalty'));
const AdminB2B = React.lazy(() => import('./features/admin/AdminB2B'));
const AdminAnalyticsDashboard = React.lazy(() => import('./features/admin/AdminAnalyticsDashboard'));
const AdminIntegrations = React.lazy(() => import('./features/admin/AdminIntegrations'));
const AdminSyncJobs = React.lazy(() => import('./features/admin/AdminSyncJobs'));
const AdminBadgeManager = React.lazy(() => import('./features/admin/AdminBadgeManager'));
const AdminAssetGroups = React.lazy(() => import('./features/admin/AdminAssetGroups'));
const AdminGenericSettings = React.lazy(() => import('./features/admin/AdminGenericSettings'));
const AdminCurrencySettings = React.lazy(() => import('./features/admin/AdminCurrencySettings'));
const AdminSiteSettings = React.lazy(() => import('./features/admin/AdminSiteSettings'));
const AdminTranslations = React.lazy(() => import('./features/admin/AdminTranslations'));
const AdminCampaigns = React.lazy(() => import('./features/admin/AdminCampaigns'));
const AdminUnifiedAuditLog = React.lazy(() => import('./features/admin/AdminUnifiedAuditLog'));
const AdminCJDropshipping = React.lazy(() => import('./features/admin/AdminCJDropshipping'));

// Delivery pages
const DeliveryLayout = React.lazy(() => import('./features/delivery/DeliveryLayout'));
const DeliveryDashboard = React.lazy(() => import('./features/delivery/DeliveryDashboard'));

// Wrapper that extracts slug from URL and renders DynamicPageJsonRenderer
function DynamicPageJsonRendererWrapper() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) return <Navigate to="/" replace />;
  return <DynamicPageJsonRenderer slug={slug} fallback={<PublicPage />} />;
}

function App() {
  const { isLoading } = usePublicConfig();

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <SkeletonPage cards={4} columns={2} className="min-h-screen px-4 py-6" />
      </div>
    );
  }

  return (
    <CurrencyProvider>
      <ToastProvider>
        <ConfirmProvider>
          <ErrorBoundary title="The app could not render this page">
            <div className="min-h-screen">
              <React.Suspense fallback={<SkeletonPage cards={3} columns={2} className="min-h-screen px-4 py-6" />}>
        <Routes>
        {/* Public routes (no sidebar, full page) */}
        <Route element={<RouteErrorBoundary title="This public page could not render"><Layout /></RouteErrorBoundary>}>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route path="/sellers/:sellerId" element={<SellerStorePage />} />
          <Route path="/user/:userId" element={<UserLandingPage />} />
          <Route path="/page/:slug" element={<DynamicPageJsonRendererWrapper />} />
          <Route path="/become-seller" element={<BecomeSellerPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/ai-chat" element={<AIChatPage />} />

          {/* Auth-protected routes (cart, checkout, wishlist) */}
          <Route path="/cart" element={<RouteErrorBoundary title="Your cart could not render"><CustomerLayout /></RouteErrorBoundary>}>
            <Route index element={<CartPage />} />
          </Route>
          <Route path="/checkout" element={<RouteErrorBoundary title="Checkout could not render"><CustomerLayout /></RouteErrorBoundary>}>
            <Route index element={<CheckoutPage />} />
          </Route>
          <Route path="/wishlist" element={<RouteErrorBoundary title="Your wishlist could not render"><CustomerLayout /></RouteErrorBoundary>}>
            <Route index element={<WishlistPage />} />
          </Route>

          {/* Customer Center (sidebar via CustomerLayout) */}
          <Route path="/account" element={<RouteErrorBoundary title="Account pages could not render"><CustomerLayout /></RouteErrorBoundary>}>
            <Route index element={<CustomerDashboard />} />
            <Route path="orders" element={<OrderHistoryPage />} />
            <Route path="orders/:orderId/tracking" element={<OrderTrackingPage />} />
            <Route path="subscriptions" element={<SubscriptionList />} />
            <Route path="loyalty" element={<LoyaltyDashboard />} />
            <Route path="b2b" element={<B2BDashboard />} />
            <Route path="referrals" element={<ReferralDashboard />} />
            <Route path="notifications" element={<CustomerNotifications />} />
            <Route path="payments" element={<CustomerPayments />} />
            <Route path="settings" element={<CustomerSettings />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="ai" element={<AIChatPage />} />
          </Route>

          {/* Seller Center (sidebar via SellerLayout) */}
          <Route path="/seller" element={<RouteErrorBoundary title="Seller center could not render"><SellerLayout /></RouteErrorBoundary>}>
            <Route index element={<SellerDashboard />} />
            <Route path="products" element={<SellerProducts />} />
            <Route path="orders" element={<SellerOrders />} />
            <Route path="deliveries" element={<SellerDeliveries />} />
            <Route path="payouts" element={<SellerPayouts />} />
            <Route path="analytics" element={<SellerAnalytics />} />
            <Route path="reviews" element={<SellerReviews />} />
            <Route path="qa" element={<SellerQA />} />
            <Route path="dropshipping" element={<SellerDropshipping />} />
            <Route path="supplier-portal" element={<SupplierPortal />} />
            <Route path="settings" element={<CustomerSettings />} />
          </Route>

          {/* Admin Panel (sidebar via AdminLayout) */}
          <Route path="/admin" element={<RouteErrorBoundary title="Admin panel could not render"><AdminLayout /></RouteErrorBoundary>}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="config" element={<AdminConfig />} />
            <Route path="blog" element={<AdminBlog />} />
            <Route path="roles" element={<AdminRoles />} />
            <Route path="tickets" element={<AdminTickets />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="api-keys" element={<AdminApiKeys />} />
            <Route path="plugins" element={<AdminPlugins />} />
            <Route path="giftcards" element={<AdminGiftCards />} />
            <Route path="chatbot" element={<AdminChatbot />} />
            <Route path="voice" element={<AdminVoiceConfig />} />
            <Route path="workflows" element={<AdminWorkflows />} />
            <Route path="ai-config" element={<AdminAiConfig />} />
            <Route path="ai-providers" element={<AdminAiProviders />} />
            <Route path="ai-tools" element={<AdminAiToolRegistry />} />
            <Route path="pages" element={<AdminPages />} />
            <Route path="audit-logs" element={<AdminUnifiedAuditLog />} />
            <Route path="ai-content-editor" element={<AIContentEditor />} />
            <Route path="page-builder" element={<AdminPageBuilder />} />
            <Route path="page-builder/:id" element={<AdminPageBuilder />} />
            <Route path="page-builder/templates" element={<AdminTemplateManager />} />
            <Route path="assets" element={<AdminAssets />} />
            {/* Commerce routes */}
            <Route path="orders" element={<AdminOrders />} />
            <Route path="returns" element={<AdminReturns />} />
            <Route path="promotions" element={<AdminPromotions />} />
            <Route path="brands" element={<AdminBrands />} />
            <Route path="shipping" element={<AdminShipping />} />
            <Route path="deliveries" element={<AdminDeliveryDashboard />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="sellers" element={<AdminSellers />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="webhooks" element={<AdminWebhooks />} />
            {/* Platform config module routes */}
            <Route path="currencies" element={<AdminCurrencies />} />
            <Route path="search" element={<AdminSearchConfig />} />
            <Route path="cache" element={<AdminCacheManager />} />
            <Route path="dropshipping" element={<AdminDropshipping />} />
            <Route path="subscriptions" element={<AdminSubscriptions />} />
            <Route path="loyalty" element={<AdminLoyalty />} />
            <Route path="b2b" element={<AdminB2B />} />
            <Route path="analytics" element={<AdminAnalyticsDashboard />} />
            <Route path="integrations" element={<AdminIntegrations />} />
            <Route path="sync-jobs" element={<AdminSyncJobs />} />
            <Route path="asset-groups" element={<AdminAssetGroups />} />
            <Route path="generic-settings" element={<AdminGenericSettings />} />
            <Route path="generic-settings/:module" element={<AdminGenericSettings />} />
            <Route path="badges" element={<AdminBadgeManager />} />
            <Route path="currency-settings" element={<AdminCurrencySettings />} />
            <Route path="site-settings" element={<AdminSiteSettings />} />
            <Route path="translations" element={<AdminTranslations />} />
            <Route path="campaigns" element={<AdminCampaigns />} />
            <Route path="cj-dropshipping" element={<AdminCJDropshipping />} />
            <Route path="ai-audit-log" element={<Navigate to="/admin/audit-logs" replace />} />
          </Route>

          {/* Delivery Center */}
          <Route path="/delivery" element={<RouteErrorBoundary title="Delivery center could not render"><DeliveryLayout /></RouteErrorBoundary>}>
            <Route index element={<DeliveryDashboard />} />
          </Route>
        </Route>

        {/* Old flat routes — redirect to new structure */}
        <Route path="/orders" element={<Navigate to="/account/orders" replace />} />
        <Route path="/notifications" element={<Navigate to="/account/notifications" replace />} />
        <Route path="/payments" element={<Navigate to="/account/payments" replace />} />
        <Route path="/dashboard" element={<Navigate to="/account" replace />} />
        <Route path="/settings" element={<Navigate to="/account/settings" replace />} />
        <Route path="/profile" element={<Navigate to="/account/profile" replace />} />
        <Route path="/supplier-portal" element={<Navigate to="/seller/supplier-portal" replace />} />

        {/* Catch-all */}
        <Route element={<RouteErrorBoundary title="This page could not render"><Layout /></RouteErrorBoundary>}>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        </Routes>
              </React.Suspense>
            </div>
          </ErrorBoundary>
        </ConfirmProvider>
      </ToastProvider>
    </CurrencyProvider>
  );
}

export default App;
