# Product Catalog Requirements

**Last Updated:** 2026-01-10

Detailed requirements for product data in the KitchenXpert Partner Platform.

## Table of Contents

1. [Required Product Fields](#required-product-fields)
2. [Category-Specific Requirements](#category-specific-requirements)
3. [Image Requirements](#image-requirements)
4. [Accepted File Formats](#accepted-file-formats)
5. [Validation Process](#validation-process)
6. [Common Errors and Fixes](#common-errors-and-fixes)
7. [Quality Guidelines](#quality-guidelines)

---

## Required Product Fields

### Core Fields (All Products)

**id** - Unique Product Identifier
- **Type**: String
- **Length**: 1-100 characters
- **Format**: Alphanumeric and hyphens only
- **Examples**: "CAB-001", "SINK-FRANKE-500"
- **Validation**: ^[A-Z0-9-]+$

**name** - Product Display Name
- **Type**: String
- **Length**: 5-200 characters
- **Examples**: "Bosch Series 8 Built-In Dishwasher", "Modern White Gloss Base Cabinet 60cm"

**category** - Primary Category
- **Type**: String (enum)
- **Values**: cabinet, worktop, sink, appliance, hardware, lighting, accessory

**price** - Product Price
- **Type**: Number (decimal)
- **Format**: Positive decimal with max 2 decimal places
- **Examples**: 299.99, 1250.00, 45.50

**currency** - Price Currency
- **Type**: String (ISO 4217)
- **Supported**: EUR, USD, GBP, CHF, SEK, NOK, DKK, PLN

**dimensions** - Product Dimensions
- **Type**: Object
- **Fields**: width, height, depth (numbers), unit ("cm" or "inch")

**brand** - Brand/Manufacturer
- **Type**: String
- **Length**: 2-100 characters

**model** - Model Number/SKU
- **Type**: String
- **Length**: 1-100 characters

---

## Category-Specific Requirements

### Cabinets

**Additional Required:**
- specifications.material - Cabinet material (e.g., "MDF", "Solid wood")
- specifications.finish - Surface finish (e.g., "Matt lacquer", "High gloss")
- specifications.door_type - Door style (e.g., "Slab", "Shaker")

**Recommended:**
- specifications.hinge_type
- specifications.shelves
- specifications.adjustable_shelves

### Worktops

**Additional Required:**
- specifications.material - Worktop material (e.g., "Quartz", "Granite", "Laminate")
- specifications.thickness - Thickness in mm
- specifications.edge_profile - Edge type

### Sinks

**Additional Required:**
- specifications.material - Sink material
- specifications.bowl_configuration - Bowl setup
- specifications.mounting_type - Installation type

### Appliances

**Additional Required:**
- specifications.appliance_type - Type of appliance
- specifications.energy_class - Energy rating (A+++, A++, A+, A, B, C, D)
- specifications.installation_type - Installation method

**Recommended:**
- specifications.capacity
- specifications.noise_level
- specifications.power
- specifications.connectivity

---

## Image Requirements

### Quantity
- **Minimum**: 1 image (main product image)
- **Recommended**: 4-10 images
- **Maximum**: 20 images per product

### Image Types

**Main Product Image (Required)**
- White background (#FFFFFF) or transparent
- Product centered, fills 80-90% of frame
- High resolution (min 800x800px, recommended 2000x2000px)

**Additional Views (Recommended)**
- Side views, back view, top view
- Detail shots
- Lifestyle images (product in kitchen setting)
- Dimension diagrams

### Technical Specifications
- **Format**: WebP (preferred), JPEG (quality 85+), PNG
- **Resolution**: 800x800px minimum, 2000x2000px recommended
- **File Size**: Maximum 5MB per image
- **URLs**: HTTPS only, publicly accessible

---

## Accepted File Formats

### CSV Template

Download template from Partner Portal.

**Requirements:**
- UTF-8 encoding with BOM
- Comma delimiter
- Headers in first row

### JSON Schema

Standard JSON format for API integration.

### XML Format

XML with specified schema (download XSD from portal).

### Excel Template

- Use first sheet named "Products"
- Headers in row 1
- One product per row

---

## Validation Process

### Automated Validation (All Tiers)

Every upload is automatically validated:

1. **Schema Validation** - All required fields present, correct data types
2. **Format Validation** - ID format, price positive, currency valid
3. **Image Validation** - URLs accessible, valid format, size check
4. **Duplicate Check** - Product ID unique

### Manual Review (Pro & Enterprise)

**Pro Tier:** 10% random sample manually reviewed
**Enterprise Tier:** 100% manual review
**Timeline:** 2-3 business days

---

## Common Errors and Fixes

### Error: "Invalid category"
**Fix**: Use exact category name: cabinet, worktop, sink, appliance, hardware, lighting, accessory

### Error: "Missing required field: dimensions"
**Fix**: Include complete dimensions object with width, height, depth, unit

### Error: "Price must be positive number"
**Fix**: Use positive decimal only: 299.99 (not "€299.99")

### Error: "Image URL not accessible"
**Fix**: Ensure URL is publicly accessible via HTTPS, test in browser incognito mode

### Error: "Duplicate product ID"
**Fix**: Use unique ID for each product, update existing product instead

### Error: "Invalid currency code"
**Fix**: Use 3-letter ISO 4217 code: EUR, USD, GBP, etc.

---

## Quality Guidelines

### Data Completeness
- All required fields filled
- 80%+ optional fields filled
- Multiple high-quality images
- Detailed specifications
- Accurate dimensions

### Accurate Measurements
- Double-check all dimensions
- Use consistent units
- Include packaging dimensions if relevant

### Current Pricing
- Update prices regularly
- Include VAT status clearly
- Mark sales/discounts appropriately

### High-Quality Images
- Professional photography preferred
- Consistent lighting and background
- Multiple angles
- Show product details

---

## Additional Resources

- [Technical Specifications](./technical-specifications.md) - API and data requirements
- [Product Specifications](../catalog-management/product-specifications.md) - Detailed category specs
- [Image Requirements](../catalog-management/image-requirements.md) - Image guidelines
- [API Integration Guide](./api-integration.md) - API documentation

---

*Last Updated: 2026-01-10*
