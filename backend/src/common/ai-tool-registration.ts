import { AIToolsService } from '../modules/chat/ai-tools.service';
import { aiToolRegistry } from '../modules/ai/ai-tool-registry.service';
import { logger } from './logger';

/**
 * Registers all built-in AI tool handlers.
 * Extracted from index.ts to keep the server entry point clean.
 */
export async function registerAiToolHandlers(): Promise<void> {
  try {
    const aiToolsService = new AIToolsService();
    const handlerMap = new Map<string, (args: any, userId: string) => Promise<any>>();

    // Customer tools
    handlerMap.set('search_products', (args, _userId) => aiToolsService.searchProducts(args.query, args.limit));
    handlerMap.set('get_product', (args, _userId) => aiToolsService.getProductBySlug(args.slug));
    handlerMap.set('list_categories', (_args, _userId) => aiToolsService.listCategories());
    handlerMap.set('get_cart', (_args, userId) => aiToolsService.getCart(userId));
    handlerMap.set('add_to_cart', (args, userId) => aiToolsService.addToCart(userId, args.productId, args.variantId, args.quantity));
    handlerMap.set('remove_from_cart', (args, userId) => aiToolsService.removeFromCart(userId, args.itemId));
    handlerMap.set('update_cart_item', (args, userId) => aiToolsService.updateCartItem(userId, args.itemId, args.quantity));
    handlerMap.set('clear_cart', (_args, userId) => aiToolsService.clearCart(userId));
    handlerMap.set('get_wishlist', (_args, userId) => aiToolsService.getWishlist(userId));
    handlerMap.set('add_to_wishlist', (args, userId) => aiToolsService.addToWishlist(userId, args.productId));
    handlerMap.set('remove_from_wishlist', (args, userId) => aiToolsService.removeFromWishlist(userId, args.productId));
    handlerMap.set('get_orders', (args, userId) => aiToolsService.getUserOrders(userId, args.limit, args.status));
    handlerMap.set('get_order_detail', (args, userId) => aiToolsService.getOrderDetail(userId, args.orderId));
    handlerMap.set('get_featured', (args, _userId) => aiToolsService.getFeaturedProducts(args.limit));
    handlerMap.set('get_platform_stats', (_args, _userId) => aiToolsService.getPlatformStats());
    handlerMap.set('get_navigation_links', (args, _userId) => aiToolsService.getNavigationLinks(args.role));

    // Seller tools
    handlerMap.set('get_seller_profile', (_args, userId) => aiToolsService.getSellerProfile(userId));
    handlerMap.set('update_seller_profile', (args, userId) => aiToolsService.updateSellerProfile(userId, args));
    handlerMap.set('get_seller_products', (args, userId) => aiToolsService.getSellerProducts(userId, args.query, args.status, args.limit, args.page));
    handlerMap.set('create_product', (args, userId) => aiToolsService.createProduct(userId, args));
    handlerMap.set('update_product', (args, userId) => aiToolsService.updateProduct(userId, args.productId, args));
    handlerMap.set('get_seller_orders', (args, userId) => aiToolsService.getSellerOrders(userId, args.status, args.limit, args.page));
    handlerMap.set('update_order_status', (args, userId) => aiToolsService.updateOrderStatus(userId, args.orderId, args.status));
    handlerMap.set('get_seller_analytics', (args, userId) => aiToolsService.getSellerAnalytics(userId, args.period));
    handlerMap.set('submit_kyc', (args, userId) => aiToolsService.submitKyc(userId, args));

    // Admin tools
    handlerMap.set('get_admin_dashboard', (_args, _userId) => aiToolsService.getAdminDashboard());
    handlerMap.set('list_orders', (args, _userId) => aiToolsService.listOrders(args.search, args.status, args.limit, args.page));
    handlerMap.set('list_users', (args, _userId) => aiToolsService.listUsers(args.search, args.role, args.limit, args.page));
    handlerMap.set('toggle_user_status', (args, _userId) => aiToolsService.toggleUserStatus(args.userId));
    handlerMap.set('verify_seller', (args, _userId) => aiToolsService.verifySeller(args.sellerId));
    handlerMap.set('reject_seller', (args, _userId) => aiToolsService.rejectSeller(args.sellerId, args.reason));
    handlerMap.set('list_roles', (_args, _userId) => aiToolsService.listRoles());
    handlerMap.set('create_role', (args, _userId) => aiToolsService.createRole(args));
    handlerMap.set('get_config', (args, _userId) => aiToolsService.getConfig(args.key));
    handlerMap.set('update_config', (args, _userId) => aiToolsService.updateConfig(args.key, args.value));
    handlerMap.set('get_themes', (_args, _userId) => aiToolsService.getThemes());
    handlerMap.set('set_theme', (args, _userId) => aiToolsService.setTheme(args.theme));
    handlerMap.set('set_theme_mode', (args, _userId) => aiToolsService.setThemeMode(args.mode));
    handlerMap.set('get_promotion_placements', (_args, _userId) => aiToolsService.getPromotionPlacements());
    handlerMap.set('list_pages', (args, _userId) => aiToolsService.listPages(args.search));
    handlerMap.set('update_page', (args, _userId) => aiToolsService.updatePage(args.key, args.content));
    handlerMap.set('update_page_section', (args, _userId) => aiToolsService.updatePageSection(args.key, args.section, args.content));
    handlerMap.set('delete_page_section', (args, _userId) => aiToolsService.deletePageSection(args.key, args.section));
    handlerMap.set('search_content', (args, _userId) => aiToolsService.searchContent(args.query));
    handlerMap.set('get_blog_post', (args, _userId) => aiToolsService.getBlogPost(args.slug));
    handlerMap.set('update_blog_post', (args, _userId) => aiToolsService.updateBlogPost(args.postId, args));
    handlerMap.set('generate_content', (args, _userId) => aiToolsService.generateContent(args.prompt, args.length));
    handlerMap.set('list_plugins', (_args, _userId) => aiToolsService.listPlugins());
    handlerMap.set('toggle_plugin', (args, _userId) => aiToolsService.togglePlugin(args.pluginId, args.enabled));
    handlerMap.set('list_announcements', (_args, _userId) => aiToolsService.listAnnouncements());
    handlerMap.set('create_announcement', (args, _userId) => aiToolsService.createAnnouncement(args));
    handlerMap.set('get_analytics_summary', (args, _userId) => aiToolsService.getAnalyticsSummary(args.period));
    handlerMap.set('get_audit_logs', (args, _userId) => aiToolsService.getAuditLogs(args.search, args.page, args.limit));
    handlerMap.set('generate_orders_report', (args, _userId) => aiToolsService.generateOrdersReport(args.format, args.period, args.status));
    handlerMap.set('generate_users_report', (args, _userId) => aiToolsService.generateUsersReport(args.format, args.role));
    handlerMap.set('get_tickets', (args, _userId) => aiToolsService.getTickets(args.status, args.limit));
    handlerMap.set('update_ticket_status', (args, _userId) => aiToolsService.updateTicketStatus(args.ticketId, args.status));
    handlerMap.set('get_workflows', (_args, _userId) => aiToolsService.getWorkflows());
    handlerMap.set('toggle_workflow', (args, _userId) => aiToolsService.toggleWorkflow(args.workflowId));
    handlerMap.set('create_workflow', (args, _userId) => aiToolsService.createWorkflow(args));
    handlerMap.set('get_active_orders_count', (_args, _userId) => aiToolsService.getActiveOrdersCount());
    handlerMap.set('list_active_products', (_args, _userId) => aiToolsService.listActiveProducts());
    handlerMap.set('create_support_ticket', (args, userId) => aiToolsService.createSupportTicket(args.userIdOrEmail, args.subject, args.description));
    handlerMap.set('update_product_stock', (args, _userId) => aiToolsService.updateProductStock(args.productId, args.stock));
    handlerMap.set('update_user_role', (args, _userId) => aiToolsService.updateUserRole(args.userId, args.role));

    aiToolRegistry.registerBuiltinHandlers(handlerMap);
    logger.info(`Registered ${handlerMap.size} AI tool built-in handlers`);
  } catch (error) {
    logger.error('Failed to register AI tool handlers', { error: (error as Error).message });
  }
}