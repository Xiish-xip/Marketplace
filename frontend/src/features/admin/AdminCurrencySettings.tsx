import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, XCircle, RefreshCw, Save, AlertTriangle, Globe, Key, Settings, DollarSign } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, put, post } from '../../lib/api-enhanced';
import toast from 'react-hot-toast';
import { SkeletonPage } from '../../components/Skeleton';

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} className="h-6 w-11 rounded-full p-0.5 transition-colors" style={{ backgroundColor: checked ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-border-strong))' }}>
      <span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: any; onChange: (value: any) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>{label}</span>
      <input
        type={type}
        value={value ?? ''}
        onChange={(event) => onChange(type === 'number' ? Number(event.target.value) : event.target.value)}
        className="input-field"
        placeholder={placeholder}
      />
    </label>
  );
}

export default function AdminCurrencySettings() {
  const qc = useQueryClient();
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['currency-settings'],
    queryFn: () => get('/currencies/settings/admin'),
    staleTime: 0,
  });
  const { data: currenciesInfo } = useQuery({
    queryKey: ['currency-info'],
    queryFn: () => get('/currencies/info'),
    staleTime: 3600000,
  });

  const [form, setForm] = useState({
    baseCurrency: 'USD',
    displayCurrencies: '["USD","EUR","GBP","TZS"]',
    autoRefresh: true,
    refreshInterval: 1680,
    roundingDecimals: 2,
    symbolPosition: 'before' as 'before' | 'after',
    thousandSeparator: ',',
    decimalSeparator: '.',
    provider: 'manual',
    apiKey: '',
    geoDetectionEnabled: false,
    geolocationProvider: 'ipapi',
  });

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (settingsData?.data) {
      const s = settingsData.data;
      setForm({
        baseCurrency: s.baseCurrency || 'USD',
        displayCurrencies: s.displayCurrencies || '["USD","EUR","GBP","TZS"]',
        autoRefresh: s.autoRefresh ?? true,
        refreshInterval: s.refreshInterval ?? 1680,
        roundingDecimals: s.roundingDecimals ?? 2,
        symbolPosition: s.symbolPosition || 'before',
        thousandSeparator: s.thousandSeparator || ',',
        decimalSeparator: s.decimalSeparator || '.',
        provider: s.provider || 'manual',
        apiKey: s.apiKey || '',
        geoDetectionEnabled: s.geoDetectionEnabled || false,
        geolocationProvider: s.geolocationProvider || 'ipapi',
      });
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => put('/currencies/settings', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['currency-settings'] });
      toast.success('Currency settings saved');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to save'),
  });

  const testConnection = async () => {
    if (!form.apiKey) {
      toast.error('Please enter an API key first');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await post('/currencies/test-provider', { apiKey: form.apiKey });
      setTestResult(res.data);
      if (res.data.success) {
        toast.success('Connection successful!');
      } else {
        toast.error(res.data.message);
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.response?.data?.message || 'Test failed' });
      toast.error('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const set = (key: string, value: any) => setForm({ ...form, [key]: value });

  if (isLoading) return <SkeletonPage cards={6} columns={3} />;

  const currencies = currenciesInfo?.data || [];

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="mb-6 flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg" style={{ backgroundColor: 'rgb(var(--color-primary-50))', color: 'rgb(var(--color-primary-700))' }}>
          <DollarSign className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Currency Settings</h3>
          <p className="mt-1 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Configure base currency, third-party exchange rate provider (ExchangeRate-API), and geo-detection
          </p>
        </div>
      </div>

      {/* ExchangeRate-API Card */}
      <div className="card p-6 rounded-xl border-2" style={{ borderColor: form.provider === 'exchangerate-api' ? 'rgb(var(--color-primary-300))' : 'rgb(var(--color-border))' }}>
        <div className="flex items-center gap-3 mb-4">
          <RefreshCw className="h-5 w-5" style={{ color: 'rgb(var(--color-primary-600))' }} />
          <h4 className="font-semibold text-lg" style={{ color: 'rgb(var(--color-text))' }}>ExchangeRate-API</h4>
          {form.provider === 'exchangerate-api' && (
            <span className="badge-success text-xs px-2 py-0.5">Active Provider</span>
          )}
        </div>
        <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
          Connect to <strong>exchangerate-api.com</strong> for real-time exchange rates.
          Rates will auto-refresh every <strong>28 minutes</strong> and be saved to the database.
          <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer"
            className="ml-1 font-medium underline" style={{ color: 'rgb(var(--color-primary-600))' }}>
            Get your free API key →
          </a>
        </p>

        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>API Key</span>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'rgb(var(--color-text-disabled))' }} />
              <input
                type="password"
                value={form.apiKey}
                onChange={(e) => set('apiKey', e.target.value)}
                className="input-field pl-10"
                placeholder="Enter your ExchangeRate-API key..."
              />
            </div>
          </label>
          <div className="flex items-end gap-2">
            <button
              onClick={testConnection}
              disabled={testing}
              className="btn-secondary"
            >
              {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <label className="flex items-center gap-2 pb-1">
              <span className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>Enable</span>
              <Toggle
                checked={form.provider === 'exchangerate-api'}
                onChange={() => set('provider', form.provider === 'exchangerate-api' ? 'manual' : 'exchangerate-api')}
              />
            </label>
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`rounded-lg p-3 text-sm flex items-start gap-2 ${
            testResult.success
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            {testResult.success
              ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'rgb(var(--color-accent-600))' }} />
              : <XCircle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'rgb(var(--color-danger))' }} />
            }
            <div>
              <p className="font-medium" style={{ color: testResult.success ? 'rgb(var(--color-accent-800))' : 'rgb(var(--color-danger))' }}>
                {testResult.success ? 'Connection Successful' : 'Connection Failed'}
              </p>
              <p className="mt-1 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{testResult.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Base Currency & Format */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-4 w-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
            <h4 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Base Currency</h4>
          </div>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>Base currency</span>
              <select value={form.baseCurrency} onChange={(e) => set('baseCurrency', e.target.value)} className="select-field">
                {currencies.map((c: any) => (
                  <option key={c.code} value={c.code}>{c.symbol} {c.code} - {c.name}</option>
                ))}
              </select>
            </label>
            <Field label="Rounding decimals" type="number" value={form.roundingDecimals} onChange={(v) => set('roundingDecimals', v)} />
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-4 w-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
            <h4 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Format</h4>
          </div>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>Symbol position</span>
              <select value={form.symbolPosition} onChange={(e) => set('symbolPosition', e.target.value)} className="select-field">
                <option value="before">Before amount ($10.00)</option>
                <option value="after">After amount (10.00 $)</option>
              </select>
            </label>
            <Field label="Thousand separator" value={form.thousandSeparator} onChange={(v) => set('thousandSeparator', v)} />
            <Field label="Decimal separator" value={form.decimalSeparator} onChange={(v) => set('decimalSeparator', v)} />
          </div>
        </div>
      </div>

      {/* Auto Refresh */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
            <h4 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Auto-Refresh</h4>
          </div>
          <Toggle checked={form.autoRefresh} onChange={() => set('autoRefresh', !form.autoRefresh)} />
        </div>
        <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
          When enabled, rates will automatically refresh every 28 minutes using the ExchangeRate-API.
          Refreshed rates are cached in memory and persisted to the database.
        </p>
        {form.autoRefresh && (
          <div className="rounded-lg p-3 flex items-center gap-2 text-sm" style={{ backgroundColor: 'rgb(var(--color-primary-50))', color: 'rgb(var(--color-primary-700))' }}>
            <RefreshCw className="h-4 w-4" />
            <span>Auto-refresh is active — rates update every 28 minutes</span>
          </div>
        )}
      </div>

      {/* Geo Detection */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
            <h4 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Geo-Detection</h4>
          </div>
          <Toggle checked={form.geoDetectionEnabled} onChange={() => set('geoDetectionEnabled', !form.geoDetectionEnabled)} />
        </div>
        <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
          Detect user currency automatically based on their IP address location.
          When enabled, first-time visitors will see prices in their local currency.
        </p>
        {form.geoDetectionEnabled && (
          <div className="mt-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>Geolocation provider</span>
              <select value={form.geolocationProvider} onChange={(e) => set('geolocationProvider', e.target.value)} className="select-field">
                <option value="ipapi">ipapi.co (free, no key needed)</option>
                <option value="ip2location">ip2location.io (requires API key)</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="sticky bottom-4 z-10 flex justify-end">
        <button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
          className="btn-primary shadow-lg"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? 'Saving...' : 'Save Currency Settings'}
        </button>
      </div>
    </div>
  );
}
