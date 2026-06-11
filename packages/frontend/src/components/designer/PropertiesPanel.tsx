import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';

import {
  KITCHEN_MATERIALS,
  MaterialLibrary,
  type KitchenEngine,
 type KitchenMaterial } from '@kitchenxpert/3d-engine';



interface PropertiesPanelProps {
  selectedObject: THREE.Object3D | null;
  engine: KitchenEngine | null;
  removeSelected: () => void;
  duplicateSelected: () => void;
}

interface ObjectTransform {
  posX: number;
  posY: number;
  posZ: number;
  rotY: number;
}

/** Shape of the userData KitchenXpert attaches to scene objects (set by CatalogPanel). */
interface KitchenObjectUserData {
  dimensions?: { width: number; height: number; depth: number };
  materialId?: string;
  type?: string;
  id?: string;
  name?: string;
}

function getUserData(object: THREE.Object3D): KitchenObjectUserData {
  return object.userData as KitchenObjectUserData;
}

function getObjectDimensions(object: THREE.Object3D): { width: number; height: number; depth: number } {
  // Try userData first (set by CatalogPanel)
  const dimensions = getUserData(object).dimensions;
  if (dimensions) {
    return {
      width: Math.round(dimensions.width * 1000),
      height: Math.round(dimensions.height * 1000),
      depth: Math.round(dimensions.depth * 1000),
    };
  }

  // Fallback: compute bounding box
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  return {
    width: Math.round(size.x * 1000),
    height: Math.round(size.y * 1000),
    depth: Math.round(size.z * 1000),
  };
}

function NumberInput({
  label,
  value,
  onChange,
  unit = 'mm',
  readOnly = false,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange?: (value: number) => void;
  unit?: string;
  readOnly?: boolean;
  min?: number;
  max?: number;
  step?: number;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 w-6 text-right">
        {label}
      </label>
      <div className="relative flex-1">
        <input
          type="number"
          value={Math.round(value * 10) / 10}
          onChange={(e) => onChange?.(parseFloat(e.target.value) || 0)}
          readOnly={readOnly}
          min={min}
          max={max}
          step={step}
          className={`w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-md
            ${readOnly
              ? 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-default'
              : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500'
            }
          `}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
          {unit}
        </span>
      </div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mt-4 mb-2 first:mt-0">
      {children}
    </h3>
  );
}

const materialLibrary = new MaterialLibrary();

// Group materials by type for organized display
const MATERIAL_TYPES: { type: KitchenMaterial['type']; label: string }[] = [
  { type: 'wood', label: 'Bois' },
  { type: 'stone', label: 'Pierre' },
  { type: 'metal', label: 'Metal' },
  { type: 'laminate', label: 'Laque / Stratifie' },
  { type: 'glass', label: 'Verre' },
  { type: 'ceramic', label: 'Ceramique' },
];

export default function PropertiesPanel({
  selectedObject,
  engine: _engine,
  removeSelected,
  duplicateSelected,
}: PropertiesPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const [transform, setTransform] = useState<ObjectTransform>({
    posX: 0,
    posY: 0,
    posZ: 0,
    rotY: 0,
  });
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [materialSectionOpen, setMaterialSectionOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Close delete confirmation on Escape key
  useEffect(() => {
    if (!showDeleteConfirm) {return;}
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowDeleteConfirm(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteConfirm]);

  // Focus trap for delete confirmation modal
  useEffect(() => {
    if (!showDeleteConfirm) {return;}
    requestAnimationFrame(() => {
      const modal = document.querySelector('[data-delete-confirm-modal]');
      if (modal) {
        const cancelBtn = modal.querySelector<HTMLElement>('button:not([disabled])');
        cancelBtn?.focus();
      }
    });
  }, [showDeleteConfirm]);

  // Sync transform state from the selected object
  useEffect(() => {
    if (!selectedObject) {return;}

    const updateFromObject = () => {
      setTransform({
        posX: Math.round(selectedObject.position.x * 1000),
        posY: Math.round(selectedObject.position.y * 1000),
        posZ: Math.round(selectedObject.position.z * 1000),
        rotY: THREE.MathUtils.radToDeg(selectedObject.rotation.y),
      });
    };

    updateFromObject();

    // Poll for transform changes (e.g. from TransformControls dragging)
    const interval = setInterval(updateFromObject, 100);
    return () => clearInterval(interval);
  }, [selectedObject]);

  // Read current material from object if available
  useEffect(() => {
    if (!selectedObject) {
      setSelectedMaterialId(null);
      return;
    }
    const matId = getUserData(selectedObject).materialId ?? null;
    setSelectedMaterialId(matId);
  }, [selectedObject]);

  const updatePosition = useCallback(
    (axis: 'x' | 'y' | 'z', valueMm: number) => {
      if (!selectedObject) {return;}
      const valueMeters = valueMm / 1000;
      selectedObject.position[axis] = valueMeters;

      setTransform((prev) => ({
        ...prev,
        [`pos${axis.toUpperCase()}`]: valueMm,
      }));
    },
    [selectedObject]
  );

  const updateRotationY = useCallback(
    (degrees: number) => {
      if (!selectedObject) {return;}
      selectedObject.rotation.y = THREE.MathUtils.degToRad(degrees);
      setTransform((prev) => ({ ...prev, rotY: degrees }));
    },
    [selectedObject]
  );

  const applyMaterial = useCallback(
    (material: KitchenMaterial) => {
      if (!selectedObject) {return;}
      materialLibrary.applyMaterial(selectedObject, material);
      selectedObject.userData.materialId = material.id;
      setSelectedMaterialId(material.id);
    },
    [selectedObject]
  );

  if (!selectedObject) {
    return (
      <div className="w-72 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 h-full flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {t('designer.properties.title', 'Proprietes')}
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
            {t('designer.properties.noSelection', 'Selectionnez un objet pour voir ses proprietes')}
          </p>
        </div>
      </div>
    );
  }

  const dimensions = getObjectDimensions(selectedObject);
  const userData = getUserData(selectedObject);
  const objectType = userData.type ?? t('designer.properties.unknownType', 'Inconnu');
  const objectId = userData.id ?? selectedObject.uuid.slice(0, 8);
  const objectName = userData.name ?? objectType;

  return (
    <div className="w-72 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {t('designer.properties.title', 'Proprietes')}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Object info */}
        <SectionHeader>{t('designer.properties.object', 'Objet')}</SectionHeader>
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('designer.properties.name', 'Nom')}
            </span>
            <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate max-w-[140px]">
              {objectName}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('designer.properties.type', 'Type')}
            </span>
            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
              {objectType}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">ID</span>
            <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 truncate max-w-[140px]">
              {objectId}
            </span>
          </div>
        </div>

        {/* Position */}
        <SectionHeader>{t('designer.properties.position', 'Position')}</SectionHeader>
        <div className="space-y-1.5 mb-3">
          <NumberInput
            label="X"
            value={transform.posX}
            onChange={(v) => updatePosition('x', v)}
          />
          <NumberInput
            label="Y"
            value={transform.posY}
            onChange={(v) => updatePosition('y', v)}
          />
          <NumberInput
            label="Z"
            value={transform.posZ}
            onChange={(v) => updatePosition('z', v)}
          />
        </div>

        {/* Rotation */}
        <SectionHeader>{t('designer.properties.rotation', 'Rotation')}</SectionHeader>
        <div className="space-y-2 mb-3">
          <NumberInput
            label="Y"
            value={transform.rotY}
            onChange={updateRotationY}
            unit={'\u00B0'}
            min={0}
            max={360}
            step={15}
          />
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={transform.rotY}
            onChange={(e) => updateRotationY(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        {/* Dimensions (read-only) */}
        <SectionHeader>{t('designer.properties.dimensions', 'Dimensions')}</SectionHeader>
        <div className="space-y-1.5 mb-3">
          <NumberInput label={t('designer.properties.widthLabel', 'L')} value={dimensions.width} readOnly />
          <NumberInput label={t('designer.properties.heightLabel', 'H')} value={dimensions.height} readOnly />
          <NumberInput label={t('designer.properties.depthLabel', 'P')} value={dimensions.depth} readOnly />
        </div>

        {/* Material selector */}
        <SectionHeader>{t('designer.properties.material', 'Materiau')}</SectionHeader>
        <button
          onClick={() => setMaterialSectionOpen(!materialSectionOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors mb-2"
        >
          <span className="flex items-center gap-2">
            {selectedMaterialId && (
              <span
                className="w-4 h-4 rounded-sm border border-gray-300 dark:border-gray-500 inline-block"
                style={{
                  backgroundColor:
                    KITCHEN_MATERIALS.find((m: KitchenMaterial) => m.id === selectedMaterialId)?.color || '#888',
                }}
              />
            )}
            <span className="text-gray-700 dark:text-gray-300">
              {selectedMaterialId
                ? KITCHEN_MATERIALS.find((m: KitchenMaterial) => m.id === selectedMaterialId)?.name ||
                  t('designer.properties.unknownMaterial', 'Inconnu')
                : t('designer.properties.selectMaterial', 'Choisir un materiau')}
            </span>
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${materialSectionOpen ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {materialSectionOpen && (
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden mb-3">
            {MATERIAL_TYPES.map((group) => {
              const materials = KITCHEN_MATERIALS.filter((m: KitchenMaterial) => m.type === group.type);
              if (materials.length === 0) {return null;}

              return (
                <div key={group.type} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-750 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t(`designer.materials.${group.type}`, group.label)}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2">
                    {materials.map((mat: KitchenMaterial) => (
                      <button
                        key={mat.id}
                        onClick={() => applyMaterial(mat)}
                        title={mat.name}
                        className={`flex flex-col items-center gap-0.5 p-1 rounded-md border-2 transition-all duration-150 ${
                          selectedMaterialId === mat.id
                            ? 'border-blue-500 ring-1 ring-blue-300 scale-105'
                            : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 hover:scale-105'
                        }`}
                      >
                        <div
                          className="w-full aspect-square rounded-sm"
                          style={{ backgroundColor: mat.color }}
                        />
                        <span className="text-[8px] text-gray-600 dark:text-gray-400 truncate w-full text-center leading-tight">
                          {mat.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <SectionHeader>{t('designer.properties.actions', 'Actions')}</SectionHeader>
        <div className="flex gap-2">
          <button
            onClick={duplicateSelected}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="8" y="8" width="12" height="12" rx="2" />
              <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
            </svg>
            {t('designer.properties.duplicate', 'Dupliquer')}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t('designer.properties.delete', 'Supprimer')}
          </button>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Modal backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteConfirm(false)}
            role="presentation"
          />

          {/* Modal content */}
          <div data-delete-confirm-modal role="dialog" aria-modal="true" className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('designer.properties.deleteConfirmTitle', 'Supprimer cet element ?')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {t('designer.properties.deleteConfirmMessage', 'Cet element sera supprime de la scene. Vous pouvez annuler avec Ctrl+Z.')}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                onClick={() => {
                  removeSelected();
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                {t('designer.properties.delete', 'Supprimer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
