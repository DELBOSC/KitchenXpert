import i18next from 'i18next';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as THREE from 'three';

import { AIAssistant } from '@kitchenxpert/3d-engine';

import type { KitchenEngine , BrandProfile } from '@kitchenxpert/3d-engine';


interface ProjectInfo {
  projectName: string;
  clientName: string;
  date?: string;
}

interface BOMItem {
  catalogId: string;
  name: string;
  type: string;
  category: string;
  dimensions: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface BOMCategory {
  label: string;
  items: BOMItem[];
  subtotal: number;
}

/**
 * Generateur de devis PDF multi-pages avec BOM
 */
export class PDFQuoteGenerator {
  private engine: KitchenEngine;
  private brandProfile: BrandProfile;
  private projectInfo: ProjectInfo;

  constructor(engine: KitchenEngine, brandProfile: BrandProfile, projectInfo: ProjectInfo) {
    this.engine = engine;
    this.brandProfile = brandProfile;
    this.projectInfo = {
      ...projectInfo,
      date: projectInfo.date || new Date().toLocaleDateString('fr-FR'),
    };
  }

  /**
   * Genere le PDF complet et retourne un Blob
   */
  async generatePDF(): Promise<Blob> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // Page 1 — Couverture
    this.renderCoverPage(doc, pageWidth, pageHeight, margin);

    // Page 2 — Plan 2D
    doc.addPage();
    await this.renderPlanPage(doc, pageWidth, margin);

    // Page 3 — BOM (nomenclature)
    doc.addPage();
    this.renderBOMPage(doc, pageWidth, margin);

    // Page 4 — Specs techniques
    doc.addPage();
    this.renderSpecsPage(doc, pageWidth, margin);

    // Page 5 — Scores IA
    doc.addPage();
    this.renderScoresPage(doc, pageWidth, margin);

    // Footer sur toutes les pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      this.renderFooter(doc, pageWidth, pageHeight, i, totalPages);
    }

    return doc.output('blob');
  }

  // --- Page 1: Couverture ---

  private renderCoverPage(doc: jsPDF, pageWidth: number, _pageHeight: number, margin: number): void {
    // Background accent
    doc.setFillColor(37, 99, 235); // blue-600
    doc.rect(0, 0, pageWidth, 80, 'F');

    // Logo area
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('KitchenXpert', margin, 35);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(i18next.t('pdfQuote.cover.subtitle', 'Devis de conception cuisine'), margin, 50);

    // Project info box
    const boxY = 100;
    doc.setFillColor(248, 250, 252); // gray-50
    doc.roundedRect(margin, boxY, pageWidth - margin * 2, 80, 4, 4, 'F');

    doc.setTextColor(30, 41, 59); // gray-800
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(i18next.t('pdfQuote.cover.projectInfo', 'Informations du projet'), margin + 10, boxY + 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const infoLines = [
      [i18next.t('pdfQuote.cover.projectName', 'Nom du projet :'), this.projectInfo.projectName],
      [i18next.t('pdfQuote.cover.client', 'Client :'), this.projectInfo.clientName],
      [i18next.t('pdfQuote.cover.date', 'Date :'), this.projectInfo.date || ''],
      [i18next.t('pdfQuote.cover.brand', 'Marque :'), this.brandProfile.id || 'Standard'],
    ];

    infoLines.forEach(([label, value], i) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label!, margin + 10, boxY + 30 + i * 12);
      doc.setFont('helvetica', 'normal');
      doc.text(value!, margin + 60, boxY + 30 + i * 12);
    });

    // Room dimensions
    const roomY = 200;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(i18next.t('pdfQuote.cover.roomDimensions', 'Dimensions de la piece'), margin + 10, roomY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(i18next.t('pdfQuote.cover.roomDimensionsDesc', 'Dimensions extraites de la configuration 3D courante.'), margin + 10, roomY + 12);

    // 3D thumbnail placeholder
    const thumbY = 230;
    try {
      const thumbDataUrl = this.capture3DScreenshot(400, 300);
      if (thumbDataUrl) {
        const imgWidth = pageWidth - margin * 2;
        const imgHeight = imgWidth * 0.6;
        doc.addImage(thumbDataUrl, 'PNG', margin, thumbY, imgWidth, imgHeight);
      }
    } catch {
      doc.setFillColor(229, 231, 235);
      doc.roundedRect(margin, thumbY, pageWidth - margin * 2, 80, 4, 4, 'F');
      doc.setTextColor(156, 163, 175);
      doc.setFontSize(10);
      doc.text(i18next.t('pdfQuote.cover.preview3DUnavailable', 'Apercu 3D non disponible'), pageWidth / 2, thumbY + 40, { align: 'center' });
    }
  }

  // --- Page 2: Plan 2D ---

  private renderPlanPage(doc: jsPDF, pageWidth: number, margin: number): Promise<void> {
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(i18next.t('pdfQuote.plan.title', 'Plan 2D'), margin, 20);

    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(margin, 23, pageWidth - margin, 23);

    try {
      const planDataUrl = this.capturePlanView(800, 600);
      if (planDataUrl) {
        const imgWidth = pageWidth - margin * 2;
        const imgHeight = imgWidth * 0.75;
        doc.addImage(planDataUrl, 'PNG', margin, 30, imgWidth, imgHeight);
      }
    } catch {
      doc.setTextColor(156, 163, 175);
      doc.setFontSize(10);
      doc.text(i18next.t('pdfQuote.plan.unavailable', 'Vue 2D non disponible'), pageWidth / 2, 80, { align: 'center' });
    }

    return Promise.resolve();
  }

  // --- Page 3: BOM ---

  private renderBOMPage(doc: jsPDF, pageWidth: number, margin: number): void {
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(i18next.t('pdfQuote.bom.title', 'Nomenclature (BOM)'), margin, 20);

    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(margin, 23, pageWidth - margin, 23);

    const categories = this.extractBOM();

    let startY = 30;

    for (const category of categories) {
      if (category.items.length === 0) {continue;}

      // Category header
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text(category.label, margin, startY);
      startY += 3;

      // Table
      const tableRows = category.items.map((item) => [
        item.catalogId,
        item.name,
        item.dimensions,
        item.quantity.toString(),
        `${item.unitPrice} €`,
        `${item.total} €`,
      ]);

      // Subtotal row
      tableRows.push(['', '', '', '', i18next.t('pdfQuote.bom.subtotal', 'Sous-total'), `${category.subtotal} €`]);

      autoTable(doc, {
        startY,
        head: [[i18next.t('pdfQuote.bom.ref', 'Ref'), i18next.t('pdfQuote.bom.description', 'Description'), i18next.t('pdfQuote.bom.dimensions', 'Dimensions (mm)'), i18next.t('pdfQuote.bom.qty', 'Qte'), i18next.t('pdfQuote.bom.unitPrice', 'P.U.'), i18next.t('pdfQuote.bom.total', 'Total')]],
        body: tableRows,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 55 },
          2: { cellWidth: 35 },
          3: { cellWidth: 15, halign: 'center' },
          4: { cellWidth: 22, halign: 'right' },
          5: { cellWidth: 22, halign: 'right' },
        },
        margin: { left: margin, right: margin },
        didParseCell: (data) => {
          // Style last row (subtotal) differently
          if (data.section === 'body' && data.row.index === tableRows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [241, 245, 249];
          }
        },
      });

      startY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 40;
      startY += 8;

      // New page if running out of space
      if (startY > 250) {
        doc.addPage();
        startY = 20;
      }
    }

    // Grand total
    const grandTotal = categories.reduce((sum, c) => sum + c.subtotal, 0);
    startY += 5;

    doc.setFillColor(37, 99, 235);
    doc.roundedRect(pageWidth - margin - 70, startY, 70, 12, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: ${grandTotal} €`, pageWidth - margin - 65, startY + 8);
  }

  // --- Page 4: Specs techniques ---

  private renderSpecsPage(doc: jsPDF, pageWidth: number, margin: number): void {
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(i18next.t('pdfQuote.specs.title', 'Specifications techniques'), margin, 20);

    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(margin, 23, pageWidth - margin, 23);

    const bp = this.brandProfile;
    const specs = [
      [i18next.t('pdfQuote.specs.brandProfile', 'Marque / Profil'), bp.id],
      [i18next.t('pdfQuote.specs.baseTotalHeight', 'Hauteur totale meuble bas'), `${bp.base.totalHeight} mm`],
      [i18next.t('pdfQuote.specs.baseDepth', 'Profondeur meuble bas'), `${bp.base.defaultDepth} mm`],
      [i18next.t('pdfQuote.specs.plinthHeight', 'Hauteur plinthe'), `${bp.base.defaultPlinthHeight} mm`],
      [i18next.t('pdfQuote.specs.worktopThickness', 'Epaisseur plan de travail'), `${bp.worktop.defaultThickness} mm`],
      [i18next.t('pdfQuote.specs.worktopOverhang', 'Debord avant PDT'), `${bp.worktop.overhangFront} mm`],
      [i18next.t('pdfQuote.specs.wallHeight', 'Hauteur meubles hauts'), `${bp.wall.defaultHeight} mm`],
      [i18next.t('pdfQuote.specs.wallDepth', 'Profondeur meubles hauts'), `${bp.wall.defaultDepth} mm`],
      [i18next.t('pdfQuote.specs.wallBottomPosition', 'Position bas meubles hauts'), `${bp.wall.bottomY} mm ${i18next.t('pdfQuote.specs.fromFloor', 'du sol')}`],
      [i18next.t('pdfQuote.specs.backsplashThickness', 'Epaisseur credence'), `${bp.backsplash.thickness} mm`],
    ];

    autoTable(doc, {
      startY: 30,
      head: [[i18next.t('pdfQuote.specs.specification', 'Specification'), i18next.t('pdfQuote.specs.value', 'Valeur')]],
      body: specs,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: 'bold' },
        1: { cellWidth: 60 },
      },
      margin: { left: margin, right: margin },
    });

    // Electrical requirements
    let y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120;
    y += 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(i18next.t('pdfQuote.specs.electricalPlumbing', 'Besoins electriques et plomberie'), margin, y);
    y += 8;

    const items = this.extractSceneItems();
    const electricNeeds: string[] = [];
    const plumbingNeeds: string[] = [];

    for (const item of items) {
      switch (item.type) {
        case 'cooktop':
        case 'hob':
          electricNeeds.push(i18next.t('pdfQuote.specs.electric.cooktop', 'Prise 32A pour plaque de cuisson'));
          break;
        case 'oven':
          electricNeeds.push(i18next.t('pdfQuote.specs.electric.oven', 'Prise 20A pour four'));
          break;
        case 'dishwasher':
          electricNeeds.push(i18next.t('pdfQuote.specs.electric.dishwasher', 'Prise 16A pour lave-vaisselle'));
          plumbingNeeds.push(i18next.t('pdfQuote.specs.plumbing.dishwasher', 'Arrivee eau froide + evacuation pour lave-vaisselle'));
          break;
        case 'refrigerator':
        case 'fridge':
          electricNeeds.push(i18next.t('pdfQuote.specs.electric.fridge', 'Prise 16A pour refrigerateur'));
          break;
        case 'hood':
        case 'range_hood':
          electricNeeds.push(i18next.t('pdfQuote.specs.electric.hood', 'Prise 16A pour hotte + extraction'));
          break;
        case 'sink':
        case 'sink_base':
          plumbingNeeds.push(i18next.t('pdfQuote.specs.plumbing.sink', 'Arrivee eau chaude + froide + evacuation pour evier'));
          break;
      }
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    if (electricNeeds.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text(i18next.t('pdfQuote.specs.electricity', 'Electricite:'), margin, y);
      doc.setFont('helvetica', 'normal');
      y += 5;
      for (const need of electricNeeds) {
        doc.text(`  - ${need}`, margin, y);
        y += 5;
      }
      y += 3;
    }

    if (plumbingNeeds.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text(i18next.t('pdfQuote.specs.plumbing', 'Plomberie:'), margin, y);
      doc.setFont('helvetica', 'normal');
      y += 5;
      for (const need of plumbingNeeds) {
        doc.text(`  - ${need}`, margin, y);
        y += 5;
      }
    }
  }

  // --- Page 5: Scores IA ---

  private renderScoresPage(doc: jsPDF, pageWidth: number, margin: number): void {
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(i18next.t('pdfQuote.scores.title', 'Analyse IA de la configuration'), margin, 20);

    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(margin, 23, pageWidth - margin, 23);

    // Extract items and compute score
    const items = this.extractSceneItems();
    const room = { width: this.engine.roomWidth, depth: this.engine.roomDepth, height: this.engine.roomHeight, walls: [] as THREE.Object3D[] };

    const placedItems = items.map((item) => ({
      id: item.id,
      type: item.type,
      position: item.position,
      rotation: item.rotation,
      dimensions: item.dimensions,
      price: item.price,
    }));

    const ai = new AIAssistant(this.brandProfile);
    const score = ai.scoreConfiguration(placedItems, room);
    const suggestions = ai.getSuggestions(placedItems, room);
    const triangle = ai.calculateWorkTriangle(placedItems);

    let y = 35;

    // Score bars
    const scoreEntries = [
      [i18next.t('pdfQuote.scores.overall', 'Score global'), score.overall],
      [i18next.t('pdfQuote.scores.ergonomics', 'Ergonomie'), score.ergonomics],
      [i18next.t('pdfQuote.scores.storage', 'Rangement'), score.storage],
      [i18next.t('pdfQuote.scores.aesthetics', 'Esthetique'), score.aesthetics],
      [i18next.t('pdfQuote.scores.budget', 'Budget'), score.budgetEfficiency],
      [i18next.t('pdfQuote.scores.spaceUtilization', 'Utilisation espace'), score.spaceUtilization],
    ] as const;

    for (const [label, value] of scoreEntries) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${value}/100`, margin + 60, y);

      // Progress bar
      const barX = margin + 75;
      const barWidth = pageWidth - margin * 2 - 75;
      doc.setFillColor(229, 231, 235); // gray-200
      doc.roundedRect(barX, y - 3, barWidth, 4, 1, 1, 'F');

      const color = value >= 80 ? [34, 197, 94] : value >= 60 ? [234, 179, 8] : value >= 40 ? [249, 115, 22] : [239, 68, 68];
      doc.setFillColor(color[0]!, color[1]!, color[2]!);
      doc.roundedRect(barX, y - 3, barWidth * (value / 100), 4, 1, 1, 'F');

      y += 10;
    }

    // Triangle de travail
    y += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(i18next.t('pdfQuote.scores.workTriangle', 'Triangle de travail'), margin, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    if (triangle.perimeter > 0) {
      doc.text(`${i18next.t('pdfQuote.scores.perimeter', 'Perimetre')}: ${Math.round(triangle.perimeter * 1000)} mm`, margin, y);
      y += 5;
      doc.text(`${i18next.t('pdfQuote.scores.sinkToCooktop', 'Evier → Plaque')}: ${Math.round(triangle.legs.sinkToCooktop * 1000)} mm`, margin, y);
      y += 5;
      doc.text(`${i18next.t('pdfQuote.scores.cooktopToFridge', 'Plaque → Frigo')}: ${Math.round(triangle.legs.cooktopToFridge * 1000)} mm`, margin, y);
      y += 5;
      doc.text(`${i18next.t('pdfQuote.scores.fridgeToSink', 'Frigo → Evier')}: ${Math.round(triangle.legs.fridgeToSink * 1000)} mm`, margin, y);
      y += 5;
      doc.text(`${i18next.t('pdfQuote.scores.optimal', 'Optimal')}: ${triangle.isOptimal ? i18next.t('pdfQuote.scores.yes', 'Oui') : i18next.t('pdfQuote.scores.no', 'Non')} (score: ${triangle.score}/100)`, margin, y);
    } else {
      doc.text(i18next.t('pdfQuote.scores.triangleIncomplete', 'Triangle incomplet (elements manquants).'), margin, y);
    }

    // Suggestions
    y += 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${i18next.t('pdfQuote.scores.suggestions', 'Suggestions')} (${suggestions.length})`, margin, y);
    y += 7;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    for (const sug of suggestions.slice(0, 10)) {
      const icon = sug.type === 'warning' ? '!' : sug.type === 'improvement' ? '+' : 'i';
      const prefix = `[${icon}] `;
      doc.text(`${prefix}${sug.message}`, margin, y);
      y += 5;

      if (sug.detail) {
        doc.setTextColor(107, 114, 128); // gray-500
        doc.text(`   ${sug.detail}`, margin, y);
        doc.setTextColor(30, 41, 59);
        y += 5;
      }

      if (y > 270) {break;}
    }
  }

  // --- Footer ---

  private renderFooter(doc: jsPDF, pageWidth: number, pageHeight: number, page: number, totalPages: number): void {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175); // gray-400
    doc.text(
      `KitchenXpert — ${this.projectInfo.projectName} — ${this.projectInfo.date} — Page ${page}/${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  // --- Extraction BOM ---

  private extractBOM(): BOMCategory[] {
    const items = this.extractSceneItems();
    const categoryMap = new Map<string, BOMItem[]>();

    const categoryLabels: Record<string, string> = {
      base_cabinet: i18next.t('pdfQuote.category.baseCabinets', 'Meubles bas'),
      base: i18next.t('pdfQuote.category.baseCabinets', 'Meubles bas'),
      wall_cabinet: i18next.t('pdfQuote.category.wallCabinets', 'Meubles hauts'),
      wall: i18next.t('pdfQuote.category.wallCabinets', 'Meubles hauts'),
      tall_cabinet: i18next.t('pdfQuote.category.tallCabinets', 'Colonnes'),
      tall: i18next.t('pdfQuote.category.tallCabinets', 'Colonnes'),
      appliance: i18next.t('pdfQuote.category.appliances', 'Electromenager'),
      cooktop: i18next.t('pdfQuote.category.appliances', 'Electromenager'),
      hood: i18next.t('pdfQuote.category.appliances', 'Electromenager'),
      refrigerator: i18next.t('pdfQuote.category.appliances', 'Electromenager'),
      fridge: i18next.t('pdfQuote.category.appliances', 'Electromenager'),
      dishwasher: i18next.t('pdfQuote.category.appliances', 'Electromenager'),
      oven: i18next.t('pdfQuote.category.appliances', 'Electromenager'),
      sink: i18next.t('pdfQuote.category.sinks', 'Eviers'),
      sink_base: i18next.t('pdfQuote.category.sinks', 'Eviers'),
      worktop: i18next.t('pdfQuote.category.worktops', 'Plans de travail'),
    };

    for (const item of items) {
      const categoryLabel = categoryLabels[item.type] || i18next.t('pdfQuote.category.other', 'Autres');
      if (!categoryMap.has(categoryLabel)) {
        categoryMap.set(categoryLabel, []);
      }

      const dims = item.dimensions;
      const dimsStr = `${Math.round(dims.width * 1000)} x ${Math.round(dims.height * 1000)} x ${Math.round(dims.depth * 1000)}`;

      categoryMap.get(categoryLabel)!.push({
        catalogId: item.catalogId || item.id.slice(0, 10),
        name: item.name || item.type,
        type: item.type,
        category: categoryLabel,
        dimensions: dimsStr,
        quantity: 1,
        unitPrice: item.price || 0,
        total: item.price || 0,
      });
    }

    const order = [
      i18next.t('pdfQuote.category.baseCabinets', 'Meubles bas'),
      i18next.t('pdfQuote.category.wallCabinets', 'Meubles hauts'),
      i18next.t('pdfQuote.category.tallCabinets', 'Colonnes'),
      i18next.t('pdfQuote.category.appliances', 'Electromenager'),
      i18next.t('pdfQuote.category.worktops', 'Plans de travail'),
      i18next.t('pdfQuote.category.sinks', 'Eviers'),
      i18next.t('pdfQuote.category.other', 'Autres'),
    ];

    return order
      .filter((label) => categoryMap.has(label))
      .map((label) => {
        const catItems = categoryMap.get(label)!;
        return {
          label,
          items: catItems,
          subtotal: catItems.reduce((sum, i) => sum + i.total, 0),
        };
      });
  }

  // --- Scene extraction ---

  private extractSceneItems(): Array<{
    id: string;
    type: string;
    name: string;
    catalogId: string;
    position: THREE.Vector3;
    rotation: number;
    dimensions: { width: number; height: number; depth: number };
    price: number;
  }> {
    const items: Array<{
      id: string;
      type: string;
      name: string;
      catalogId: string;
      position: THREE.Vector3;
      rotation: number;
      dimensions: { width: number; height: number; depth: number };
      price: number;
    }> = [];

    this.engine.scene.getThreeScene().traverse((child) => {
      if (!child.userData.id || child.userData.type === 'wall' || child.userData.type === 'floor') {
        return;
      }

      const box = new THREE.Box3().setFromObject(child);
      const size = box.getSize(new THREE.Vector3());

      items.push({
        id: child.userData.id,
        type: child.userData.type || 'unknown',
        name: child.userData.name || child.userData.type || 'Element',
        catalogId: child.userData.catalogId || '',
        position: child.position.clone(),
        rotation: child.rotation.y,
        dimensions: {
          width: child.userData.dimensions?.width || size.x,
          height: child.userData.dimensions?.height || size.y,
          depth: child.userData.dimensions?.depth || size.z,
        },
        price: child.userData.price || 0,
      });
    });

    return items;
  }

  // --- Screenshot helpers ---

  private capture3DScreenshot(width: number, height: number): string | null {
    try {
      const renderer = this.engine.renderer.getThreeRenderer();
      const scene = this.engine.scene.getThreeScene();
      const camera = this.engine.camera.getThreeCamera();

      const prevSize = renderer.getSize(new THREE.Vector2());
      renderer.setSize(width, height);
      renderer.render(scene, camera);
      const dataUrl = renderer.domElement.toDataURL('image/png');
      renderer.setSize(prevSize.x, prevSize.y);

      return dataUrl;
    } catch {
      return null;
    }
  }

  private capturePlanView(width: number, height: number): string | null {
    try {
      const renderer = this.engine.renderer.getThreeRenderer();
      const scene = this.engine.scene.getThreeScene();

      // Use a temporary orthographic camera for top-down view
      const aspect = width / height;
      const viewSize = 5;
      const orthoCamera = new THREE.OrthographicCamera(
        -viewSize * aspect / 2,
        viewSize * aspect / 2,
        viewSize / 2,
        -viewSize / 2,
        0.1,
        100
      );
      orthoCamera.position.set(2, 10, 1.5);
      orthoCamera.lookAt(2, 0, 1.5);

      const prevSize = renderer.getSize(new THREE.Vector2());
      renderer.setSize(width, height);
      renderer.render(scene, orthoCamera);
      const dataUrl = renderer.domElement.toDataURL('image/png');
      renderer.setSize(prevSize.x, prevSize.y);

      return dataUrl;
    } catch {
      return null;
    }
  }
}
