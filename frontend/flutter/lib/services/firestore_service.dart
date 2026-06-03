import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class FirestoreService extends ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Stream<QuerySnapshot> getProducts({
    String? categoryId,
    String? sellerId,
    int limit = 20,
  }) {
    Query query = _firestore
        .collection('products')
        .where('status', isEqualTo: 'active')
        .orderBy('createdAt', descending: true)
        .limit(limit);
    if (categoryId != null)
      query = query.where('categoryId', isEqualTo: categoryId);
    if (sellerId != null) query = query.where('sellerId', isEqualTo: sellerId);
    return query.snapshots();
  }

  Future<DocumentSnapshot> getProduct(String id) =>
      _firestore.collection('products').doc(id).get();
  Future<void> createProduct(Map<String, dynamic> p) =>
      _firestore.collection('products').add(p);
  Stream<QuerySnapshot> getCategories() =>
      _firestore.collection('categories').orderBy('name').snapshots();
  Stream<DocumentSnapshot> getCart(String userId) =>
      _firestore.collection('carts').doc(userId).snapshots();

  Future<void> updateCart(String userId, List<Map<String, dynamic>> items) =>
      _firestore.collection('carts').doc(userId).set({
        'items': items,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

  Stream<QuerySnapshot> getReviews(String productId) => _firestore
      .collection('reviews')
      .where('productId', isEqualTo: productId)
      .orderBy('createdAt', descending: true)
      .snapshots();
  Future<DocumentReference> createReview(Map<String, dynamic> r) =>
      _firestore.collection('reviews').add(r);
  Future<DocumentSnapshot> getSiteSettings() =>
      _firestore.collection('siteSettings').doc('global').get();
}
