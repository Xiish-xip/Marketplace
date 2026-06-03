import { useState, useEffect } from 'react';
import { useAuthStore } from '../../lib/auth-store';
import { Save, Smartphone, Tablet, Monitor, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'navbar' | 'hero' | 'sections' | 'footer' | 'styles';

const tabs: { id: Tab; label: string }[] = [
  { id: 'navbar', label: 'Navbar' },
  { id: 'hero', label: 'Hero' },
  { id: 'sections', label: 'Sections' },
  { id: 'footer', label: 'Footer' },
  { id: 'styles', label: 'Styles' },
];

type ViewMode = 'mobile' | 'tablet' | 'desktop';

export default function AdminSiteSettings() {
  const { accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('navbar');
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const auth = { Authorization: `Bearer ${accessToken}` };

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch('/api/site-settings', { headers: auth });
      const json = await res.json();
      if (json.success) setSettings(json.data);
    } catch { toast.error('Failed to load site settings'); }
    finally { setLoading(false); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/site-settings', {
        method: 'PUT',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.success) { toast.success('Settings saved'); setHasChanges(false); }
      else toast.error(json.message);
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  function update(path: string, value: any) {
    setSettings((prev: any) => {
      const keys = path.split('.');
      const newSettings = JSON.parse(JSON.stringify(prev));
      let obj = newSettings;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return newSettings;
    });
    setHasChanges(true);
  }

  function addMenuItem() {
    setSettings((prev: any) => ({
      ...prev,
      navbar: {
        ...prev.navbar,
        menuItems: [...(prev.navbar?.menuItems || []), { label: '', path: '' }],
      },
    }));
    setHasChanges(true);
  }

  function removeMenuItem(index: number) {
    setSettings((prev: any) => ({
      ...prev,
      navbar: {
        ...prev.navbar,
        menuItems: prev.navbar?.menuItems?.filter((_: any, i: number) => i !== index) || [],
      },
    }));
    setHasChanges(true);
  }

  function addFooterColumn() {
    setSettings((prev: any) => ({
      ...prev,
      footer: {
        ...prev.footer,
        columns: [...(prev.footer?.columns || []), { title: '', links: [{ label: '', path: '' }] }],
      },
    }));
    setHasChanges(true);
  }

  function addSection() {
    setSettings((prev: any) => ({
      ...prev,
      sections: [...(prev.sections || []), { id: `section-${Date.now()}`, type: 'featured-products', title: 'New Section', enabled: true, layout: 'grid', limit: 8 }],
    }));
    setHasChanges(true);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!settings) {
    return <div className="card p-8 text-center text-gray-500">Failed to load settings</div>;
  }

  const viewModeWidth = viewMode === 'mobile' ? 'w-[375px]' : viewMode === 'tablet' ? 'w-[768px]' : 'w-full';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Site Settings</h2>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            {(['mobile', 'tablet', 'desktop'] as ViewMode[]).map((mode) => (
              <button key={mode}
                onClick={() => setViewMode(mode)}
                className={`p-2 rounded ${viewMode === mode ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
              >
                {mode === 'mobile' ? <Smartphone className="w-4 h-4" /> : mode === 'tablet' ? <Tablet className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
              </button>
            ))}
          </div>
          <button className="btn-secondary btn-sm" onClick={() => { fetchSettings(); setHasChanges(false); }}>
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={!hasChanges || saving}>
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Preview bar */}
      <div className={`mx-auto transition-all duration-300 ${viewModeWidth}`}>
        <div className="card p-6 space-y-6">
          {/* Navbar Tab */}
          {activeTab === 'navbar' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Site Name</label>
                  <input className="input-field" value={settings.navbar?.siteName || ''}
                    onChange={(e) => update('navbar.siteName', e.target.value)} />
                </div>
                <div>
                  <label className="label-field">Logo URL</label>
                  <input className="input-field" value={settings.navbar?.logo || ''}
                    onChange={(e) => update('navbar.logo', e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                {(['showCart', 'showSearch', 'showAuth', 'sticky'] as const).map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={settings.navbar?.[key] ?? false}
                      onChange={(e) => update(`navbar.${key}`, e.target.checked)} />
                    {key.replace('show', 'Show ')}
                  </label>
                ))}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label-field">Menu Items</label>
                  <button className="btn-sm btn-secondary" onClick={addMenuItem}>+ Add Item</button>
                </div>
                <div className="space-y-2">
                  {(settings.navbar?.menuItems || []).map((item: any, i: number) => (
                    <div key={i} className="flex gap-2">
                      <input className="input-field flex-1" placeholder="Label" value={item.label}
                        onChange={(e) => update(`navbar.menuItems.${i}.label`, e.target.value)} />
                      <input className="input-field flex-1" placeholder="/path" value={item.path}
                        onChange={(e) => update(`navbar.menuItems.${i}.path`, e.target.value)} />
                      <button className="btn-sm btn-danger" onClick={() => removeMenuItem(i)}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Hero Tab */}
          {activeTab === 'hero' && (
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.hero?.enabled ?? false}
                  onChange={(e) => update('hero.enabled', e.target.checked)} />
                Enable Hero
              </label>
              {settings.hero?.enabled && (
                <>
                  <input className="input-field" placeholder="Title" value={settings.hero?.title || ''}
                    onChange={(e) => update('hero.title', e.target.value)} />
                  <textarea className="input-field" placeholder="Subtitle" rows={2} value={settings.hero?.subtitle || ''}
                    onChange={(e) => update('hero.subtitle', e.target.value)} />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label-field">Background Color</label>
                      <div className="flex gap-2">
                        <input type="color" className="w-10 h-10 rounded cursor-pointer" value={settings.hero?.backgroundColor || '#f97316'}
                          onChange={(e) => update('hero.backgroundColor', e.target.value)} />
                        <input className="input-field" value={settings.hero?.backgroundColor || ''}
                          onChange={(e) => update('hero.backgroundColor', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="label-field">Text Color</label>
                      <div className="flex gap-2">
                        <input type="color" className="w-10 h-10 rounded cursor-pointer" value={settings.hero?.textColor || '#ffffff'}
                          onChange={(e) => update('hero.textColor', e.target.value)} />
                        <input className="input-field" value={settings.hero?.textColor || ''}
                          onChange={(e) => update('hero.textColor', e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input className="input-field" placeholder="Button Text" value={settings.hero?.buttonText || ''}
                      onChange={(e) => update('hero.buttonText', e.target.value)} />
                    <input className="input-field" placeholder="Button Link" value={settings.hero?.buttonLink || ''}
                      onChange={(e) => update('hero.buttonLink', e.target.value)} />
                  </div>
                  <input className="input-field" placeholder="Background Image URL" value={settings.hero?.backgroundImage || ''}
                    onChange={(e) => update('hero.backgroundImage', e.target.value)} />
                </>
              )}
            </div>
          )}

          {/* Sections Tab */}
          {activeTab === 'sections' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="label-field">Homepage Sections</label>
                <button className="btn-sm btn-secondary" onClick={addSection}>+ Add Section</button>
              </div>
              {(settings.sections || []).map((section: any, i: number) => (
                <div key={section.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input type="checkbox" checked={section.enabled}
                        onChange={(e) => update(`sections.${i}.enabled`, e.target.checked)} />
                      {section.title || 'Section'}
                    </label>
                    <button className="text-red-500 text-sm" onClick={() => {
                      setSettings((prev: any) => ({ ...prev, sections: prev.sections?.filter((_: any, idx: number) => idx !== i) }));
                      setHasChanges(true);
                    }}>Remove</button>
                  </div>
                  <input className="input-field" placeholder="Section Title" value={section.title || ''}
                    onChange={(e) => update(`sections.${i}.title`, e.target.value)} />
                  <select className="input-field" value={section.type} onChange={(e) => update(`sections.${i}.type`, e.target.value)}>
                    <option value="featured-products">Featured Products</option>
                    <option value="categories">Categories</option>
                    <option value="new-arrivals">New Arrivals</option>
                    <option value="best-sellers">Best Sellers</option>
                    <option value="promo-banners">Promo Banners</option>
                  </select>
                  <select className="input-field" value={section.layout} onChange={(e) => update(`sections.${i}.layout`, e.target.value)}>
                    <option value="grid">Grid</option>
                    <option value="carousel">Carousel</option>
                    <option value="list">List</option>
                  </select>
                </div>
              ))}
            </div>
          )}

          {/* Footer Tab */}
          {activeTab === 'footer' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input className="input-field" placeholder="Site Name" value={settings.footer?.siteName || ''}
                  onChange={(e) => update('footer.siteName', e.target.value)} />
                <input className="input-field" placeholder="Logo URL" value={settings.footer?.logo || ''}
                  onChange={(e) => update('footer.logo', e.target.value)} />
              </div>
              <textarea className="input-field" placeholder="Description" rows={2} value={settings.footer?.description || ''}
                onChange={(e) => update('footer.description', e.target.value)} />
              <input className="input-field" placeholder="Copyright text" value={settings.footer?.copyright || ''}
                onChange={(e) => update('footer.copyright', e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Background Color</label>
                  <div className="flex gap-2">
                    <input type="color" className="w-10 h-10 rounded cursor-pointer" value={settings.footer?.backgroundColor || '#111827'}
                      onChange={(e) => update('footer.backgroundColor', e.target.value)} />
                    <input className="input-field" value={settings.footer?.backgroundColor || ''}
                      onChange={(e) => update('footer.backgroundColor', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="label-field">Text Color</label>
                  <div className="flex gap-2">
                    <input type="color" className="w-10 h-10 rounded cursor-pointer" value={settings.footer?.textColor || '#f9fafb'}
                      onChange={(e) => update('footer.textColor', e.target.value)} />
                    <input className="input-field" value={settings.footer?.textColor || ''}
                      onChange={(e) => update('footer.textColor', e.target.value)} />
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label-field">Footer Columns</label>
                  <button className="btn-sm btn-secondary" onClick={addFooterColumn}>+ Add Column</button>
                </div>
                {(settings.footer?.columns || []).map((col: any, ci: number) => (
                  <div key={ci} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-2">
                    <input className="input-field mb-2" value={col.title} placeholder="Column title"
                      onChange={(e) => update(`footer.columns.${ci}.title`, e.target.value)} />
                    {(col.links || []).map((link: any, li: number) => (
                      <div key={li} className="flex gap-2 mb-1">
                        <input className="input-field flex-1 text-sm" placeholder="Label" value={link.label}
                          onChange={(e) => update(`footer.columns.${ci}.links.${li}.label`, e.target.value)} />
                        <input className="input-field flex-1 text-sm" placeholder="/path" value={link.path}
                          onChange={(e) => update(`footer.columns.${ci}.links.${li}.path`, e.target.value)} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Styles Tab */}
          {activeTab === 'styles' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Primary Color</label>
                  <div className="flex gap-2">
                    <input type="color" className="w-10 h-10 rounded cursor-pointer" value={settings.styles?.primaryColor || '#f97316'}
                      onChange={(e) => update('styles.primaryColor', e.target.value)} />
                    <input className="input-field" value={settings.styles?.primaryColor || ''}
                      onChange={(e) => update('styles.primaryColor', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="label-field">Secondary Color</label>
                  <div className="flex gap-2">
                    <input type="color" className="w-10 h-10 rounded cursor-pointer" value={settings.styles?.secondaryColor || '#ea580c'}
                      onChange={(e) => update('styles.secondaryColor', e.target.value)} />
                    <input className="input-field" value={settings.styles?.secondaryColor || ''}
                      onChange={(e) => update('styles.secondaryColor', e.target.value)} />
                  </div>
                </div>
              </div>
              <input className="input-field" placeholder="Font family" value={settings.styles?.fontFamily || ''}
                onChange={(e) => update('styles.fontFamily', e.target.value)} />
              <input className="input-field" placeholder="Border radius (e.g. 0.5rem)" value={settings.styles?.borderRadius || ''}
                onChange={(e) => update('styles.borderRadius', e.target.value)} />
              <input className="input-field" placeholder="Container width (e.g. 1280px)" value={settings.styles?.containerWidth || ''}
                onChange={(e) => update('styles.containerWidth', e.target.value)} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.styles?.darkMode ?? true}
                  onChange={(e) => update('styles.darkMode', e.target.checked)} />
                Enable Dark Mode
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}