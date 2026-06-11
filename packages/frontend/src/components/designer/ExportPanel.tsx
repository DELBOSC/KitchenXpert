import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';


import { GLTFExporterUtil, DXFExporter, IFCExporter, CNCExporter, type KitchenEngine , type KitchenSceneData } from '@kitchenxpert/3d-engine';

import { PDFQuoteGenerator } from '../../services/pdf-quote-generator';

import type * as THREE from 'three';


interface ExportPanelProps {
  engine: KitchenEngine | null;
  isOpen: boolean;
  onClose: () => void;
}

type ExportFormat = 'glb' | 'gltf';

interface ResolutionOption {
  label: string;
  width: number;
  height: number;
}

const RESOLUTION_OPTIONS: ResolutionOption[] = [
  { label: '1920 x 1080 (Full HD)', width: 1920, height: 1080 },
  { label: '2560 x 1440 (2K)', width: 2560, height: 1440 },
  { label: '3840 x 2160 (4K)', width: 3840, height: 2160 },
  { label: '1080 x 1080 (Square)', width: 1080, height: 1080 },
];

export default function ExportPanel({ engine, isOpen, onClose }: ExportPanelProps): React.ReactElement | null {
  const { t } = useTranslation();
  const [exportFormat, setExportFormat] = useState<ExportFormat>('glb');
  const [selectedResolution, setSelectedResolution] = useState(0); // index into RESOLUTION_OPTIONS
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [pdfProjectName, setPdfProjectName] = useState(() => t('export.myKitchen', 'Ma cuisine'));
  const [pdfClientName, setPdfClientName] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const exporterRef = useRef<GLTFExporterUtil>(new GLTFExporterUtil());
  const dxfExporterRef = useRef<DXFExporter>(new DXFExporter());
  const ifcExporterRef = useRef<IFCExporter>(new IFCExporter());
  const cncExporterRef = useRef<CNCExporter>(new CNCExporter());

  // Close on click outside
  useEffect(() => {
    if (!isOpen) {return;}

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {onClose();}
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Auto-dismiss export status after 5 seconds
  useEffect(() => {
    if (!exportStatus) {return;}
    const timer = setTimeout(() => setExportStatus(null), 5000);
    return () => clearTimeout(timer);
  }, [exportStatus]);

  const handleExportGLTF = useCallback(async () => {
    if (!engine) {return;}

    setIsExporting(true);
    setExportStatus(null);

    try {
      const exporter = exporterRef.current;
      const binary = exportFormat === 'glb';
      await exporter.downloadGLTF(
        engine.scene.getThreeScene(),
        'kitchen-design',
        binary
      );
      setExportStatus(t('designer.export.success', 'Export reussi !'));
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus(t('designer.export.error', 'Erreur lors de l\'export'));
    } finally {
      setIsExporting(false);
    }
  }, [engine, exportFormat, t]);

  const handleScreenshot = useCallback(() => {
    if (!engine) {return;}

    setIsExporting(true);
    setExportStatus(null);

    try {
      const exporter = exporterRef.current;
      const resolution = RESOLUTION_OPTIONS[selectedResolution];
      if (!resolution) {return;}

      exporter.downloadScreenshot(
        engine.renderer.getThreeRenderer(),
        engine.scene.getThreeScene(),
        engine.camera.getThreeCamera(),
        {
          width: resolution.width,
          height: resolution.height,
          superSampling: 2,
          format: 'image/png',
          quality: 1.0,
        },
        'kitchen-screenshot'
      );
      setExportStatus(t('designer.export.screenshotSuccess', 'Capture reussie !'));
    } catch (error) {
      console.error('Screenshot failed:', error);
      setExportStatus(t('designer.export.screenshotError', 'Erreur lors de la capture'));
    } finally {
      setIsExporting(false);
    }
  }, [engine, selectedResolution, t]);

  const handleDXFExport = useCallback(() => {
    if (!engine) {return;}

    setIsExporting(true);
    setExportStatus(null);

    try {
      const dxfExporter = dxfExporterRef.current;
      const sceneData: KitchenSceneData = {
        threeScene: engine.scene.getThreeScene(),
        objects: engine.scene.getAllObjects(),
        roomWidth: engine.roomWidth,
        roomDepth: engine.roomDepth,
        roomHeight: engine.roomHeight,
      };

      dxfExporter.download(sceneData, 'kitchen-plan', {
        includeAnnotations: true,
        includeFurniture: true,
        includeTechnicalPoints: true,
      });

      setExportStatus(t('designer.export.dxfSuccess', 'Export DXF reussi !'));
    } catch (error) {
      console.error('DXF export failed:', error);
      setExportStatus(t('designer.export.dxfError', 'Erreur lors de l\'export DXF'));
    } finally {
      setIsExporting(false);
    }
  }, [engine, t]);

  const handleIFCExport = useCallback(() => {
    if (!engine) {return;}

    setIsExporting(true);
    setExportStatus(null);

    try {
      const ifcExporter = ifcExporterRef.current;
      const sceneData: KitchenSceneData = {
        threeScene: engine.scene.getThreeScene(),
        objects: engine.scene.getAllObjects(),
        roomWidth: engine.roomWidth,
        roomDepth: engine.roomDepth,
        roomHeight: engine.roomHeight,
      };

      ifcExporter.download(sceneData, 'kitchen-design', {
        projectName: pdfProjectName || t('export.myKitchen', 'Ma cuisine'),
        includeProperties: true,
        includeMEP: true,
      });

      setExportStatus(t('designer.export.ifcSuccess', 'Export IFC reussi !'));
    } catch (error) {
      console.error('IFC export failed:', error);
      setExportStatus(t('designer.export.ifcError', 'Erreur lors de l\'export IFC'));
    } finally {
      setIsExporting(false);
    }
  }, [engine, pdfProjectName, t]);

  const handleCNCExport = useCallback(() => {
    if (!engine) {return;}

    setIsExporting(true);
    setExportStatus(null);

    try {
      const cncExporter = cncExporterRef.current;
      const sceneData: KitchenSceneData = {
        threeScene: engine.scene.getThreeScene(),
        objects: engine.scene.getAllObjects(),
        roomWidth: engine.roomWidth,
        roomDepth: engine.roomDepth,
        roomHeight: engine.roomHeight,
      };

      const cutList = cncExporter.generateCutList(sceneData);
      cncExporter.downloadCSV(cutList, 'kitchen-cut-list');

      setExportStatus(t('designer.export.cncSuccess', 'Export CNC reussi !'));
    } catch (error) {
      console.error('CNC export failed:', error);
      setExportStatus(t('designer.export.cncError', 'Erreur lors de l\'export CNC'));
    } finally {
      setIsExporting(false);
    }
  }, [engine, t]);

  const handlePDFExport = useCallback(async () => {
    if (!engine) {return;}

    setIsExporting(true);
    setExportStatus(null);

    try {
      const generator = new PDFQuoteGenerator(engine, engine.brandProfile, {
        projectName: pdfProjectName || t('export.myKitchen', 'Ma cuisine'),
        clientName: pdfClientName || t('export.client', 'Client'),
      });
      const blob = await generator.generatePDF();

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `devis-${pdfProjectName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setExportStatus(t('designer.export.pdfSuccess', 'Devis PDF genere !'));
    } catch (error) {
      console.error('PDF generation failed:', error);
      setExportStatus(t('designer.export.pdfError', 'Erreur lors de la generation du PDF'));
    } finally {
      setIsExporting(false);
    }
  }, [engine, pdfProjectName, pdfClientName, t]);

  const handleDesignSpecsPDF = useCallback(() => {
    if (!engine) {return;}

    setIsExporting(true);
    setExportStatus(null);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const projectName = pdfProjectName || t('export.myKitchen', 'Ma cuisine');
      const dateStr = new Date().toLocaleDateString('fr-FR');

      // ─── Title Page ─────────────────────────────────
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(t('export.pdfTitle', 'Kitchen Design Specifications'), pageWidth / 2, 60, { align: 'center' });

      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text(projectName, pageWidth / 2, 80, { align: 'center' });

      doc.setFontSize(11);
      doc.setTextColor(120, 120, 120);
      doc.text(`Date: ${dateStr}`, pageWidth / 2, 95, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      // ─── Dimensions Section ─────────────────────────
      doc.addPage();
      let yPos = 20;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(t('export.dimensions', 'Dimensions'), 14, yPos);
      yPos += 10;

      const bp = engine.brandProfile;
      const scene = engine.scene.getThreeScene();

      // Try to extract room dimensions from userData or brandProfile
      const roomData: Record<string, string> = {};
      scene.traverse((obj) => {
        if (obj.userData.type === 'floor') {
          const geom = (obj as THREE.Mesh).geometry;
          if (geom && 'parameters' in geom) {
            const params = (geom as THREE.PlaneGeometry).parameters;
            if (params) {
              roomData[t('export.width', 'Largeur')] = `${(params.width * 1000).toFixed(0)} mm`;
              roomData[t('export.depth', 'Profondeur')] = `${(params.height * 1000).toFixed(0)} mm`;
            }
          }
        }
      });

      const dimensionRows = Object.entries(roomData).map(([key, val]) => [key, val]);
      if (dimensionRows.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [[t('export.dimension', 'Dimension'), t('export.value', 'Valeur')]],
          body: dimensionRows,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 10 },
          margin: { left: 14, right: 14 },
        });
        yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY + 10 || yPos + 30;
      }

      // ─── Configuration Section ──────────────────────
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(t('export.configuration', 'Configuration'), 14, yPos);
      yPos += 10;

      const configRows: string[][] = [];
      if (bp) {
        configRows.push([t('export.brand', 'Marque'), bp.name || '-']);
        if (bp.worktop) {
          configRows.push([t('export.worktopHeight', 'Plan de travail (hauteur)'), `${((bp.worktop.surfaceY || 0) * 1000).toFixed(0)} mm`]);
        }
      }

      if (configRows.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [[t('export.parameter', 'Parametre'), t('export.value', 'Valeur')]],
          body: configRows,
          theme: 'grid',
          headStyles: { fillColor: [107, 114, 128] },
          styles: { fontSize: 10 },
          margin: { left: 14, right: 14 },
        });
        yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY + 10 || yPos + 30;
      }

      // ─── Items List Table ───────────────────────────
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(t('export.elements', 'Éléments'), 14, yPos);
      yPos += 10;

      const items: string[][] = [];
      let totalPrice = 0;
      scene.traverse((obj) => {
        const ud = obj.userData as {
          catalogItem?: unknown;
          type?: string;
          name?: string;
          brand?: string;
          width?: number | string;
          height?: number | string;
          depth?: number | string;
          price?: number | string;
        };
        if (ud.catalogItem || ud.type === 'cabinet' || ud.type === 'appliance') {
          const name = ud.name || obj.name || 'Element';
          const type = ud.type || '-';
          const brand = ud.brand || '-';
          const pos = `(${obj.position.x.toFixed(2)}, ${obj.position.y.toFixed(2)}, ${obj.position.z.toFixed(2)})`;

          let dims = '-';
          if (ud.width && ud.height && ud.depth) {
            dims = `${ud.width}x${ud.height}x${ud.depth}`;
          }

          const price = ud.price ? Number(ud.price) : 0;
          totalPrice += price;

          items.push([name, type, brand, pos, dims, price > 0 ? `${price.toFixed(2)} EUR` : '-']);
        }
      });

      if (items.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [[t('export.name', 'Nom'), t('export.type', 'Type'), t('export.brand', 'Marque'), t('export.position', 'Position'), t('export.dimensions', 'Dimensions'), t('export.price', 'Prix')]],
          body: items,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 8, cellPadding: 2 },
          margin: { left: 14, right: 14 },
          columnStyles: {
            0: { cellWidth: 40 },
            3: { cellWidth: 35 },
            4: { cellWidth: 30 },
          },
        });
        yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY + 10 || yPos + 30;
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text(t('export.noElements', 'Aucun élément dans la scène.'), 14, yPos);
        yPos += 10;
      }

      // ─── Cost Summary ───────────────────────────────
      if (totalPrice > 0) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(t('export.costSummary', 'Résumé des coûts'), 14, yPos);
        yPos += 10;

        const tax = totalPrice * 0.2;
        const total = totalPrice + tax;

        autoTable(doc, {
          startY: yPos,
          body: [
            [t('export.subtotalHT', 'Sous-total HT'), `${totalPrice.toFixed(2)} EUR`],
            [t('export.vat', 'TVA (20%)'), `${tax.toFixed(2)} EUR`],
            [t('export.totalTTC', 'Total TTC'), `${total.toFixed(2)} EUR`],
          ],
          theme: 'plain',
          styles: { fontSize: 10 },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 100 },
            1: { halign: 'right' },
          },
          margin: { left: 14, right: 14 },
        });
      }

      // Download
      const url = URL.createObjectURL(doc.output('blob'));
      const a = document.createElement('a');
      a.href = url;
      a.download = `specifications-${projectName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setExportStatus(t('designer.export.specsPdfSuccess', 'PDF des specifications genere !'));
    } catch (error) {
      console.error('Design specs PDF generation failed:', error);
      setExportStatus(t('designer.export.specsPdfError', 'Erreur lors de la generation du PDF'));
    } finally {
      setIsExporting(false);
    }
  }, [engine, pdfProjectName, t]);

  if (!isOpen) {return null;}

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" aria-hidden="true" />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={t('export.title', 'Export')}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">
                {t('designer.export.title', 'Exporter')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label={t('designer.export.close', 'Fermer')}
            >
              <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body - scrollable */}
          <div className="px-5 py-4 space-y-5 overflow-y-auto">
            {/* 3D Export section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                </svg>
                {t('designer.export.model3d', 'Modele 3D')}
              </h3>

              {/* Format selector */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setExportFormat('glb')}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-150 ${
                    exportFormat === 'glb'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="font-semibold">.GLB</div>
                  <div className="text-[10px] mt-0.5 opacity-70">
                    {t('designer.export.glbDesc', 'Binaire (recommande)')}
                  </div>
                </button>
                <button
                  onClick={() => setExportFormat('gltf')}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-150 ${
                    exportFormat === 'gltf'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="font-semibold">.GLTF</div>
                  <div className="text-[10px] mt-0.5 opacity-70">
                    {t('designer.export.gltfDesc', 'JSON (editable)')}
                  </div>
                </button>
              </div>

              <button
                onClick={handleExportGLTF}
                disabled={!engine || isExporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {isExporting ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                {t('designer.export.downloadModel', `Telecharger .${exportFormat.toUpperCase()}`)}
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700" />

            {/* Screenshot section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
                {t('designer.export.screenshot', 'Capture HD')}
              </h3>

              {/* Resolution selector */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  {t('designer.export.resolution', 'Resolution')}
                </label>
                <select
                  value={selectedResolution}
                  onChange={(e) => setSelectedResolution(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {RESOLUTION_OPTIONS.map((option, index) => (
                    <option key={index} value={index}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleScreenshot}
                disabled={!engine || isExporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-gray-800 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-900 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {isExporting ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                )}
                {t('designer.export.takeScreenshot', 'Capturer')}
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700" />

            {/* DXF/CAD Export section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l7 7m0 0l-3 10 3-3 10-3m-10-4l7 7" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21L21 3" />
                </svg>
                {t('export.dxf', 'DXF (AutoCAD)')}
              </h3>

              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {t('export.dxfDesc', '2D floor plan for CAD software')}
              </p>

              <button
                onClick={handleDXFExport}
                disabled={!engine || isExporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {isExporting ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l7 7m0 0l-3 10 3-3 10-3m-10-4l7 7" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21L21 3" />
                  </svg>
                )}
                {t('designer.export.downloadDXF', 'Telecharger .DXF')}
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700" />

            {/* IFC (BIM) Export section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {t('export.ifc', 'IFC (BIM)')}
              </h3>

              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {t('export.ifcDesc', 'Building Information Model for architects')}
              </p>

              <button
                onClick={handleIFCExport}
                disabled={!engine || isExporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {isExporting ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                )}
                {t('designer.export.downloadIFC', 'Telecharger .IFC')}
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700" />

            {/* CNC Cut List Export section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                {t('export.cnc', 'CNC Cut List')}
              </h3>

              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {t('export.cncDesc', 'Cut list and G-code for manufacturing')}
              </p>

              <button
                onClick={handleCNCExport}
                disabled={!engine || isExporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {isExporting ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                )}
                {t('designer.export.downloadCNC', 'Telecharger liste de decoupe')}
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700" />

            {/* Design Specifications PDF section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v6h6" />
                </svg>
                {t('designer.export.specsPdfTitle', 'Fiche technique PDF')}
              </h3>

              <button
                onClick={handleDesignSpecsPDF}
                disabled={!engine || isExporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {isExporting ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v6h6" />
                  </svg>
                )}
                {t('designer.export.exportSpecsPDF', 'Export PDF specifications')}
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700" />

            {/* PDF Quote section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('designer.export.pdfTitle', 'Devis PDF')}
              </h3>

              <div className="space-y-2 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('designer.export.projectName', 'Nom du projet')}
                  </label>
                  <input
                    type="text"
                    value={pdfProjectName}
                    onChange={(e) => setPdfProjectName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    placeholder={t('export.myKitchen', 'Ma cuisine')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('designer.export.clientName', 'Nom du client')}
                  </label>
                  <input
                    type="text"
                    value={pdfClientName}
                    onChange={(e) => setPdfClientName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    placeholder={t('export.client', 'Client')}
                  />
                </div>
              </div>

              <button
                onClick={handlePDFExport}
                disabled={!engine || isExporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {isExporting ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                {t('designer.export.generatePDF', 'Generer devis PDF')}
              </button>
            </div>

            {/* Status message */}
            {exportStatus && (
              <div
                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                  exportStatus.includes('Erreur') || exportStatus.includes('Error')
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  {exportStatus.includes('Erreur') || exportStatus.includes('Error') ? (
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  )}
                  {exportStatus}
                </div>
                <button
                  onClick={() => setExportStatus(null)}
                  className="text-current opacity-60 hover:opacity-100 flex-shrink-0"
                  aria-label={t('common.close', 'Fermer')}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
