import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';

import { logger } from '../../services/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Position3D {
  x: number;
  y: number;
  z: number;
}

interface SmartDevice {
  type: string;
  brand: string;
  model: string;
  protocol: string;
  powerW: number;
  price: number;
}

interface PlacedDevice extends SmartDevice {
  id: string;
  position: Position3D;
  zone: string;
}

interface AutomationRule {
  id: string;
  name: string;
  trigger: {
    deviceId: string;
    event: string;
    condition?: string;
  };
  action: {
    deviceId: string;
    command: string;
    params?: Record<string, unknown>;
  };
  enabled: boolean;
}

interface CoveragePoint {
  x: number;
  z: number;
  signalStrength: number;
}

interface CoverageMap {
  protocol: string;
  routerPosition: Position3D;
  points: CoveragePoint[];
  deadZones: Array<{ x: number; z: number; radius: number }>;
  overallScore: number;
}

interface SmartHomePlan {
  id: string;
  kitchenId: string;
  userId: string;
  devices: PlacedDevice[];
  wifiCoverage: CoverageMap | null;
  circuits: Array<{
    name: string;
    type: string;
    amperage: number;
    outlets: Array<{ position: Position3D; amperage: number }>;
    totalLoadW: number;
  }>;
  automations: AutomationRule[];
  matterDevices: PlacedDevice[];
  totalPowerDraw: number;
  totalCost: number;
}

// Device category groupings
const DEVICE_CATEGORIES: Record<string, string[]> = {
  lighting: ['smart_light', 'smart_light_strip'],
  sensors: ['smoke_detector', 'water_sensor', 'temp_humidity', 'co_detector'],
  appliances: ['smart_fridge', 'smart_oven', 'smart_dishwasher', 'smart_hood'],
  connectivity: ['smart_outlet', 'wifi_router', 'matter_hub'],
};

const CATEGORY_LABELS: Record<string, string> = {
  lighting: 'smartHome.categories.lighting',
  sensors: 'smartHome.categories.sensors',
  appliances: 'smartHome.categories.appliances',
  connectivity: 'smartHome.categories.connectivity',
};

const DEVICE_ICONS: Record<string, string> = {
  smart_outlet: 'M13 10V3L4 14h7v7l9-11h-7z',
  smart_light:
    'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  smart_light_strip:
    'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  smoke_detector:
    'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  water_sensor:
    'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
  temp_humidity: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z',
  co_detector:
    'M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01',
  smart_fridge:
    'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  smart_oven:
    'M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z',
  smart_dishwasher:
    'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
  smart_hood: 'M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12',
  wifi_router:
    'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0',
  matter_hub:
    'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
};

const PROTOCOL_COLORS: Record<string, string> = {
  WiFi: 'bg-blue-500',
  Zigbee: 'bg-green-500',
  Thread: 'bg-purple-500',
  'WiFi/Matter': 'bg-indigo-500',
  'Matter/Thread': 'bg-violet-500',
  'WiFi 6E/Thread': 'bg-cyan-500',
};

// Max circuit load for French NF C 15-100 (230V standard)
const MAX_CIRCUIT_LOAD_W = 3680; // 16A * 230V

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SmartHomePlanner: React.FC = () => {
  const { kitchenId: urlKitchenId } = useParams<{ kitchenId?: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // State
  const [kitchenId, setKitchenId] = useState<string>(urlKitchenId ?? '');
  const [plan, setPlan] = useState<SmartHomePlan | null>(null);
  const [catalog, setCatalog] = useState<SmartDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('lighting');
  const [showCoverage, setShowCoverage] = useState(false);
  const [showAutomationBuilder, setShowAutomationBuilder] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [kitchens, setKitchens] = useState<Array<{ id: string; name: string }>>([]);

  // Automation builder state
  const [newAutomation, setNewAutomation] = useState({
    name: '',
    triggerEvent: '',
    triggerCondition: '',
    actionCommand: '',
  });

  // AbortController for cleanup
  const controllerRef = useRef<AbortController | null>(null);

  // Fetch user kitchens for selector
  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;

    const fetchKitchens = async () => {
      try {
        const res = await fetch('/api/v1/kitchens', {
          credentials: 'include',
          signal: controller.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as
            | { data?: Array<{ id: string; name: string }> }
            | Array<{ id: string; name: string }>;
          const list = Array.isArray(data) ? data : (data.data ?? []);
          setKitchens(list);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        logger.error('Failed to fetch kitchens', err instanceof Error ? err : { error: err });
      }
    };

    void fetchKitchens();
    return () => controller.abort();
  }, []);

  // Fetch device catalog
  useEffect(() => {
    const controller = new AbortController();

    const fetchCatalog = async () => {
      try {
        const res = await fetch('/api/v1/smart-home/devices', {
          credentials: 'include',
          signal: controller.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as { data?: SmartDevice[] };
          setCatalog(data.data ?? []);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        logger.error('Failed to fetch device catalog', err instanceof Error ? err : { error: err });
      }
    };

    void fetchCatalog();
    return () => controller.abort();
  }, []);

  // Fetch existing plan when kitchenId changes
  useEffect(() => {
    if (!kitchenId) {
      return;
    }
    const controller = new AbortController();

    const fetchPlan = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/v1/smart-home/${kitchenId}`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as { data?: SmartHomePlan | null };
          setPlan(data.data ?? null);
        } else if (res.status === 404) {
          setPlan(null);
        } else {
          throw new Error('Failed to load smart home plan');
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchPlan();
    return () => controller.abort();
  }, [kitchenId, retryCount]);

  // Generate a new plan with AI
  const handleGeneratePlan = useCallback(async () => {
    if (!kitchenId) {
      return;
    }
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/smart-home', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kitchenId,
          preferences: {
            priorities: ['comfort', 'security'],
          },
        }),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error ?? 'Failed to generate smart home plan');
      }

      const data = (await res.json()) as { data?: SmartHomePlan | null };
      setPlan(data.data ?? null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(msg);
      logger.error('Failed to generate plan', err instanceof Error ? err : { error: err });
    } finally {
      setIsGenerating(false);
    }
  }, [kitchenId]);

  // Save / update plan
  const handleSavePlan = useCallback(async () => {
    if (!kitchenId || !plan) {
      return;
    }
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/smart-home/${kitchenId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devices: plan.devices,
          automations: plan.automations,
          circuits: plan.circuits,
          wifiCoverage: plan.wifiCoverage,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save plan');
      }

      const data = (await res.json()) as { data?: SmartHomePlan | null };
      setPlan(data.data ?? plan);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  }, [kitchenId, plan]);

  // Remove device from plan
  const handleRemoveDevice = useCallback((deviceId: string) => {
    setPlan((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        devices: prev.devices.filter((d) => d.id !== deviceId),
        totalPowerDraw: prev.devices
          .filter((d) => d.id !== deviceId)
          .reduce((sum, d) => sum + d.powerW, 0),
        totalCost: prev.devices
          .filter((d) => d.id !== deviceId)
          .reduce((sum, d) => sum + d.price, 0),
      };
    });
  }, []);

  // Add device from catalog to plan
  const handleAddDevice = useCallback((device: SmartDevice) => {
    setPlan((prev) => {
      if (!prev) {
        return prev;
      }
      const newDevice: PlacedDevice = {
        ...device,
        id: `shd_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        position: { x: 2, y: 1, z: 1.5 },
        zone: 'general',
      };
      const devices = [...prev.devices, newDevice];
      return {
        ...prev,
        devices,
        totalPowerDraw: devices.reduce((sum, d) => sum + d.powerW, 0),
        totalCost: devices.reduce((sum, d) => sum + d.price, 0),
      };
    });
  }, []);

  // Add automation rule
  const handleAddAutomation = useCallback(() => {
    if (!newAutomation.name || !newAutomation.triggerEvent || !newAutomation.actionCommand) {
      return;
    }

    setPlan((prev) => {
      if (!prev) {
        return prev;
      }
      const rule: AutomationRule = {
        id: `sha_${Date.now()}`,
        name: newAutomation.name,
        trigger: {
          deviceId: prev.devices[0]?.id ?? '',
          event: newAutomation.triggerEvent,
          condition: newAutomation.triggerCondition || undefined,
        },
        action: {
          deviceId: prev.devices[0]?.id ?? '',
          command: newAutomation.actionCommand,
        },
        enabled: true,
      };
      return { ...prev, automations: [...prev.automations, rule] };
    });

    setNewAutomation({ name: '', triggerEvent: '', triggerCondition: '', actionCommand: '' });
  }, [newAutomation]);

  // Remove automation
  const handleRemoveAutomation = useCallback((ruleId: string) => {
    setPlan((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        automations: prev.automations.filter((a) => a.id !== ruleId),
      };
    });
  }, []);

  // Calculate coverage
  const handleCalculateCoverage = useCallback(async () => {
    if (!kitchenId) {
      return;
    }

    try {
      const res = await fetch(
        `/api/v1/smart-home/${kitchenId}/coverage?routerX=2&routerY=1.5&routerZ=0&protocol=WiFi`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = (await res.json()) as { data?: CoverageMap | null };
        setPlan((prev) => (prev ? { ...prev, wifiCoverage: data.data ?? null } : prev));
        setShowCoverage(true);
      }
    } catch (err) {
      logger.error('Failed to calculate coverage', err instanceof Error ? err : { error: err });
    }
  }, [kitchenId]);

  // Filtered catalog by active category
  const filteredCatalog = catalog.filter((d) =>
    (DEVICE_CATEGORIES[activeCategory] ?? []).includes(d.type)
  );

  // Power budget warnings
  const powerWarning = plan && plan.totalPowerDraw > MAX_CIRCUIT_LOAD_W;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!kitchenId) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {t('smartHome.title', 'Smart Home Planner')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {t('smartHome.selectKitchen', 'Select a kitchen to start planning smart devices.')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {kitchens.map((k) => (
            <button
              key={k.id}
              onClick={() => {
                setKitchenId(k.id);
                navigate(`/smart-home/${k.id}`, { replace: true });
              }}
              className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors text-left"
            >
              <h3 className="font-medium text-gray-900 dark:text-white">
                {k.name || 'Unnamed Kitchen'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{k.id.slice(0, 8)}...</p>
            </button>
          ))}
          {kitchens.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 col-span-full">
              {t('smartHome.noKitchens', 'No kitchens found. Create a kitchen design first.')}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('smartHome.title', 'Smart Home Planner')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {t(
              'smartHome.subtitle',
              'Plan smart devices, automations, and connectivity for your kitchen.'
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {!plan && (
            <button
              onClick={handleGeneratePlan}
              disabled={isGenerating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium text-sm"
            >
              {isGenerating
                ? t('smartHome.generating', 'Generating...')
                : t('smartHome.generatePlan', 'Generate AI Plan')}
            </button>
          )}
          {plan && (
            <button
              onClick={handleSavePlan}
              disabled={isSaving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium text-sm"
            >
              {isSaving ? t('common.saving', 'Saving...') : t('smartHome.save', 'Sauvegarder')}
            </button>
          )}
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
          >
            {t('common.goBack', 'Go Back')}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setRetryCount((c) => c + 1);
            }}
            className="mt-2 text-sm text-red-600 dark:text-red-400 underline hover:no-underline"
          >
            {t('common.tryAgain', 'Try Again')}
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            {t('common.loading', 'Loading...')}
          </span>
        </div>
      )}

      {/* Main content */}
      {!isLoading && plan && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Device Catalog */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  {t('smartHome.deviceCatalog', 'Device Catalog')}
                </h2>
              </div>

              {/* Category tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                {Object.keys(DEVICE_CATEGORIES).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                      activeCategory === cat
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {t(CATEGORY_LABELS[cat] ?? cat, cat.charAt(0).toUpperCase() + cat.slice(1))}
                  </button>
                ))}
              </div>

              {/* Device list */}
              <div className="p-2 max-h-96 overflow-y-auto space-y-2">
                {filteredCatalog.map((device, idx) => (
                  <div
                    key={`${device.type}-${device.brand}-${idx}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d={DEVICE_ICONS[device.type] ?? 'M13 10V3L4 14h7v7l9-11h-7z'}
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {device.brand} {device.model}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`inline-block px-1.5 py-0.5 text-xs text-white rounded ${
                            PROTOCOL_COLORS[device.protocol] ?? 'bg-gray-500'
                          }`}
                        >
                          {device.protocol}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {device.powerW}W
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {device.price}&euro;
                      </p>
                      <button
                        onClick={() => handleAddDevice(device)}
                        className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        + {t('smartHome.add', 'Add')}
                      </button>
                    </div>
                  </div>
                ))}
                {filteredCatalog.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    {t('smartHome.noDevices', 'No devices in this category.')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Center Column: Floor Plan + Coverage */}
          <div className="lg:col-span-1 space-y-4">
            {/* Placed devices / floor plan area */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  {t('smartHome.placedDevices', 'Placed Devices')}
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {plan.devices.length} {t('smartHome.deviceCount', 'device(s)')}
                </span>
              </div>

              {/* Simple 2D floor plan representation */}
              <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-gray-900 m-4 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                {/* Grid */}
                <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 opacity-20">
                  {Array.from({ length: 48 }).map((_, i) => (
                    <div key={i} className="border border-gray-400 dark:border-gray-600" />
                  ))}
                </div>

                {/* Coverage overlay */}
                {showCoverage && plan.wifiCoverage && (
                  <div className="absolute inset-0 opacity-30">
                    {plan.wifiCoverage.points
                      .filter((_, i) => i % 4 === 0)
                      .map((pt, i) => {
                        const green = Math.round((pt.signalStrength / 100) * 255);
                        const red = 255 - green;
                        return (
                          <div
                            key={i}
                            className="absolute w-2 h-2 rounded-full"
                            style={{
                              left: `${(pt.x / 4) * 100}%`,
                              top: `${(pt.z / 3) * 100}%`,
                              backgroundColor: `rgb(${red}, ${green}, 0)`,
                            }}
                          />
                        );
                      })}
                  </div>
                )}

                {/* Device markers */}
                {plan.devices.map((device) => (
                  <div
                    key={device.id}
                    className="absolute w-6 h-6 -ml-3 -mt-3 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                    style={{
                      left: `${(device.position.x / 4) * 100}%`,
                      top: `${(device.position.z / 3) * 100}%`,
                    }}
                    title={`${device.brand} ${device.model}`}
                  >
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={DEVICE_ICONS[device.type] ?? 'M13 10V3L4 14h7v7l9-11h-7z'}
                      />
                    </svg>
                  </div>
                ))}

                {/* Room label */}
                <div className="absolute bottom-2 left-2 text-xs text-gray-500 dark:text-gray-400">
                  {t('smartHome.floorPlan', 'Kitchen Floor Plan')}
                </div>
              </div>

              {/* Coverage toggle */}
              <div className="px-4 pb-4 flex gap-2">
                <button
                  onClick={handleCalculateCoverage}
                  className="px-3 py-1.5 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  {t('smartHome.calculateCoverage', 'Calculate Coverage')}
                </button>
                {plan.wifiCoverage && (
                  <button
                    onClick={() => setShowCoverage(!showCoverage)}
                    className={`px-3 py-1.5 text-xs rounded transition-colors ${
                      showCoverage
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {showCoverage
                      ? t('smartHome.hideCoverage', 'Hide Coverage')
                      : t('smartHome.showCoverage', 'Show Coverage')}
                  </button>
                )}
                {plan.wifiCoverage && (
                  <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    {t('smartHome.signalScore', 'Signal')}: {plan.wifiCoverage.overallScore}%
                  </span>
                )}
              </div>

              {/* Device list */}
              <div className="px-4 pb-4 space-y-2 max-h-48 overflow-y-auto">
                {plan.devices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-700/50 rounded px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          PROTOCOL_COLORS[device.protocol] ?? 'bg-gray-500'
                        }`}
                      />
                      <span className="truncate text-gray-900 dark:text-white">
                        {device.brand} {device.model}
                      </span>
                      {device.protocol.toLowerCase().includes('matter') && (
                        <span className="px-1 py-0.5 text-[10px] bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded">
                          Matter
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveDevice(device.id)}
                      className="text-red-500 hover:text-red-700 dark:hover:text-red-400 ml-2 flex-shrink-0"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Summary, Power, Automations */}
          <div className="lg:col-span-1 space-y-4">
            {/* Power Budget */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3">
                {t('smartHome.powerBudget', 'Power Budget')}
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('smartHome.totalPower', 'Total Power Draw')}
                  </span>
                  <span
                    className={`font-semibold ${
                      powerWarning
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {plan.totalPowerDraw.toFixed(0)}W
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      powerWarning ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (plan.totalPowerDraw / MAX_CIRCUIT_LOAD_W) * 100)}%`,
                    }}
                  />
                </div>
                {powerWarning && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {t(
                      'smartHome.circuitOverload',
                      'Warning: Exceeds single 16A circuit capacity (3680W). Consider distributing across multiple circuits.'
                    )}
                  </p>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('smartHome.circuitCapacity', 'Circuit 16A')}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">{MAX_CIRCUIT_LOAD_W}W</span>
                </div>
              </div>
            </div>

            {/* Cost Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3">
                {t('smartHome.costSummary', 'Cost Summary')}
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('smartHome.devicesCost', 'Devices')}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {plan.totalCost.toFixed(0)}&euro;
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('smartHome.installationEstimate', 'Installation (est.)')}
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {Math.round(plan.totalCost * 0.15)}&euro;
                  </span>
                </div>
                <hr className="border-gray-200 dark:border-gray-700" />
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-gray-900 dark:text-white">
                    {t('smartHome.total', 'Total')}
                  </span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {Math.round(plan.totalCost * 1.15)}&euro;
                  </span>
                </div>
              </div>
            </div>

            {/* Matter Compatibility */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3">
                {t('smartHome.matterCompatibility', 'Matter 1.3 Compatibility')}
              </h2>
              {plan.matterDevices.length > 0 ? (
                <div className="space-y-1">
                  {plan.matterDevices.map((d) => (
                    <div key={d.id} className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 rounded-full bg-violet-500" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {d.brand} {d.model}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('smartHome.noMatterDevices', 'No Matter-compatible devices in plan.')}
                </p>
              )}
            </div>

            {/* Automations */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  {t('smartHome.automations', 'Automations')}
                </h2>
                <button
                  onClick={() => setShowAutomationBuilder(!showAutomationBuilder)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showAutomationBuilder
                    ? t('common.close', 'Close')
                    : `+ ${t('smartHome.addRule', 'Add Rule')}`}
                </button>
              </div>

              {/* Automation builder */}
              {showAutomationBuilder && (
                <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2">
                  <input
                    type="text"
                    placeholder={t('smartHome.ruleName', 'Rule name')}
                    value={newAutomation.name}
                    onChange={(e) =>
                      setNewAutomation((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">IF</span>
                  </div>
                  <input
                    type="text"
                    placeholder={t('smartHome.triggerEvent', 'e.g. Motion detected')}
                    value={newAutomation.triggerEvent}
                    onChange={(e) =>
                      setNewAutomation((prev) => ({ ...prev, triggerEvent: e.target.value }))
                    }
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">THEN</span>
                  </div>
                  <input
                    type="text"
                    placeholder={t('smartHome.actionCommand', 'e.g. Lights ON')}
                    value={newAutomation.actionCommand}
                    onChange={(e) =>
                      setNewAutomation((prev) => ({ ...prev, actionCommand: e.target.value }))
                    }
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <button
                    onClick={handleAddAutomation}
                    disabled={
                      !newAutomation.name ||
                      !newAutomation.triggerEvent ||
                      !newAutomation.actionCommand
                    }
                    className="w-full px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {t('smartHome.addAutomation', 'Add Automation')}
                  </button>
                </div>
              )}

              {/* Existing automations */}
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {plan.automations.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-700/50 rounded px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {rule.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        IF {rule.trigger.event} → {rule.action.command}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveAutomation(rule.id)}
                      className="text-red-500 hover:text-red-700 dark:hover:text-red-400 ml-2 flex-shrink-0"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
                {plan.automations.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                    {t('smartHome.noAutomations', 'No automation rules yet.')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state -- no plan yet */}
      {!isLoading && !plan && !isGenerating && kitchenId && (
        <div className="text-center py-16">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('smartHome.noplan', 'No Smart Home Plan Yet')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {t(
              'smartHome.noPlanDesc',
              'Generate an AI-powered smart home plan with device recommendations, automation rules, and coverage analysis.'
            )}
          </p>
          <button
            onClick={handleGeneratePlan}
            disabled={isGenerating}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {t('smartHome.generatePlan', 'Generate AI Plan')}
          </button>
        </div>
      )}
    </div>
  );
};

export default SmartHomePlanner;
