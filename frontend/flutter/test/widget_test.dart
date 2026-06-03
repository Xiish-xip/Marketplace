import 'package:flutter_test/flutter_test.dart';

import 'package:marketplace/models/catalog.dart';
import 'package:marketplace/widgets/theme.dart';

void main() {
  test('fallback catalog has guest-browsable products', () {
    expect(fallbackCategories.length, greaterThanOrEqualTo(5));
    expect(fallbackProducts.length, greaterThanOrEqualTo(6));
    expect(catalogFallback(categoryId: 'electronics'), isNotEmpty);
    expect(fallbackProductById('demo-headphones')?.priceLabel, '\$59');
  });

  test('theme keeps marketplace controls compact', () {
    final shape = marketPlaceTheme.cardTheme.shape;
    expect(shape, isNotNull);
  });
}
