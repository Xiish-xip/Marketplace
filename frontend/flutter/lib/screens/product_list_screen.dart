import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/catalog.dart';
import '../services/firestore_service.dart';

class ProductListScreen extends StatelessWidget {
  final String? categoryId;
  final String? sellerId;
  const ProductListScreen({super.key, this.categoryId, this.sellerId});

  @override
  Widget build(BuildContext context) {
    final firestore = context.read<FirestoreService>();
    final title = sellerId != null
        ? 'Seller products'
        : categoryId == null
        ? 'Products'
        : fallbackCategories
              .firstWhere(
                (category) => category.id == categoryId,
                orElse: () => const CatalogCategory(
                  id: 'products',
                  name: 'Products',
                  subtitle: '',
                ),
              )
              .name;
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: StreamBuilder<QuerySnapshot>(
        stream: firestore.getProducts(
          categoryId: categoryId,
          sellerId: sellerId,
          limit: 40,
        ),
        builder: (context, snapshot) {
          final products = _productsFromSnapshot(snapshot);
          if (products.isEmpty)
            return const Center(child: Text('No products found'));
          return LayoutBuilder(
            builder: (context, constraints) {
              final wide = constraints.maxWidth > 720;
              return GridView.builder(
                padding: const EdgeInsets.all(16),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: wide ? 2 : 1,
                  childAspectRatio: wide ? 3.4 : 3.2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                itemCount: products.length,
                itemBuilder: (context, index) =>
                    _ProductRow(product: products[index]),
              );
            },
          );
        },
      ),
    );
  }

  List<CatalogProduct> _productsFromSnapshot(
    AsyncSnapshot<QuerySnapshot> snapshot,
  ) {
    if (!snapshot.hasData || snapshot.hasError || snapshot.data!.docs.isEmpty) {
      return catalogFallback(categoryId: categoryId, sellerId: sellerId);
    }
    return snapshot.data!.docs
        .map((doc) {
          final data = doc.data() as Map<String, dynamic>? ?? {};
          return CatalogProduct.fromMap(doc.id, data);
        })
        .toList(growable: false);
  }
}

class _ProductRow extends StatelessWidget {
  const _ProductRow({required this.product});

  final CatalogProduct product;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () =>
            Navigator.pushNamed(context, '/product', arguments: product.id),
        child: Row(
          children: [
            AspectRatio(
              aspectRatio: 1,
              child: product.primaryImage.isEmpty
                  ? const ColoredBox(
                      color: Color(0xFFE5E7EB),
                      child: Icon(Icons.image_outlined),
                    )
                  : Image.network(
                      product.primaryImage,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const ColoredBox(
                        color: Color(0xFFE5E7EB),
                        child: Icon(Icons.image_outlined),
                      ),
                    ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      product.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      product.sellerName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            product.priceLabel,
                            style: Theme.of(context).textTheme.titleMedium
                                ?.copyWith(
                                  color: colors.primary,
                                  fontWeight: FontWeight.w900,
                                ),
                          ),
                        ),
                        const Icon(
                          Icons.star,
                          size: 16,
                          color: Color(0xFFF59E0B),
                        ),
                        const SizedBox(width: 2),
                        Text(product.rating.toStringAsFixed(1)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const Padding(
              padding: EdgeInsets.only(right: 8),
              child: Icon(Icons.chevron_right),
            ),
          ],
        ),
      ),
    );
  }
}
