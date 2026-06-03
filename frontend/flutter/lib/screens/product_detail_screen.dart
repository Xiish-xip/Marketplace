import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/catalog.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';

class ProductDetailScreen extends StatelessWidget {
  final String productId;
  const ProductDetailScreen({super.key, required this.productId});

  @override
  Widget build(BuildContext context) {
    final firestore = context.read<FirestoreService>();
    return Scaffold(
      appBar: AppBar(title: const Text('Product Details')),
      body: FutureBuilder<DocumentSnapshot>(
        future: firestore.getProduct(productId),
        builder: (context, snapshot) {
          final fallback = fallbackProductById(productId);
          if (!snapshot.hasData && fallback == null)
            return const Center(child: CircularProgressIndicator());
          final product =
              _productFromSnapshot(snapshot) ??
              fallback ??
              fallbackProducts.first;
          return SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: double.infinity,
                  height: 320,
                  child: product.primaryImage.isEmpty
                      ? const ColoredBox(
                          color: Color(0xFFE5E7EB),
                          child: Icon(Icons.image_outlined, size: 64),
                        )
                      : Image.network(
                          product.primaryImage,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const ColoredBox(
                            color: Color(0xFFE5E7EB),
                            child: Icon(Icons.image_outlined, size: 64),
                          ),
                        ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          Chip(label: Text(product.badge)),
                          Chip(
                            avatar: const Icon(
                              Icons.star,
                              size: 16,
                              color: Color(0xFFF59E0B),
                            ),
                            label: Text(
                              '${product.rating.toStringAsFixed(1)} rating',
                            ),
                          ),
                          Chip(label: Text('${product.orders} orders')),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        product.title,
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        product.priceLabel,
                        style: Theme.of(context).textTheme.headlineMedium
                            ?.copyWith(
                              color: Theme.of(context).colorScheme.primary,
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        product.description,
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                      const SizedBox(height: 16),
                      _SellerPanel(product: product),
                      const SizedBox(height: 32),
                      Consumer<AuthService>(
                        builder: (_, auth, __) {
                          return SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              onPressed: auth.isLoggedIn
                                  ? () => _addToCart(context, product)
                                  : () =>
                                        Navigator.pushNamed(context, '/login'),
                              icon: const Icon(Icons.shopping_bag_outlined),
                              label: Text(
                                auth.isLoggedIn
                                    ? 'Add to Cart'
                                    : 'Login to Purchase',
                              ),
                              style: ElevatedButton.styleFrom(
                                minimumSize: const Size(double.infinity, 52),
                              ),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  CatalogProduct? _productFromSnapshot(
    AsyncSnapshot<DocumentSnapshot> snapshot,
  ) {
    if (!snapshot.hasData || snapshot.hasError || !snapshot.data!.exists)
      return null;
    final data = snapshot.data!.data() as Map<String, dynamic>? ?? {};
    return CatalogProduct.fromMap(snapshot.data!.id, data);
  }

  Future<void> _addToCart(BuildContext context, CatalogProduct product) async {
    final auth = context.read<AuthService>();
    final firestore = context.read<FirestoreService>();
    if (auth.user == null) return;

    final cartDoc = await FirebaseFirestore.instance
        .collection('carts')
        .doc(auth.user!.uid)
        .get();
    final cartData = cartDoc.data();
    final items = List<Map<String, dynamic>>.from(cartData?['items'] ?? []);

    final existingIndex = items.indexWhere((i) => i['productId'] == product.id);
    if (existingIndex >= 0) {
      items[existingIndex]['quantity'] =
          ((items[existingIndex]['quantity'] as num?) ?? 0).toInt() + 1;
    } else {
      items.add({
        'productId': product.id,
        'title': product.title,
        'price': product.price,
        'quantity': 1,
        'image': product.primaryImage,
      });
    }

    await firestore.updateCart(auth.user!.uid, items);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Added to cart'),
          duration: Duration(seconds: 1),
        ),
      );
    }
  }
}

class _SellerPanel extends StatelessWidget {
  const _SellerPanel({required this.product});

  final CatalogProduct product;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              CircleAvatar(
                backgroundColor: colors.secondaryContainer,
                foregroundColor: colors.onSecondaryContainer,
                child: const Icon(Icons.storefront_outlined),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.sellerName,
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      product.shipLabel,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              Text(
                '${product.stock} in stock',
                style: Theme.of(context).textTheme.labelLarge,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
