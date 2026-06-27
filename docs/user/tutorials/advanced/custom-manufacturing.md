# Custom Manufacturing Integration

**Last Updated:** 2026-01-10 **Difficulty Level:** Advanced **Estimated Time:**
60-90 minutes

## Learning Objectives

By the end of this tutorial, you will be able to:

- Export CNC-ready files for custom cabinet manufacturing
- Generate cutting lists and material optimization layouts
- Create toolpath files for automated fabrication equipment
- Integrate with parametric design for custom sizing
- Export to popular CAD/CAM formats (DXF, STEP, G-code)
- Collaborate with custom fabricators and manufacturers
- Use digital twin technology for production tracking
- Implement quality control checkpoints via digital verification
- Optimize material waste and cutting efficiency

## Prerequisites

- Advanced KitchenXpert account (Professional tier)
- Completed kitchen design with custom elements
- Understanding of manufacturing processes
- Access to CNC equipment or relationship with custom fabricator
- Familiarity with CAD software (helpful but not required)

## What is Custom Manufacturing Integration?

Traditional approach: Hand measurements → manual shop drawings → manual
fabrication

Custom manufacturing integration:

- Digital design → automated file generation → CNC fabrication
- Reduces errors from manual transcription
- Speeds production dramatically
- Enables one-off custom pieces at production-scale pricing
- Ensures design intent translates perfectly to final product

**Use Cases:**

- Custom cabinet shops using CNC routers
- Stone fabricators with waterjet cutters
- Metal shops creating custom range hoods
- Woodworkers crafting live-edge countertops
- Tile shops with waterjet mosaics

## Step-by-Step Instructions

### Step 1: Prepare Design for Manufacturing

1. Open your kitchen design in KitchenXpert
2. Click **"Manufacturing"** tab in toolbar
3. Select **"Prepare for CNC Export"**

[Screenshot: Manufacturing preparation wizard]

```
MANUFACTURING READINESS CHECK

Design elements suitable for CNC fabrication:

CABINETS (14 units):
✓ Cabinet boxes: Parametric models, CNC-ready
✓ Cabinet doors: Shaker style, can export toolpaths
✓ Drawer fronts: Standard designs, exportable
⚠ Hardware holes: Need to specify drilling pattern
✓ Shelf holes: 32mm system, standard

COUNTERTOPS:
✓ Quartz slabs: Export cutting templates
✓ Edge profiles: CNC router paths available
✓ Sink cutouts: Exact dimensions specified
✓ Faucet holes: Located and sized

CUSTOM ELEMENTS:
✓ Live-edge wood bar: 3D model, CNC surfacing paths
✓ Custom backsplash: Waterjet cutting pattern ready
⚠ Metal range hood: Requires sheet metal CAD export

ISSUES TO RESOLVE (2):
1. Cabinet hardware holes not specified (choose drilling pattern)
2. Range hood material thickness not set

Fix issues before exporting?  [Resolve Now] [Export Anyway]
```

[Screenshot: Readiness report with warnings]

2. Click **"Resolve Now"**
3. **Issue 1: Cabinet hardware holes**
   - Click on first cabinet
   - Select **"Hardware Drilling"** in properties
   - Choose pattern: **"32mm System, European Standard"**
   - Hole size: 5mm diameter
   - Depth: 12mm (for press-in hinges)
   - Click **"Apply to All Cabinets"**

4. **Issue 2: Range hood material**
   - Click on custom range hood
   - Set material: **"16-gauge stainless steel"** (0.060" thick)
   - Finish: Brushed
   - Click **"Save"**

5. Re-run readiness check: **"All systems ready for CNC export"** ✓

> **TIP:** Resolving issues before export prevents fabrication errors. CNC
> machines will cut exactly what you specify - including mistakes.

### Step 2: Generate Cabinet Cutting Lists

Start with cabinets - most common CNC application.

1. Click **"Manufacturing"** → **"Cabinet Export"**
2. Select **"Generate Cutting Lists"**

[Screenshot: Cutting list generator]

```
CABINET CUTTING LIST GENERATOR

Select cabinets to export:
[x] Select All (14 cabinets)
[ ] Select by type
[ ] Select individual

Material specification:
Sheet goods: 3/4" plywood, 4'×8' sheets
Edge banding: Pre-glued veneer, 7/8" width
Hardware: 32mm system, Euro hinges

Cutting optimization:
(•) Optimize for minimal waste
( ) Optimize for fastest cutting
( ) No optimization (manual layout)

Generate:
[x] Cut list (dimensions and quantities)
[x] Sheet layouts (visual cutting diagrams)
[x] CNC toolpaths (G-code)
[x] Assembly instructions
```

3. Click **"Generate"**
4. Processing: "Optimizing sheet layouts..." (45 seconds)

5. **Results appear:**

[Screenshot: Optimized sheet layout diagram]

```
CUTTING LIST SUMMARY

Total cabinet parts: 142 pieces
Sheet material required: 11 sheets (4'×8' plywood)
Material utilization: 87.3% (excellent)
Waste: 12.7% (1.4 sheets equivalent)

Breakdown by cabinet:
- 36" Sink Base (1 unit): 12 parts, 0.8 sheets
- 24" 3-Drawer Base (2 units): 18 parts each, 1.2 sheets total
- 30" Wall Cabinet (4 units): 8 parts each, 1.6 sheets total
[...full breakdown...]

Cutting time estimate: 4.2 hours (CNC router)
Manual cutting time: 18-22 hours (estimated)

Cost analysis:
Material cost: $770 (11 sheets @ $70/sheet)
CNC time: $210 (4.2 hrs @ $50/hr)
Edge banding: $125
Hardware: $680
Total: $1,785

vs. Pre-made cabinets: $8,900
Savings: $7,115 (80% savings!)
```

[Screenshot: Cost comparison chart]

6. **Review sheet layout diagram:**
   - Each 4×8 sheet shown
   - All parts nested efficiently
   - Grain direction indicated
   - Part labels on each piece
   - Cutting paths shown

[Screenshot: Detailed sheet #1 layout with all parts labeled]

7. **Export cutting list:**
   - Click **"Export Cutting List"**
   - Format: CSV for spreadsheet
   - Download: `Johnson_Kitchen_Cabinet_Cutting_List.csv`

```csv
Part Number,Cabinet,Component,Width,Height,Thickness,Quantity,Material,Edge Banding,Notes
CB-001,36" Sink Base,Side Panel,30,23.25,0.75,2,Birch Plywood,Front/Top,Grain vertical
CB-002,36" Sink Base,Bottom Panel,34.5,23.25,0.75,1,Birch Plywood,Front only,
CB-003,36" Sink Base,Back Panel,34.5,29.25,0.25,1,Birch Plywood,None,Rabbeted into sides
...
```

> **TIP:** CNC cutting saves enormous time and money for custom cabinet
> projects. The precision is also far superior to hand cutting.

### Step 3: Export CNC Toolpaths for Cabinet Doors

Shaker-style doors require multiple operations.

1. Click **"Manufacturing"** → **"Door Export"**
2. Select **"CNC Router Toolpaths"**

[Screenshot: Door toolpath generator]

```
CNC DOOR TOOLPATH GENERATOR

Doors to export: 28 cabinet doors
Style: Shaker (frame and panel)

Operations required per door:
1. Cut outer perimeter (router bit: 1/4" straight)
2. Route groove for panel (router bit: 1/4" slot cutter)
3. Route decorative edge (router bit: 1/4" roundover)
4. Drill hinge holes (drill bit: 35mm Forstner)

Material: 3/4" MDF (painted finish)
Panel: 1/4" MDF (fits in groove)

CNC router settings:
- Spindle speed: 18,000 RPM
- Feed rate: 100 IPM (straight cuts)
- Feed rate: 60 IPM (detail routing)
- Plunge rate: 20 IPM
- Bit changes: 4 per door (or use tool changer)

Time estimate:
- Per door: 8 minutes (with manual bit changes)
- Per door: 5 minutes (with automatic tool changer)
- All 28 doors: 3.7 hours (automatic), 2.3 hours (tool changer)
```

[Screenshot: Door routing operation sequence diagram]

3. Click **"Generate Toolpaths"**
4. Processing: "Creating G-code for 28 doors..." (2 minutes)

5. **Review generated files:**

   ```
   Generated toolpath files (28 doors):

   DoorOP1_Perimeter.nc (G-code for cutting outer shape)
   - All 28 doors, optimized nesting on 4×8 sheets
   - 6 sheets required
   - Cut time: 42 minutes

   DoorOP2_GroovePanel.nc (G-code for panel grooves)
   - All doors
   - Cut time: 38 minutes

   DoorOP3_DecorativeEdge.nc (G-code for roundover edge)
   - All doors
   - Cut time: 45 minutes

   DoorOP4_HingeHoles.nc (G-code for hinge drilling)
   - All doors, 4 holes per door (2 hinges)
   - Drill time: 18 minutes

   Total CNC time: 2.4 hours
   File format: ISO G-code (compatible with most CNC controllers)
   ```

6. **Download all files:**
   - ZIP archive: `Cabinet_Door_Toolpaths.zip` (2.8 MB)
   - Includes setup instructions for each operation

7. **Optional: Visualize toolpaths:**
   - Click **"Preview Toolpaths"**
   - 3D simulation shows cutting sequence
   - Verify no collisions or issues
   - See where bit changes occur

[Screenshot: 3D toolpath visualization]

> **WARNING:** Always run toolpath simulation before cutting real material.
> Catches programming errors that could damage bits or spoil material.

### Step 4: Export Countertop Template for CNC

Stone fabricators use CNC waterjets or saws.

1. Click **"Manufacturing"** → **"Countertop Export"**
2. Select **"Stone Fabrication Template"**

[Screenshot: Countertop template generator]

```
COUNTERTOP FABRICATION TEMPLATE

Counter surfaces: 3 slabs required
- Perimeter countertop: 2 slabs (42 sq ft)
- Island with waterfall: 1 slab (26 sq ft with waste)

Material: MSI Calacatta Laza Quartz
Slab size: 63" × 128" (standard jumbo slab)
Thickness: 3 cm (1.18 inches)

Export format:
(•) DXF (AutoCAD format, industry standard)
( ) DWG (AutoCAD native)
( ) STEP (3D CAD format)
( ) SVG (2D vector, for waterjet)

Include:
[x] Cutting lines (outer perimeter)
[x] Sink cutouts (exact dimensions)
[x] Faucet holes (location and size)
[x] Seam locations (minimize visible seams)
[x] Edge profile detail (eased edge)
[x] Dimension annotations
[x] Installation notes
```

3. Configure waterfall edge:
   - Waterfall sides: 2 (both ends of island)
   - Seam type: 45° miter joint
   - Seam location: Hidden on underside
   - Support required: Yes (brackets every 24")

4. Click **"Generate Template"**

[Screenshot: Generated countertop template drawing]

5. **Template shows:**
   - Top view of all counter sections
   - Exact dimensions (to 1/16")
   - Sink cutout: 33" × 22" with 1" radius corners
   - Faucet holes: (1) 1.5" diameter
   - Seam locations marked
   - Grain direction arrow (for book-matching)
   - Support bracket locations

6. **Export files:**
   - `Countertop_Perimeter_Slab1.dxf`
   - `Countertop_Perimeter_Slab2.dxf`
   - `Countertop_Island_Waterfall.dxf`
   - `Countertop_Assembly_Guide.pdf`

7. **DXF files can be:**
   - Imported directly into CNC waterjet
   - Opened in AutoCAD for verification
   - Sent to fabricator via email

> **TIP:** Include a PDF version alongside DXF files. Fabricators can print PDF
> for manual verification before cutting.

### Step 5: Generate Parametric Cabinet Models

Enable custom sizing while maintaining design integrity.

1. Click **"Manufacturing"** → **"Parametric Cabinet Designer"**
2. Select a cabinet to make parametric: **36" Sink Base**

[Screenshot: Parametric cabinet editor]

```
PARAMETRIC CABINET DESIGNER

Base cabinet: 36" Sink Base

Fixed parameters (cannot change):
- Box construction: 3/4" plywood
- Depth: 24" (standard countertop depth)
- Toe kick: 4.5" height, 3" setback
- Hardware: 32mm system

Variable parameters:
- Width: 30-48 inches (currently 36")
- Height: 30-36 inches (currently 30")
- Door style: Multiple options
- Interior: Shelf configuration

Rules/constraints:
- Minimum width for undermount sink: 33"
- Door width cannot exceed 24" (hardware limitation)
- If width > 36", use double doors
- Shelf spacing: minimum 6", maximum 18"

Current configuration: 36"W × 24"D × 30"H
```

[Screenshot: Parametric controls with sliders]

3. **Create custom width variant:**
   - Adjust width slider to **42 inches**
   - System automatically:
     - Switches to double-door configuration
     - Recalculates door widths: 20" each (within limits)
     - Adjusts shelf length to fit
     - Updates hardware positions
     - Maintains all proportions

4. **Save as new cabinet model:**
   - Name: "42" Custom Sink Base"
   - Click **"Save Parametric Model"**
   - Now available in cabinet library

5. **Export parametric CAD model:**
   - Format: **STEP file** (universal 3D CAD)
   - Preserves parameters (can be edited in CAD software)
   - Export: `42in_Sink_Base_Parametric.step`

6. **Import into CAD software** (SolidWorks, Fusion 360, etc.):
   - Open STEP file
   - All parameters editable
   - Make further customizations if needed
   - Export CNC toolpaths from CAD

[Screenshot: Parametric model opened in Fusion 360]

> **TIP:** Parametric models are powerful for kitchen designers who serve
> builders. Create one parametric cabinet family, resize for each project rather
> than designing from scratch.

### Step 6: Create CNC-Ready Custom Backsplash

Complex mosaic pattern for waterjet cutting.

1. Click **"Manufacturing"** → **"Backsplash Export"**
2. Your design has custom geometric mosaic
3. Select **"Waterjet Cutting Pattern"**

[Screenshot: Backsplash pattern export]

```
WATERJET MOSAIC PATTERN EXPORT

Pattern: Custom geometric (hexagon + triangle)
Tile materials:
- White marble: 70% of pattern
- Gray marble: 25% of pattern
- Stainless steel: 5% of pattern (accent)

Backing: 12"×12" mesh sheets (industry standard)
Total area: 35 sq ft
Sheets required: 35 (one pattern per sheet)

Waterjet cutting:
- Material thickness:
  - Marble: 3/8"
  - Steel: 1/16"
- Kerf width: 0.04" (standard waterjet)
- Pressure: 60,000 PSI
- Abrasive: 80 mesh garnet

Export format:
(•) DXF (2D cutting paths)
( ) SVG (vector graphics)
( ) G-code (direct to waterjet controller)
```

3. Click **"Generate Cutting Paths"**

4. **System creates individual files for each material:**
   - `Mosaic_WhiteMarble_Cutting.dxf` (hexagons)
   - `Mosaic_GrayMarble_Cutting.dxf` (triangles)
   - `Mosaic_StainlessSteel_Cutting.dxf` (accent strips)

5. **Each DXF contains:**
   - Cutting path (outer perimeter of each piece)
   - Nesting layout (minimizes material waste)
   - Part numbering (for assembly)
   - Material utilization:
     - White marble: 89% (11% waste)
     - Gray marble: 84% (16% waste)
     - Stainless: 78% (22% waste - complex shapes)

[Screenshot: Nested mosaic pieces on material sheet]

6. **Assembly guide generated:**
   - PDF showing pattern layout
   - Color-coded by material
   - Part numbers correspond to cut pieces
   - Installation sequence

7. **Export everything:**
   - ZIP: `Mosaic_Backsplash_Waterjet.zip` (8.4 MB)
   - Send to waterjet cutting service
   - Typical turnaround: 1-2 weeks
   - Cost: ~$18/sq ft cut (vs. $8/sq ft for standard tile)

> **TIP:** Waterjet-cut mosaics create stunning custom designs impossible with
> standard tiles. Worth the premium for focal areas.

### Step 7: Export Live-Edge Wood for CNC Surfacing

The organic breakfast bar needs precision surfacing.

1. Click **"Manufacturing"** → **"Wood Slab Export"**
2. Select the live-edge walnut bar

[Screenshot: Wood slab CNC export]

```
LIVE-EDGE WOOD SLAB CNC EXPORT

Slab: Black walnut live edge
Dimensions: 72"L × 18-22"W (variable) × 2.5"T
Current state: Rough-sawn, needs surfacing

CNC surfacing operations:
1. 3D scan existing slab (if available)
   OR
2. Use idealized 3D model from design

Export option:
(•) Idealized model (assumes slab matches design)
( ) Import actual 3D scan (requires scanning equipment)

Surfacing toolpath:
- Top surface: Flatten to uniform thickness
- Bottom surface: Flatten parallel to top
- Edges: Live edge preserved, bark removed
- Finish: 220 grit equivalent (fine surfacing bit)

Target thickness: 2.5" (±0.02" tolerance)
Surface finish: CNC surfaced (still requires hand-sanding)

Estimated CNC time: 2.5 hours (large slab surfacing)
```

3. Select **"Idealized model"**
4. Click **"Generate Surfacing Toolpath"**

5. **Toolpath created:**

   ```
   File: Walnut_LiveEdge_Surfacing.nc

   Operations:
   OP1: Top surface roughing (1/2" ball nose, 0.1" stepover)
   OP2: Top surface finishing (1/4" ball nose, 0.02" stepover)
   OP3: Flip slab, bottom roughing
   OP4: Bottom finishing

   Total cut time: 2.4 hours
   Bit changes: 2 (roughing to finishing bit)
   ```

6. **Also export 3D model for verification:**
   - Format: **STL file** (3D printing format, widely compatible)
   - `Walnut_LiveEdge_3DModel.stl`
   - Woodworker can import into CNC software
   - Verify fit before cutting

[Screenshot: 3D model of live-edge slab]

7. **Include finishing notes:**

   ```
   POST-CNC FINISHING INSTRUCTIONS:

   After CNC surfacing:
   1. Hand-sand: 120, 180, 220, 320 grit progression
   2. Raise grain: Dampen with water, dry, sand 320 again
   3. Apply finish: 3 coats Waterlox (food-safe)
   4. Cure time: 7 days before installation

   Live edge treatment:
   - Remove any loose bark
   - Fill voids with clear epoxy (if desired)
   - Sand edges smooth but preserve natural shape
   - Seal edges with same finish as top
   ```

> **WARNING:** Live-edge wood varies piece-to-piece. CNC surfacing uses
> idealized model. Actual slab may have knots, voids, or thickness variations
> requiring adjustment.

### Step 8: Integrate with Digital Twin Production Tracking

Track fabrication progress in real-time.

1. After exporting all CNC files, click **"Enable Digital Twin"**

[Screenshot: Digital twin setup]

```
DIGITAL TWIN PRODUCTION TRACKING

What is Digital Twin?
Your digital design becomes a "twin" of the physical fabrication process. As each component is manufactured, the digital twin updates to reflect reality.

Benefits:
- Real-time production status
- Quality control checkpoints
- Issue detection before assembly
- Client progress updates

Setup:
1. Share production portal with fabricator
2. Fabricator scans QR codes as parts complete
3. Digital twin updates automatically
4. You and client see progress in real-time

Components to track (Johnson Kitchen):
- Cabinets: 14 units, 142 parts
- Cabinet doors: 28 doors
- Countertops: 3 slabs
- Live-edge bar: 1 piece
- Mosaic backsplash: 35 sheets

Total tracked components: 223

Cost: $0 (included in Professional tier)
```

[Screenshot: Digital twin dashboard]

2. Click **"Enable for This Project"**
3. System generates:
   - Unique QR code for each component
   - Web portal for fabricator
   - Client progress dashboard

4. **Fabricator workflow:**
   - Download component QR codes (PDF sheet)
   - Print and attach to each part as it's cut
   - Scan QR with phone when complete
   - Digital twin updates instantly

5. **Production dashboard shows:**

   ```
   JOHNSON KITCHEN - PRODUCTION STATUS

   Overall progress: 37% complete

   Cabinets:
   ■■■■■■■□□□□□□□ 7 of 14 complete (50%)
   - In progress: 4
   - Not started: 3
   - Issues: 0

   Doors:
   ■■■■■■■■■■□□□□□□□□□□□□□□□□□□ 10 of 28 complete (36%)
   - In progress: 18 (CNC running now)
   - Not started: 0
   - Issues: 0

   Countertops:
   ■■□□□ 2 of 3 complete (67%)
   - Perimeter slabs: Complete ✓
   - Island waterfall: In fabrication
   - Issues: 0

   Live-edge bar:
   ■■■□□□□□□□ CNC surfacing complete, finishing in progress (30%)

   Backsplash:
   □□□□□□□□□□ Not started (scheduled for next week)

   Estimated completion: 14 days from now
   On schedule: Yes ✓
   ```

[Screenshot: Live production tracking dashboard]

6. **Quality control checkpoints:**
   - After each component scans complete, photo required
   - Fabricator uploads photo via phone
   - AI inspects photo for defects
   - Flags issues for review

7. **Example quality check:**

   ```
   Component: Cabinet Door #14
   Status: Complete
   Photo uploaded: Yes

   AI Quality Analysis:
   ✓ Dimensions: Within tolerance (±1/16")
   ✓ Edge profile: Correct roundover
   ✓ Hinge holes: Correct quantity and position
   ⚠ Surface finish: Possible sanding marks detected

   Recommendation: Manual inspection of sanding marks
   Fabricator notified automatically
   ```

[Screenshot: AI quality inspection report with photo]

> **TIP:** Digital twin tracking dramatically reduces surprises. Know exactly
> when components will be ready for installation.

### Step 9: Generate Assembly Instructions

CNC-cut components need accurate assembly guides.

1. Click **"Manufacturing"** → **"Generate Assembly Instructions"**
2. Select components:
   - [x] All cabinets (14 units)
   - [x] Island assembly
   - [x] Countertop installation sequence

[Screenshot: Assembly instruction generator]

```
ASSEMBLY INSTRUCTION GENERATOR

Output format:
(•) Step-by-step PDF with photos
( ) Interactive 3D assembly (web-based)
( ) Video walkthrough (auto-generated)

Detail level:
( ) Basic (experienced installers)
(•) Detailed (DIY-friendly)
( ) Ultra-detailed (first-time builders)

Include:
[x] Exploded view diagrams
[x] Hardware list per assembly
[x] Tool requirements
[x] Torque specifications
[x] Assembly sequence numbers
[x] Quality checkpoints
[x] Estimated time per assembly

Language: English
Measurements: Imperial (inches)
```

3. Click **"Generate Instructions"**
4. Processing: 3-4 minutes

5. **PDF generated: 68 pages**

[Screenshot: Sample assembly instruction page]

```
Page 1: ASSEMBLY OVERVIEW
- Project: Johnson Kitchen
- Total assemblies: 14 cabinets + island + countertops
- Estimated total assembly time: 12-16 hours
- Skill level required: Intermediate
- Tools needed: (list of 18 tools)

Page 5: CABINET #1 - 36" SINK BASE
[Exploded view diagram showing all parts]

Parts required (from cutting list):
- Side panels (CB-001): 2
- Bottom panel (CB-002): 1
- Back panel (CB-003): 1
- Stretchers (CB-004): 4
[...complete list...]

Hardware required:
- Wood screws 1-1/4": 24
- Shelf pins: 8
- Euro hinges: 4
- Adjustment legs: 4
- Toe kick clips: 4

Assembly sequence:
STEP 1: Attach bottom stretchers to side panels
  - Position bottom stretchers 4.5" from bottom of sides
  - Pre-drill pilot holes 3/4" from edges
  - Drive screws, do not overtighten
  - Checkpoint: Measure diagonal (should be equal)
  [Photo showing this step]

STEP 2: Install bottom panel
  - Apply wood glue to stretcher tops
  - Position bottom panel, align edges
  - Clamp in place
  - Drive screws every 6"
  [Photo showing this step]

[... continues for 12 steps per cabinet...]

Total assembly time: 45-60 minutes per cabinet
```

[Screenshot: Exploded view diagram example]

6. **Additional generated files:**
   - `Cabinet_Hardware_Checklist.pdf` (shopping list)
   - `Assembly_Video_01_Sink_Base.mp4` (auto-generated 3D animation, 4 minutes)
   - `Quality_Checkpoint_Form.pdf` (fill out after each assembly)

7. **Share with installer:**
   - Email PDF package
   - Include access to interactive 3D if needed
   - Installer has zero ambiguity about assembly

> **TIP:** Detailed assembly instructions prevent costly mistakes. Worth the
> time to generate even for experienced installers.

### Step 10: Calculate Material Waste and Optimize

Minimize scrap and cost.

1. Click **"Manufacturing"** → **"Material Optimization Report"**

[Screenshot: Material waste analysis]

```
MATERIAL WASTE ANALYSIS

PLYWOOD (Cabinet boxes):
Purchased: 11 sheets (352 sq ft)
Used: 307 sq ft
Waste: 45 sq ft (12.8%)

Waste breakdown:
- Offcuts too small to use: 28 sq ft (8%)
- Kerf (sawblade width): 12 sq ft (3.4%)
- Edge trim allowance: 5 sq ft (1.4%)

Optimization opportunities:
✓ Current nesting is near-optimal (87.2% utilization)
⚠ Consider: Order 10 sheets + buy 1 partial sheet (~$50 savings)
✓ Offcuts can be used for drawer dividers (save $35)

QUARTZ (Countertops):
Purchased: 3 jumbo slabs (1,536 sq ft of slab area)
Used: 68 sq ft (countertop surface area)
Waste: 1,468 sq ft (95.6% waste!)

Wait, this seems bad?
No - this is normal for countertops. Waste includes:
- Unusable portions of slab (irregular edges)
- Offcuts from cutouts (sink opening = 5 sq ft)
- Fabrication scraps
- Actually, 68 sq ft from 3 slabs is 22 sq ft per slab
- Typical yield: 60-70% of slab area
- Your yield: 67% (good!)

MARBLE (Mosaic tiles):
Waterjet cutting waste: 16% average
- White marble: 11% waste (good nesting)
- Gray marble: 16% waste (average)
- Stainless steel: 22% waste (complex shapes)

Optimization opportunity:
⚠ Stainless shapes are causing high waste
Consider: Simplify accent pattern slightly (-$120 material savings)
OR: Accept 22% waste for design impact (recommended)

TOTAL PROJECT MATERIAL WASTE:
Material cost: $4,250
Waste value: $520 (12.2% of material cost)
Industry average: 15-20%
Your efficiency: Better than average ✓
```

[Screenshot: Waste percentage chart by material]

2. **Click waste reduction suggestions:**

   ```
   WASTE REDUCTION STRATEGIES

   1. Offcut library:
      - Save plywood offcuts ≥12"×12"
      - Use for drawer dividers, shims, test pieces
      - Potential savings: $35-50

   2. Scrap marble mosaic pieces:
      - Use offcuts for accent in another area
      - Create mosaic trivet as client gift
      - Potential savings: $25 + goodwill

   3. Quartz remnants:
      - Request fabricator save large remnants
      - Use for: Cutting board, trivet, sample board
      - Value: $50-100 in usable material

   4. Optimize door nesting:
      - Current: 6 sheets required
      - Suggested: Rotate 3 doors 90°
      - Result: Fit on 5.8 sheets (save 0.2 sheet = $14)

   Apply suggested optimizations? [Apply All] [Review Each]
   ```

3. Click **"Apply All"**
4. System re-optimizes nesting layouts
5. **New waste report:**
   ```
   Waste reduced from 12.2% → 10.8%
   Savings: $60 in material cost
   Additional value: $150 in usable offcuts
   Total value gained: $210
   ```

> **TIP:** Waste optimization is free money. Spending 30 minutes on optimization
> often saves $200-500 on materials.

## What You Learned

Outstanding! You've mastered custom manufacturing integration. You can now:

- **Prepare designs** for CNC and automated fabrication
- **Generate cutting lists** with optimized sheet layouts
- **Export CNC toolpaths** for cabinet doors, boxes, and components
- **Create countertop templates** for stone fabrication
- **Build parametric models** for custom sizing
- **Export complex patterns** for waterjet cutting
- **Generate surfacing toolpaths** for live-edge wood
- **Implement digital twin tracking** for production monitoring
- **Create assembly instructions** with exploded diagrams
- **Optimize material usage** to minimize waste and cost
- **Export to standard formats** (DXF, STEP, G-code, STL)

## Custom Manufacturing Best Practices

Remember these principles:

1. **Verify before cutting:** Always simulate toolpaths
2. **Material allowances:** Account for kerf, edge banding, cleanup
3. **Test cuts:** Run small test piece before full production
4. **Quality checkpoints:** Measure and verify throughout fabrication
5. **Digital twin:** Track progress to avoid surprise delays
6. **Assembly instructions:** Document even "obvious" steps
7. **Optimize materials:** 10-15% waste is good, <10% is excellent
8. **Communicate clearly:** Send both digital files AND PDFs

## Common Manufacturing Integration Pitfalls

Avoid these mistakes:

- **Wrong file format:** Verify fabricator's CAM software compatibility
- **Unit confusion:** Metric vs. imperial (double-check all exports)
- **Toolpath collision:** Simulate to catch bit crashes
- **Insufficient material:** Add 10% contingency to orders
- **Ignoring grain direction:** Especially critical for cabinet doors
- **Over-optimization:** Sometimes simplicity beats 2% efficiency gain
- **No prototype:** Consider one test assembly before full production
- **Poor documentation:** Future you will forget details - document everything

## Next Steps

Complete your advanced education:

1. **[VR Collaboration](vr-collaboration.md)** - Review CNC files in VR before
   fabrication
2. **[Phased Implementation](phased-implementation.md)** - Phase custom
   manufacturing across time
3. **[Professional Workflows](../../guides/professional-workflows.md)** -
   Integrate into business operations

## Additional Resources

- **Video:** "CNC Manufacturing Masterclass" (45 minutes)
- **Guide:** "CNC Router Setup for Cabinet Shops" (equipment guide)
- **Templates:** "Shopbot/CNC Conversion Settings" (by machine type)
- **Directory:** "CNC-Equipped Fabricators" (searchable by location)
- **Community:** "Custom Manufacturing Q&A" (expert answers)

## Feedback

Help us improve manufacturing integration:

- Email: manufacturing@kitchenxpert.com
- Report file export issues: [Bug report]
- Request CAM software support: [Software request]
- Share your CNC project: [Case study submission]

---

**Related Tutorials:**

- [Custom Surfaces](../intermediate/custom-surfaces.md)
- [VR Collaboration](vr-collaboration.md)
- [Phased Implementation](phased-implementation.md)

**Documentation:**

- [Export Formats Reference](../../reference/export-formats.md)
- [CNC Toolpath Standards](../../reference/cnc-standards.md)

**Last Updated:** 2026-01-10 **Tutorial Version:** 2.1
