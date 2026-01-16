import { useEffect, useState } from 'react';
import { X, Settings, Zap, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { getAISettings, updateAISettings, testAIConnection, getAvailableModels } from '../api';
import type { AISettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_SETTINGS: AISettings = {
  provider: 'ollama',
  model_name: 'llama3.2',
  base_url: 'http://localhost:11434/v1',
  temperature: 0.7,
  context_window: 4096,
  system_prompt:
    'You are a research assistant helping analyze academic documents. When answering questions, reference the provided excerpts using [1], [2], etc. Be precise and cite your sources.',
  graph_depth: 1,
  openai_key_configured: false,
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: string; message?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      setTestResult(null);
      setError(null);
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getAISettings();
      setSettings(data);
      // Fetch models after loading settings
      await fetchModels();
    } catch (err) {
      console.error('Failed to load settings:', err);
      // Use defaults if settings don't exist yet
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const fetchModels = async () => {
    try {
      setLoadingModels(true);
      const result = await getAvailableModels();
      if (result.status === 'success') {
        setAvailableModels(result.models);
      } else {
        console.error('Failed to fetch models:', result.message);
        setAvailableModels([]);
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
      setAvailableModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await updateAISettings(settings);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      setError(null);
      // Save settings first so test uses current values
      await updateAISettings(settings);
      const result = await testAIConnection();
      setTestResult(result);
    } catch (err) {
      setTestResult({ status: 'error', message: err instanceof Error ? err.message : 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  const updateField = <K extends keyof AISettings>(field: K, value: AISettings[K]) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  // Update base_url when provider changes
  const handleProviderChange = async (provider: 'ollama' | 'openai') => {
    const newBaseUrl =
      provider === 'ollama'
        ? 'http://localhost:11434/v1'
        : 'https://api.openai.com/v1';
    const newSettings = {
      ...settings,
      provider,
      base_url: newBaseUrl,
      model_name: provider === 'ollama' ? 'llama3.2' : 'gpt-4o',
    };
    setSettings(newSettings);
    // Save and fetch models for the new provider
    try {
      await updateAISettings(newSettings);
      await fetchModels();
    } catch (err) {
      console.error('Failed to update provider:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-none shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-4 border-blue-900">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-900" />
            <h2 className="text-lg font-extrabold text-neutral-800 uppercase tracking-wide">
              AI Brain Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded-none transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="text-center text-neutral-500 py-8">Loading settings...</div>
          ) : (
            <>
              {/* Provider Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-neutral-700 uppercase tracking-wide">
                  Provider
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleProviderChange('ollama')}
                    className={`flex-1 px-4 py-3 text-sm font-medium rounded-none border-2 transition-colors ${
                      settings.provider === 'ollama'
                        ? 'border-blue-900 bg-blue-50 text-blue-900'
                        : 'border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400'
                    }`}
                  >
                    Ollama (Local)
                  </button>
                  <button
                    onClick={() => handleProviderChange('openai')}
                    className={`flex-1 px-4 py-3 text-sm font-medium rounded-none border-2 transition-colors ${
                      settings.provider === 'openai'
                        ? 'border-blue-900 bg-blue-50 text-blue-900'
                        : 'border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400'
                    }`}
                  >
                    OpenAI
                  </button>
                </div>
              </div>

              {/* Base URL */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-neutral-700 uppercase tracking-wide">
                  Base URL
                </label>
                <input
                  type="text"
                  value={settings.base_url}
                  onChange={(e) => updateField('base_url', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  placeholder="http://localhost:11434/v1"
                />
              </div>

              {/* Model Name */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-neutral-700 uppercase tracking-wide">
                    Model
                  </label>
                  <button
                    onClick={fetchModels}
                    disabled={loadingModels}
                    className="flex items-center gap-1 text-xs text-blue-900 hover:text-blue-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingModels ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
                <div className="flex gap-2">
                  <select
                    value={settings.model_name}
                    onChange={(e) => updateField('model_name', e.target.value)}
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent bg-white"
                  >
                    {/* Always include current model as option */}
                    {!availableModels.includes(settings.model_name) && (
                      <option value={settings.model_name}>{settings.model_name}</option>
                    )}
                    {availableModels.length === 0 && !loadingModels && (
                      <option value="" disabled>No models found - click Refresh</option>
                    )}
                    {availableModels.map((model) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>
                {loadingModels && (
                  <p className="text-xs text-neutral-500">Loading models...</p>
                )}
              </div>

              {/* API Key Status (for OpenAI) */}
              {settings.provider === 'openai' && (
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-neutral-700 uppercase tracking-wide">
                    API Key Status
                  </label>
                  <div className={`px-3 py-2 border rounded-none text-sm ${
                    settings.openai_key_configured
                      ? 'bg-green-50 border-green-300 text-green-800'
                      : 'bg-yellow-50 border-yellow-300 text-yellow-800'
                  }`}>
                    {settings.openai_key_configured ? (
                      <span>OPENAI_API_KEY is configured in backend/.env</span>
                    ) : (
                      <span>Set OPENAI_API_KEY in backend/.env file</span>
                    )}
                  </div>
                </div>
              )}

              {/* Temperature & Context Window Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-neutral-700 uppercase tracking-wide">
                    Temperature: {settings.temperature.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={settings.temperature}
                    onChange={(e) => updateField('temperature', parseFloat(e.target.value))}
                    className="w-full accent-blue-900"
                  />
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>Precise</span>
                    <span>Creative</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-neutral-700 uppercase tracking-wide">
                    Context Window
                  </label>
                  <input
                    type="number"
                    min="1024"
                    max="128000"
                    step="1024"
                    value={settings.context_window}
                    onChange={(e) => updateField('context_window', parseInt(e.target.value) || 4096)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Graph Depth */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-neutral-700 uppercase tracking-wide">
                  Graph Depth: {settings.graph_depth} hop{settings.graph_depth !== 1 ? 's' : ''}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="1"
                  value={settings.graph_depth}
                  onChange={(e) => updateField('graph_depth', parseInt(e.target.value))}
                  className="w-full accent-blue-900"
                />
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>0 (Direct only)</span>
                  <span>1 (Connected)</span>
                  <span>2 (Extended)</span>
                </div>
              </div>

              {/* System Prompt */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-neutral-700 uppercase tracking-wide">
                  System Prompt (Persona)
                </label>
                <textarea
                  value={settings.system_prompt}
                  onChange={(e) => updateField('system_prompt', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent resize-none"
                  placeholder="You are a research assistant..."
                />
              </div>

              {/* Test Connection */}
              <div className="space-y-2">
                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-none transition-colors disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>

                {testResult && (
                  <div
                    className={`flex items-start gap-2 p-3 rounded-none ${
                      testResult.status === 'success'
                        ? 'bg-green-50 border-l-4 border-green-500'
                        : 'bg-red-50 border-l-4 border-red-500'
                    }`}
                  >
                    {testResult.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="text-sm">
                      {testResult.status === 'success' ? (
                        <span className="text-green-800">Connection successful!</span>
                      ) : (
                        <span className="text-red-800">{testResult.message || 'Connection failed'}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border-l-4 border-red-500 rounded-none">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-red-800">{error}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-neutral-300 bg-neutral-100">
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 text-sm rounded-none transition-colors font-medium bg-blue-900 text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
