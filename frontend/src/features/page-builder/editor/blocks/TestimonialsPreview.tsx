import React from 'react';

export default function TestimonialsPreview({ settings }: { settings: any }) {
  const items = settings.items || [];
  return (
    <section className="py-8 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <h3 className="text-xl font-semibold mb-4">{settings.title || 'Testimonials'}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {items.length === 0 ? (
            <div className="p-6 border rounded text-center text-sm text-gray-500">No testimonials</div>
          ) : items.map((t: any, i: number) => (
            <blockquote key={i} className="p-4 rounded bg-white border">
              <p className="text-sm mb-2">{t.quote}</p>
              <footer className="text-xs font-medium text-gray-600">{t.author}</footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
