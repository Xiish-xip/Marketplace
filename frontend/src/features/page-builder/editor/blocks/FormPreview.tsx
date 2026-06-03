import React from 'react';

export default function FormPreview({ settings }: { settings: any }) {
  const s = settings || {};
  return (
    <section className="py-6 px-4 bg-white rounded-md border" style={{ backgroundColor: s.backgroundColor || 'transparent' }}>
      <div className="max-w-xl mx-auto">
        <h3 className="text-lg font-semibold mb-2">{s.title || 'Contact Us'}</h3>
        <p className="text-sm mb-3 text-gray-600">{s.description || 'Send us a message'}</p>
        <form onSubmit={(e) => e.preventDefault()} className="grid gap-2">
          <input placeholder={s.namePlaceholder || 'Your name'} className="px-3 py-2 rounded border" />
          <input placeholder={s.emailPlaceholder || 'Email'} className="px-3 py-2 rounded border" />
          <textarea placeholder={s.messagePlaceholder || 'Message'} className="px-3 py-2 rounded border" />
          <button className="px-4 py-2 bg-blue-600 text-white rounded">{s.buttonText || 'Send'}</button>
        </form>
      </div>
    </section>
  );
}
