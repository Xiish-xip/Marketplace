"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.health = exports.createAdminUser = exports.getAdminStats = exports.getTranslations = exports.updateSiteSettings = exports.getSiteSettings = exports.getReviews = exports.createReview = exports.getSellerProducts = exports.getSellerOrders = exports.registerSeller = exports.updateCart = exports.getCart = exports.updateOrderStatus = exports.getOrders = exports.createOrder = exports.getCategories = exports.updateProduct = exports.getProduct = exports.getProducts = exports.createProduct = exports.onUserUpdated = exports.onUserCreate = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();
// ════════════════════════════════════════════════════════════════
// AUTH TRIGGERS
// ════════════════════════════════════════════════════════════════
/** On user creation, create a Firestore user profile */
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
    const { uid, email, displayName, photoURL } = user;
    await db.collection('users').doc(uid).set({
        uid,
        email,
        displayName: displayName || '',
        photoURL: photoURL || '',
        role: 'customer',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`User profile created for ${uid}`);
});
/** Set custom claims when role is assigned in Firestore */
exports.onUserUpdated = functions.firestore
    .document('users/{userId}')
    .onWrite(async (change, context) => {
    const { userId } = context.params;
    const after = change.after?.data();
    if (!after)
        return;
    if (change.before?.data()?.role !== after.role) {
        const claims = {};
        claims[after.role] = true;
        if (after.role === 'admin')
            claims.seller = true;
        await auth.setCustomUserClaims(userId, claims);
        console.log(`Custom claims updated for ${userId}: role=${after.role}`);
    }
});
// ════════════════════════════════════════════════════════════════
// PRODUCTS
// ════════════════════════════════════════════════════════════════
exports.createProduct = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    const { title, description, price, categoryId, images, stock } = data;
    const product = {
        title,
        description,
        price: Number(price),
        categoryId,
        images: images || [],
        stock: stock ?? 0,
        sellerId: context.auth.uid,
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection('products').add(product);
    return { id: docRef.id, ...product };
});
exports.getProducts = functions.https.onCall(async (data) => {
    const { categoryId, sellerId, limit = 20, lastVisible } = data || {};
    let query = db.collection('products')
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(Math.min(limit, 50));
    if (categoryId)
        query = query.where('categoryId', '==', categoryId);
    if (sellerId)
        query = query.where('sellerId', '==', sellerId);
    if (lastVisible) {
        const lastDoc = await db.collection('products').doc(lastVisible).get();
        if (lastDoc.exists)
            query = query.startAfter(lastDoc);
    }
    const snapshot = await query.get();
    const products = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const lastDocId = snapshot.docs[snapshot.docs.length - 1]?.id || null;
    return { products, lastVisible: lastDocId };
});
exports.getProduct = functions.https.onCall(async (data) => {
    const { id } = data;
    if (!id)
        throw new functions.https.HttpsError('invalid-argument', 'Product ID required');
    const doc = await db.collection('products').doc(id).get();
    if (!doc.exists)
        throw new functions.https.HttpsError('not-found', 'Product not found');
    return { id: doc.id, ...doc.data() };
});
exports.updateProduct = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    const { id, ...updates } = data;
    if (!id)
        throw new functions.https.HttpsError('invalid-argument', 'Product ID required');
    const doc = await db.collection('products').doc(id).get();
    if (!doc.exists)
        throw new functions.https.HttpsError('not-found', 'Product not found');
    if (doc.data()?.sellerId !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'Not your product');
    }
    await db.collection('products').doc(id).update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
});
// ════════════════════════════════════════════════════════════════
// CATEGORIES
// ════════════════════════════════════════════════════════════════
exports.getCategories = functions.https.onCall(async () => {
    const snapshot = await db.collection('categories')
        .orderBy('name', 'asc')
        .get();
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
});
// ════════════════════════════════════════════════════════════════
// ORDERS
// ════════════════════════════════════════════════════════════════
exports.createOrder = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    const { items, shippingAddress, paymentMethod } = data;
    if (!items?.length)
        throw new functions.https.HttpsError('invalid-argument', 'Order must have items');
    let totalAmount = 0;
    const sellerIds = new Set();
    const orderItems = [];
    for (const item of items) {
        const productDoc = await db.collection('products').doc(item.productId).get();
        if (!productDoc.exists)
            throw new functions.https.HttpsError('not-found', `Product ${item.productId} not found`);
        const product = productDoc.data();
        const lineTotal = product.price * item.quantity;
        totalAmount += lineTotal;
        sellerIds.add(product.sellerId);
        orderItems.push({
            productId: item.productId,
            title: product.title,
            price: product.price,
            quantity: item.quantity,
            sellerId: product.sellerId,
            lineTotal,
        });
    }
    const order = {
        customerId: context.auth.uid,
        sellerIds: Array.from(sellerIds),
        items: orderItems,
        totalAmount,
        shippingAddress,
        paymentMethod,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection('orders').add(order);
    return { id: docRef.id, ...order };
});
exports.getOrders = functions.https.onCall(async (_data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    const snapshot = await db.collection('orders')
        .where('customerId', '==', context.auth.uid)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
});
exports.updateOrderStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    const { orderId, status } = data;
    if (!orderId || !status)
        throw new functions.https.HttpsError('invalid-argument', 'orderId and status required');
    await db.collection('orders').doc(orderId).update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
});
// ════════════════════════════════════════════════════════════════
// CART
// ════════════════════════════════════════════════════════════════
exports.getCart = functions.https.onCall(async (_data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    const doc = await db.collection('carts').doc(context.auth.uid).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : { items: [] };
});
exports.updateCart = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    await db.collection('carts').doc(context.auth.uid).set({
        items: data.items || [],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { success: true };
});
// ════════════════════════════════════════════════════════════════
// SELLER
// ════════════════════════════════════════════════════════════════
exports.registerSeller = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    const sellerData = {
        ...data,
        uid: context.auth.uid,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('sellers').doc(context.auth.uid).set(sellerData);
    await db.collection('users').doc(context.auth.uid).update({ role: 'seller' });
    return { success: true, id: context.auth.uid };
});
exports.getSellerOrders = functions.https.onCall(async (_data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    const snapshot = await db.collection('orders')
        .where('sellerIds', 'array-contains', context.auth.uid)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
});
exports.getSellerProducts = functions.https.onCall(async (_data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    const snapshot = await db.collection('products')
        .where('sellerId', '==', context.auth.uid)
        .orderBy('createdAt', 'desc')
        .get();
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
});
// ════════════════════════════════════════════════════════════════
// REVIEWS
// ════════════════════════════════════════════════════════════════
exports.createReview = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    const review = {
        ...data,
        userId: context.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection('reviews').add(review);
    return { id: docRef.id, ...review };
});
exports.getReviews = functions.https.onCall(async (data) => {
    const { productId, limit = 20 } = data || {};
    let query = db.collection('reviews')
        .orderBy('createdAt', 'desc')
        .limit(Math.min(limit, 50));
    if (productId)
        query = query.where('productId', '==', productId);
    const snapshot = await query.get();
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
});
// ════════════════════════════════════════════════════════════════
// SITE SETTINGS (ADMIN)
// ════════════════════════════════════════════════════════════════
exports.getSiteSettings = functions.https.onCall(async () => {
    const doc = await db.collection('siteSettings').doc('global').get();
    return doc.exists ? doc.data() : {};
});
exports.updateSiteSettings = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (userDoc.data()?.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    await db.collection('siteSettings').doc('global').set(data, { merge: true });
    return { success: true };
});
// ════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ════════════════════════════════════════════════════════════════
exports.getTranslations = functions.https.onCall(async (data) => {
    const { lang = 'en' } = data || {};
    const doc = await db.collection('translations').doc(lang).get();
    return doc.exists ? doc.data() : {};
});
// ════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD STATS
// ════════════════════════════════════════════════════════════════
exports.getAdminStats = functions.https.onCall(async (_data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (userDoc.data()?.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    const [usersSnap, productsSnap, ordersSnap, sellersSnap] = await Promise.all([
        db.collection('users').count().get(),
        db.collection('products').count().get(),
        db.collection('orders').count().get(),
        db.collection('sellers').count().get(),
    ]);
    return {
        totalUsers: usersSnap.data().count,
        totalProducts: productsSnap.data().count,
        totalOrders: ordersSnap.data().count,
        totalSellers: sellersSnap.data().count,
    };
});
// ════════════════════════════════════════════════════════════════
// CREATE ADMIN USER (call once from Firebase console / emulator)
// ════════════════════════════════════════════════════════════════
exports.createAdminUser = functions.https.onCall(async (data) => {
    const { email, password, displayName } = data;
    if (!email || !password) {
        throw new functions.https.HttpsError('invalid-argument', 'Email and password required');
    }
    const user = await auth.createUser({ email, password, displayName });
    await auth.setCustomUserClaims(user.uid, { admin: true, seller: true });
    await db.collection('users').doc(user.uid).set({
        uid: user.uid,
        email,
        displayName: displayName || 'Admin',
        role: 'admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { uid: user.uid, email };
});
// ════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ════════════════════════════════════════════════════════════════
exports.health = functions.https.onRequest(async (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        project: 'marketplace-9d6f2',
        version: '1.0.0',
    });
});
//# sourceMappingURL=index.js.map