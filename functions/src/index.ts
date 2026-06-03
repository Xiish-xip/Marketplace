import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

// ════════════════════════════════════════════════════════════════
// AUTH TRIGGERS
// ════════════════════════════════════════════════════════════════

/** On user creation, create a Firestore user profile */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
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
export const onUserUpdated = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const { userId } = context.params;
    const after = change.after?.data();
    if (!after) return;
    
    if (change.before?.data()?.role !== after.role) {
      const claims: Record<string, boolean> = {};
      claims[after.role] = true;
      if (after.role === 'admin') claims.seller = true;
      await auth.setCustomUserClaims(userId, claims);
      console.log(`Custom claims updated for ${userId}: role=${after.role}`);
    }
  });

// ════════════════════════════════════════════════════════════════
// PRODUCTS
// ════════════════════════════════════════════════════════════════

export const createProduct = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  
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

export const getProducts = functions.https.onCall(async (data) => {
  const { categoryId, sellerId, limit = 20, lastVisible } = data || {};
  
  let query: FirebaseFirestore.Query = db.collection('products')
    .where('status', '==', 'active')
    .orderBy('createdAt', 'desc')
    .limit(Math.min(limit, 50));
  
  if (categoryId) query = query.where('categoryId', '==', categoryId);
  if (sellerId) query = query.where('sellerId', '==', sellerId);
  if (lastVisible) {
    const lastDoc = await db.collection('products').doc(lastVisible).get();
    if (lastDoc.exists) query = query.startAfter(lastDoc);
  }
  
  const snapshot = await query.get();
  const products = snapshot.docs.map(d => ({ id: d.id, ...d.data() as object }));
  const lastDocId = snapshot.docs[snapshot.docs.length - 1]?.id || null;
  
  return { products, lastVisible: lastDocId };
});

export const getProduct = functions.https.onCall(async (data) => {
  const { id } = data;
  if (!id) throw new functions.https.HttpsError('invalid-argument', 'Product ID required');
  
  const doc = await db.collection('products').doc(id).get();
  if (!doc.exists) throw new functions.https.HttpsError('not-found', 'Product not found');
  return { id: doc.id, ...doc.data() as object };
});

export const updateProduct = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const { id, ...updates } = data;
  if (!id) throw new functions.https.HttpsError('invalid-argument', 'Product ID required');
  
  const doc = await db.collection('products').doc(id).get();
  if (!doc.exists) throw new functions.https.HttpsError('not-found', 'Product not found');
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

export const getCategories = functions.https.onCall(async () => {
  const snapshot = await db.collection('categories')
    .orderBy('name', 'asc')
    .get();
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() as object }));
});

// ════════════════════════════════════════════════════════════════
// ORDERS
// ════════════════════════════════════════════════════════════════

export const createOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  
  const { items, shippingAddress, paymentMethod } = data;
  if (!items?.length) throw new functions.https.HttpsError('invalid-argument', 'Order must have items');
  
  let totalAmount = 0;
  const sellerIds = new Set<string>();
  const orderItems: any[] = [];
  
  for (const item of items) {
    const productDoc = await db.collection('products').doc(item.productId).get();
    if (!productDoc.exists) throw new functions.https.HttpsError('not-found', `Product ${item.productId} not found`);
    const product = productDoc.data()!;
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

export const getOrders = functions.https.onCall(async (_data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  
  const snapshot = await db.collection('orders')
    .where('customerId', '==', context.auth.uid)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() as object }));
});

export const updateOrderStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const { orderId, status } = data;
  if (!orderId || !status) throw new functions.https.HttpsError('invalid-argument', 'orderId and status required');
  
  await db.collection('orders').doc(orderId).update({
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  return { success: true };
});

// ════════════════════════════════════════════════════════════════
// CART
// ════════════════════════════════════════════════════════════════

export const getCart = functions.https.onCall(async (_data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  
  const doc = await db.collection('carts').doc(context.auth.uid).get();
  return doc.exists ? { id: doc.id, ...doc.data() as object } : { items: [] };
});

export const updateCart = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  
  await db.collection('carts').doc(context.auth.uid).set({
    items: data.items || [],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  
  return { success: true };
});

// ════════════════════════════════════════════════════════════════
// SELLER
// ════════════════════════════════════════════════════════════════

export const registerSeller = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  
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

export const getSellerOrders = functions.https.onCall(async (_data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  
  const snapshot = await db.collection('orders')
    .where('sellerIds', 'array-contains', context.auth.uid)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() as object }));
});

export const getSellerProducts = functions.https.onCall(async (_data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  
  const snapshot = await db.collection('products')
    .where('sellerId', '==', context.auth.uid)
    .orderBy('createdAt', 'desc')
    .get();
  
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() as object }));
});

// ════════════════════════════════════════════════════════════════
// REVIEWS
// ════════════════════════════════════════════════════════════════

export const createReview = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  
  const review = {
    ...data,
    userId: context.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  
  const docRef = await db.collection('reviews').add(review);
  return { id: docRef.id, ...review };
});

export const getReviews = functions.https.onCall(async (data) => {
  const { productId, limit = 20 } = data || {};
  
  let query: FirebaseFirestore.Query = db.collection('reviews')
    .orderBy('createdAt', 'desc')
    .limit(Math.min(limit, 50));
  
  if (productId) query = query.where('productId', '==', productId);
  
  const snapshot = await query.get();
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() as object }));
});

// ════════════════════════════════════════════════════════════════
// SITE SETTINGS (ADMIN)
// ════════════════════════════════════════════════════════════════

export const getSiteSettings = functions.https.onCall(async () => {
  const doc = await db.collection('siteSettings').doc('global').get();
  return doc.exists ? doc.data() : {};
});

export const updateSiteSettings = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  
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

export const getTranslations = functions.https.onCall(async (data) => {
  const { lang = 'en' } = data || {};
  const doc = await db.collection('translations').doc(lang).get();
  return doc.exists ? doc.data() : {};
});

// ════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD STATS
// ════════════════════════════════════════════════════════════════

export const getAdminStats = functions.https.onCall(async (_data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
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

export const createAdminUser = functions.https.onCall(async (data) => {
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

export const health = functions.https.onRequest(async (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    project: 'marketplace-9d6f2',
    version: '1.0.0',
  });
});