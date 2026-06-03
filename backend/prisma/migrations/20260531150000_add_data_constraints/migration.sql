-- Add CHECK constraints for data validation

-- Review.rating must be between 1 and 5
ALTER TABLE reviews ADD CONSTRAINT check_review_rating CHECK (rating >= 1 AND rating <= 5);

-- Product.basePrice must be non-negative
ALTER TABLE products ADD CONSTRAINT check_product_base_price CHECK ("basePrice" >= 0);

-- ProductVariant.stock must be non-negative
ALTER TABLE product_variants ADD CONSTRAINT check_product_variant_stock CHECK (stock >= 0);
