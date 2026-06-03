class CatalogCategory {
  const CatalogCategory({
    required this.id,
    required this.name,
    required this.subtitle,
  });

  final String id;
  final String name;
  final String subtitle;

  factory CatalogCategory.fromMap(String id, Map<String, dynamic> data) {
    return CatalogCategory(
      id: id,
      name: _stringValue(data['name'], 'Category'),
      subtitle: _stringValue(
        data['subtitle'] ?? data['description'],
        'Curated products',
      ),
    );
  }
}

class CatalogProduct {
  const CatalogProduct({
    required this.id,
    required this.title,
    required this.description,
    required this.price,
    required this.categoryId,
    required this.sellerId,
    required this.sellerName,
    required this.images,
    required this.stock,
    required this.rating,
    required this.orders,
    required this.shipLabel,
    required this.badge,
  });

  final String id;
  final String title;
  final String description;
  final double price;
  final String categoryId;
  final String sellerId;
  final String sellerName;
  final List<String> images;
  final int stock;
  final double rating;
  final int orders;
  final String shipLabel;
  final String badge;

  String get primaryImage => images.isEmpty ? '' : images.first;
  String get priceLabel =>
      '\$${price % 1 == 0 ? price.toStringAsFixed(0) : price.toStringAsFixed(2)}';

  factory CatalogProduct.fromMap(String id, Map<String, dynamic> data) {
    return CatalogProduct(
      id: id,
      title: _stringValue(data['title'] ?? data['name'], 'Untitled product'),
      description: _stringValue(
        data['description'],
        'No description has been added yet.',
      ),
      price: _doubleValue(data['price']),
      categoryId: _stringValue(data['categoryId'], 'featured'),
      sellerId: _stringValue(data['sellerId'], 'seller'),
      sellerName: _stringValue(
        data['sellerName'] ?? data['seller'] ?? data['brand'],
        'Verified seller',
      ),
      images: _imageList(data['images'] ?? data['imageUrls'] ?? data['image']),
      stock: _intValue(data['stock'], fallback: 25),
      rating: _doubleValue(data['rating'], fallback: 4.7),
      orders: _intValue(
        data['orders'] ?? data['sold'] ?? data['sales'],
        fallback: 120,
      ),
      shipLabel: _stringValue(
        data['shipLabel'] ?? data['shipping'],
        'Ready to ship',
      ),
      badge: _stringValue(data['badge'], 'Verified'),
    );
  }
}

const fallbackCategories = <CatalogCategory>[
  CatalogCategory(
    id: 'electronics',
    name: 'Electronics',
    subtitle: 'Devices and accessories',
  ),
  CatalogCategory(
    id: 'fashion',
    name: 'Fashion',
    subtitle: 'Apparel and footwear',
  ),
  CatalogCategory(id: 'home', name: 'Home', subtitle: 'Living and kitchen'),
  CatalogCategory(id: 'beauty', name: 'Beauty', subtitle: 'Care and grooming'),
  CatalogCategory(
    id: 'business',
    name: 'Business',
    subtitle: 'Office and supply',
  ),
];

const fallbackProducts = <CatalogProduct>[
  CatalogProduct(
    id: 'demo-headphones',
    title: 'Wireless Studio Headphones',
    description:
        'Noise-isolating Bluetooth headphones with a soft travel case, long battery life, and retail-ready packaging.',
    price: 59,
    categoryId: 'electronics',
    sellerId: 'northstar-supply',
    sellerName: 'Northstar Supply',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
    ],
    stock: 420,
    rating: 4.8,
    orders: 1380,
    shipLabel: 'Ships in 2 days',
    badge: 'Top deal',
  ),
  CatalogProduct(
    id: 'demo-smartwatch',
    title: 'AMOLED Fitness Smartwatch',
    description:
        'Water-resistant smartwatch with heart-rate tracking, message alerts, and interchangeable straps.',
    price: 42,
    categoryId: 'electronics',
    sellerId: 'northstar-supply',
    sellerName: 'Northstar Supply',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
    ],
    stock: 265,
    rating: 4.6,
    orders: 910,
    shipLabel: 'Express available',
    badge: 'Verified',
  ),
  CatalogProduct(
    id: 'demo-sneakers',
    title: 'Lightweight Knit Sneakers',
    description:
        'Breathable everyday sneakers with cushioned soles, neutral colorways, and size runs ready for retail.',
    price: 36,
    categoryId: 'fashion',
    sellerId: 'harbor-goods',
    sellerName: 'Harbor Goods',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
    ],
    stock: 610,
    rating: 4.7,
    orders: 2040,
    shipLabel: 'Ships in 3 days',
    badge: 'Fast mover',
  ),
  CatalogProduct(
    id: 'demo-desk-kit',
    title: 'Minimal Desk Organizer Kit',
    description:
        'Modular desktop organizer with trays for stationery, phone, notes, and compact accessories.',
    price: 24,
    categoryId: 'business',
    sellerId: 'harbor-goods',
    sellerName: 'Harbor Goods',
    images: [
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    ],
    stock: 350,
    rating: 4.5,
    orders: 740,
    shipLabel: 'Ready to ship',
    badge: 'New',
  ),
  CatalogProduct(
    id: 'demo-cookware',
    title: 'Ceramic Nonstick Cookware Set',
    description:
        'Retail boxed cookware set with ceramic coating, induction-ready bases, and soft-touch handles.',
    price: 78,
    categoryId: 'home',
    sellerId: 'atlas-home',
    sellerName: 'Atlas Home',
    images: [
      'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80',
    ],
    stock: 190,
    rating: 4.9,
    orders: 1180,
    shipLabel: 'Bulk freight',
    badge: 'Premium',
  ),
  CatalogProduct(
    id: 'demo-skincare',
    title: 'Hydrating Skincare Starter Set',
    description:
        'Three-piece skincare kit with cleanser, serum, and moisturizer in shelf-ready packaging.',
    price: 31,
    categoryId: 'beauty',
    sellerId: 'atlas-home',
    sellerName: 'Atlas Home',
    images: [
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=1200&q=80',
    ],
    stock: 520,
    rating: 4.8,
    orders: 1630,
    shipLabel: 'Ships in 2 days',
    badge: 'Trending',
  ),
];

List<CatalogProduct> catalogFallback({String? categoryId, String? sellerId}) {
  return fallbackProducts
      .where((product) {
        final categoryMatches =
            categoryId == null || product.categoryId == categoryId;
        final sellerMatches = sellerId == null || product.sellerId == sellerId;
        return categoryMatches && sellerMatches;
      })
      .toList(growable: false);
}

CatalogProduct? fallbackProductById(String id) {
  for (final product in fallbackProducts) {
    if (product.id == id) return product;
  }
  return null;
}

String _stringValue(dynamic value, String fallback) {
  if (value == null) return fallback;
  final text = value.toString().trim();
  return text.isEmpty ? fallback : text;
}

double _doubleValue(dynamic value, {double fallback = 0}) {
  if (value is num) return value.toDouble();
  if (value is String) {
    final cleaned = value.replaceAll(RegExp(r'[^0-9.]'), '');
    return double.tryParse(cleaned) ?? fallback;
  }
  return fallback;
}

int _intValue(dynamic value, {int fallback = 0}) {
  if (value is int) return value;
  if (value is num) return value.round();
  if (value is String) return int.tryParse(value) ?? fallback;
  return fallback;
}

List<String> _imageList(dynamic value) {
  if (value is List) {
    return value
        .map((item) => item.toString())
        .where((item) => item.trim().isNotEmpty)
        .toList(growable: false);
  }
  if (value is String && value.trim().isNotEmpty) return [value.trim()];
  return const [];
}
