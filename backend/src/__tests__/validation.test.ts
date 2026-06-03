import { describe, it, expect } from 'vitest';
import { registerDeliveryPersonSchema, updateLocationSchema, createDeliverySchema } from '../modules/delivery/delivery.validation';
import { searchProductsQuerySchema } from '../modules/search/search.validation';
import { setCacheSchema, clearCacheSchema } from '../modules/cache/cache.validation';

describe('Validation Schemas', () => {
  it('accepts valid delivery registration', () => {
    const data = {
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      licenseNumber: 'DL-12345',
      vehicleType: 'MOTORCYCLE',
      licensePlate: 'ABC-123',
    };
    expect(() => registerDeliveryPersonSchema.parse(data)).not.toThrow();
  });

  it('rejects invalid delivery location', () => {
    const bad = { latitude: 200, longitude: 0 } as any;
    expect(() => updateLocationSchema.parse(bad)).toThrow();
  });

  it('accepts createDelivery payload', () => {
    const payload = { shippingAddress: '123 Main St', notes: 'Leave at door' };
    expect(() => createDeliverySchema.parse(payload)).not.toThrow();
  });

  it('validates search query defaults', () => {
    const q = { page: '1', limit: '10' } as any;
    const parsed = searchProductsQuerySchema.parse(q);
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(10);
  });

  it('validates cache set schema', () => {
    const ok = { key: 'foo', value: { a: 1 }, ttl: 60 };
    expect(() => setCacheSchema.parse(ok)).not.toThrow();
  });

  it('validates clear cache schema optional pattern', () => {
    const ok = { pattern: 'user:*' };
    expect(() => clearCacheSchema.parse(ok)).not.toThrow();
  });
});
