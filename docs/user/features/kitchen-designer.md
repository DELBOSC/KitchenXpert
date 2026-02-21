# 3D Kitchen Designer Feature

The KitchenXpert 3D Designer is your powerful canvas for creating beautiful, functional kitchens. This comprehensive tool combines professional-grade 3D visualization with intuitive controls, making kitchen design accessible to everyone.

**Last Updated:** 2026-01-10

---

## Table of Contents

- [Overview](#overview)
- [Interface Walkthrough](#interface-walkthrough)
- [Camera Controls](#camera-controls)
- [Adding Components](#adding-components)
- [Positioning and Rotation](#positioning-and-rotation)
- [Snapping and Alignment Tools](#snapping-and-alignment-tools)
- [Collision Detection](#collision-detection)
- [Measurements and Dimensions](#measurements-and-dimensions)
- [Materials and Finishes](#materials-and-finishes)
- [Lighting Preview](#lighting-preview)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Tips and Tricks](#tips-and-tricks)

---

## Overview

The 3D Kitchen Designer is the heart of KitchenXpert, where your ideas become reality.

**Key Features:**
- Real-time 3D rendering with WebGL 2.0
- Drag-and-drop component placement
- Precise measurement tools
- Realistic materials and lighting
- Collision detection for error-free designs
- Automatic snapping and alignment
- Unlimited undo/redo
- Real-time collaboration support

**System Requirements:**
- Modern browser (Chrome, Edge, Firefox, Safari)
- WebGL 2.0 support
- 4GB+ RAM recommended
- Mouse or trackpad

[Screenshot: Full 3D designer interface overview]

---

## Interface Walkthrough

The designer interface is organized into four main areas:

### Top Navigation Bar

Located at the very top of the screen:

**Left Side:**
- **KitchenXpert Logo**: Click to return to dashboard
- **Project Name**: Shows current project name (click to rename)
- **Auto-save Indicator**: "Saved 30 seconds ago"

**Center:**
- **View Presets**: Top View, Front View, Isometric, First-Person, Bird's Eye
- **2D/3D Toggle**: Switch between plan view and 3D view

**Right Side:**
- **Share Button**: Collaborate and share your design
- **Export Menu**: PDF, 3D Model, Images
- **Account Menu**: Settings, help, sign out

[Screenshot: Top navigation bar with labeled sections]

---

### Main Canvas Area

The large central workspace where your kitchen appears:

**Features:**
- **3D Viewport**: Real-time rendered kitchen
- **Grid Floor**: Optional grid overlay (toggle with G key)
- **Axis Indicator**: X, Y, Z axis helper in bottom-left corner
- **Selection Highlight**: Selected objects outlined in blue
- **Transformation Handles**: Move, rotate, scale selected objects

**Canvas Interactions:**
- Left-click: Select objects
- Left-click + Drag: Rotate camera (when not on object)
- Right-click + Drag: Pan camera
- Scroll: Zoom in/out
- Double-click: Focus on object

[Screenshot: Main canvas with kitchen design in progress]

---

### Right Sidebar

Multi-purpose panel with three tabs:

#### Catalog Tab
- **Search Bar**: Find products quickly
- **Filter Options**: Category, brand, price, dimensions
- **Product Grid**: Thumbnail view of available products
- **Product Details**: Click any product for specs
- **Drag-to-Add**: Drag products onto canvas

#### Properties Tab
- **Object Properties**: Dimensions, position, rotation of selected object
- **Material Options**: Change finishes and colors
- **Product Info**: Name, model, price, specifications
- **Actions**: Delete, duplicate, replace

#### Layers Tab
- **Layer Management**: Organize design elements
- **Visibility Toggle**: Show/hide layers
- **Lock/Unlock**: Prevent accidental edits
- **Grouping**: Create component groups

[Screenshot: Right sidebar showing all three tabs]

---

### Bottom Toolbar

Essential tools always at your fingertips:

**Left Section:**
- **Select Tool** (V): Default selection mode
- **Measure Tool** (M): Measure distances
- **Wall Tool** (W): Add/edit walls
- **Door Tool**: Add/edit doors
- **Window Tool**: Add/edit windows

**Center Section:**
- **Grid Snap** (G): Toggle grid snapping
- **Object Snap** (S): Toggle object snapping
- **Collision Detection**: Toggle collision warnings
- **Show Dimensions**: Toggle measurement display

**Right Section:**
- **Undo** (Ctrl+Z): Revert last action
- **Redo** (Ctrl+Y): Restore undone action
- **View Options**: Wireframe, materials, lighting
- **Help** (?): Quick help overlay

[Screenshot: Bottom toolbar with tool descriptions]

---

## Camera Controls

Master camera navigation for effortless design:

### Mouse Controls

**Rotation:**
- **Left-click + Drag** on empty space
- Camera orbits around pivot point
- Pivot point is center of scene or selected object

**Pan:**
- **Right-click + Drag** anywhere
- Or **Middle-click + Drag**
- Moves camera parallel to view plane

**Zoom:**
- **Scroll Wheel** up/down
- Or **Pinch** gesture on trackpad
- Zooms toward cursor position

**Focus:**
- **Double-click** any object
- Camera centers on that object
- Useful for detailed work on specific components

[Screenshot: Camera control demonstration]

---

### Keyboard Controls

**Arrow Keys:**
- **↑ ↓ ← →**: Pan camera in small increments
- **Shift + Arrows**: Pan in larger increments

**Zoom:**
- **+** or **=**: Zoom in
- **-** or **_**: Zoom out
- **0**: Fit all to view

**Reset:**
- **R**: Reset camera to default isometric view
- **Home**: Return to starting position

**Object Focus:**
- **F**: Focus camera on selected object
- **Shift+F**: Focus on all objects (fit to view)

---

### View Presets

Quick access to standard views:

**1. Top View (Plan View)**
- Keyboard: **1**
- Perfect for layout planning
- See your kitchen from directly above
- Like traditional 2D floor plans

**2. Front View**
- Keyboard: **2**
- Elevation view from front
- See cabinet heights and alignments
- Check vertical spacing

**3. Isometric View (Default)**
- Keyboard: **3**
- 3D perspective from angle
- Best for overall design visualization
- Standard starting view

**4. First-Person View**
- Keyboard: **4**
- Walk through your kitchen
- Experience at eye level
- Use WASD keys to navigate

**5. Bird's Eye View**
- Keyboard: **5**
- High angle overview
- See entire kitchen at once
- Good for screenshots

**6. Custom Views**
- Save any camera position: **Ctrl+Shift+1-9**
- Recall saved views: **Ctrl+1-9**
- Manage saved views: View menu

[Screenshot: Comparison of different view presets]

---

### Advanced Camera Settings

Access via View > Camera Settings:

**Field of View (FOV):**
- Adjust perspective (30° - 120°)
- Default: 50° (natural)
- Wider FOV: More dramatic, fits more in view
- Narrower FOV: More realistic, architectural feel

**Camera Speed:**
- Adjust pan and rotation sensitivity
- Default: Medium
- Increase for faster navigation
- Decrease for precise control

**Clipping Planes:**
- Near clipping: How close camera can get
- Far clipping: Maximum view distance
- Adjust if objects disappear when zooming

---

## Adding Components

Populate your kitchen with products from our catalog:

### Drag-and-Drop Method

**Step-by-step:**

1. **Open Catalog** (right sidebar > Catalog tab)
2. **Find Product**:
   - Browse by scrolling
   - Search by name/model
   - Filter by category/brand/price
3. **Click product** to see preview and details
4. **Drag thumbnail** from catalog onto canvas
5. **Move mouse** to desired location (component follows cursor)
6. **Click** to place component
7. **Adjust position** as needed

**Visual Feedback:**
- **Green outline**: Valid placement location
- **Red outline**: Collision detected (overlapping)
- **Yellow outline**: Tight fit (< 2cm clearance)
- **Snap lines**: Alignment guides appear when near walls/objects

[Screenshot: Dragging component from catalog to canvas]

---

### Click-to-Add Method

**Alternative approach:**

1. **Click product** in catalog
2. **Click "Add to Design"** button in product details
3. Component appears at center of view
4. **Drag** to final position

**Useful when:**
- Adding multiple copies of same product
- Unsure of exact placement
- Want to see component before committing

---

### Component Categories

**Base Cabinets:**
- Standard base (60cm, 80cm, 100cm widths)
- Sink base
- Corner base (L-shape, carousel)
- Drawer banks
- Appliance housing

**Wall Cabinets:**
- Standard wall (30cm, 60cm, 80cm widths)
- Glass-front display
- Corner wall
- Open shelving
- Range hood housing

**Tall Cabinets:**
- Pantry units
- Oven housing
- Fridge housing
- Full-height storage

**Worktops:**
- Straight sections (custom lengths)
- Corner sections (L-shape, U-shape)
- Island tops
- Breakfast bars

**Appliances:**
- Ovens (built-in, freestanding)
- Cooktops (gas, electric, induction)
- Refrigerators (built-in, freestanding, French door)
- Dishwashers (full-size, compact)
- Range hoods
- Microwaves, coffee machines, wine coolers

**Sinks & Faucets:**
- Single bowl, double bowl
- Undermount, top-mount
- Various faucet styles

**Accessories:**
- Handles and knobs
- Lighting (pendant, under-cabinet, ceiling)
- Decorative items

[Screenshot: Catalog with categories highlighted]

---

### Quick Add Features

**Duplicate Component:**
- Select object
- Press **Ctrl+D** (Cmd+D on Mac)
- Duplicate appears slightly offset
- Perfect for repeating elements (e.g., multiple base cabinets)

**Add Multiple:**
- Select object
- Edit > Add Multiple
- Specify quantity and spacing
- Creates linear array (e.g., 5 wall cabinets evenly spaced)

**Replace Component:**
- Select object
- Right-click > Replace With
- Choose alternative from catalog
- Maintains position and rotation

---

## Positioning and Rotation

Fine-tune component placement with precision:

### Moving Components

**Free Movement:**
- **Click and drag** object to new location
- Moves in X and Z plane (horizontal)
- Green arrows show movement direction

**Constrained Movement:**
- **Click object**, then **click arrow handle** (red, green, or blue)
- **Red arrow**: Move along X-axis only
- **Green arrow**: Move along Y-axis only (up/down)
- **Blue arrow**: Move along Z-axis only

**Keyboard Nudge:**
- **Arrow keys**: Move 1cm increments
- **Shift + Arrows**: Move 10cm increments
- **Ctrl + Arrows**: Move 0.1cm increments (precision)

**Numeric Input:**
- Select object
- Properties panel > Position
- Enter exact X, Y, Z coordinates
- Perfect for symmetrical layouts

[Screenshot: Object with movement handles visible]

---

### Rotating Components

**Free Rotation:**
- **Click object**
- **Circular rotation handle** appears at base
- **Drag handle** to rotate around Y-axis (vertical)
- Real-time preview as you rotate

**Constrained Rotation:**
- Select object
- Properties panel > Rotation
- **Y-axis (Yaw)**: Rotate horizontally (most common)
- **X-axis (Pitch)**: Tilt forward/backward
- **Z-axis (Roll)**: Tilt left/right

**Keyboard Rotation:**
- **[ key**: Rotate 15° counter-clockwise
- **] key**: Rotate 15° clockwise
- **Shift + [ or ]**: Rotate 45°
- **Ctrl + [ or ]**: Rotate 90° (snap to cardinal directions)

**Numeric Input:**
- Properties panel > Rotation
- Enter exact angle (0-360°)
- Perfect for precise alignment

**Smart Rotation:**
When snapping is enabled, rotation automatically snaps to:
- 45° increments (standard)
- 90° increments (hold Shift)
- Custom increments (Settings > Snap > Rotation Snap Angle)

[Screenshot: Object being rotated with rotation handles]

---

### Height Adjustment

**Wall-Mounted Components:**

Wall cabinets, range hoods, and other wall-mounted items have vertical positioning:

**Drag Handles:**
- Select wall-mounted object
- **Green vertical arrow** appears
- Drag up/down to adjust mounting height

**Keyboard:**
- **Page Up**: Raise 5cm
- **Page Down**: Lower 5cm
- **Shift + Page Up/Down**: Raise/lower 10cm

**Numeric Input:**
- Properties panel > Height from Floor
- Enter exact measurement
- Standard wall cabinet height: 150cm from floor

**Presets:**
- Right-click wall cabinet > Height Presets
- Standard: 150cm (most common)
- High: 165cm (for taller ceilings)
- Low: 135cm (above countertop appliances)

---

### Scaling Components

**Custom Worktops:**
- Select worktop
- Scaling handles appear at ends
- Drag to adjust length
- Width fixed (typically 60cm)

**Note:** Most components have fixed dimensions matching real products. Only custom elements (worktops, custom cabinets) are scalable.

---

## Snapping and Alignment Tools

Create professional, precise layouts effortlessly:

### Snap Settings

Enable/disable snapping via toolbar or keyboard:

**Grid Snap (G key):**
- Aligns objects to invisible grid
- Grid size: 5cm, 10cm, or 25cm (adjustable in settings)
- Useful for: Evenly spaced layouts, symmetrical designs
- Toggle on/off as needed

**Object Snap (S key):**
- Aligns objects to nearby objects
- Snaps to: Edges, corners, centers, midpoints
- Snap distance: 2cm tolerance (adjustable)
- Visual feedback: Yellow snap lines appear

**Wall Snap:**
- Automatically aligns cabinets flush against walls
- Cabinets "stick" to walls when within 5cm
- Proper spacing maintained (1-2cm gap for plumbing/wiring)
- Always enabled (cannot disable)

**Center Snap:**
- Aligns objects to center of walls or spaces
- Useful for: Centering sinks, range hoods, islands
- Snap line shows center axis
- Toggle: Settings > Snap > Enable Center Snap

[Screenshot: Object snapping to grid with snap lines visible]

---

### Alignment Tools

**Align Selected Objects:**

Select multiple objects (Ctrl+Click), then:

**Edit > Align > Left:**
- Aligns left edges of all selected objects
- Reference: Leftmost object

**Edit > Align > Right:**
- Aligns right edges

**Edit > Align > Top:**
- Aligns top surfaces (height)

**Edit > Align > Bottom:**
- Aligns bottom (floor level)

**Edit > Align > Center Horizontally:**
- Centers along horizontal axis

**Edit > Align > Center Vertically:**
- Centers along vertical axis

**Keyboard Shortcuts:**
- **Ctrl+Shift+L**: Align left
- **Ctrl+Shift+R**: Align right
- **Ctrl+Shift+T**: Align top
- **Ctrl+Shift+B**: Align bottom
- **Ctrl+Shift+C**: Center horizontally
- **Ctrl+Shift+V**: Center vertically

[Screenshot: Multiple cabinets being aligned]

---

### Distribution Tools

**Evenly Space Objects:**

Select 3 or more objects, then:

**Edit > Distribute > Horizontally:**
- Equal spacing between objects along X-axis
- Outermost objects stay fixed

**Edit > Distribute > Vertically:**
- Equal spacing along Z-axis

**Distribute by Gaps:**
- Equal gaps between objects

**Distribute by Centers:**
- Equal distance between object centers

**Example Use Case:**
- Place 4 wall cabinets roughly along wall
- Select all 4
- Edit > Distribute > Horizontally
- Result: Perfectly evenly spaced cabinets

---

### Smart Guides

**Temporary alignment helpers:**

While dragging objects, smart guides appear showing:
- **Alignment** with other objects (dashed lines)
- **Equal spacing** indicators
- **Center alignment** markers
- **Distance measurements** from nearby objects

**Enable/Disable:**
Settings > Display > Show Smart Guides

---

### Flush Alignment

**Remove gaps between cabinets:**

1. Place cabinets near each other
2. Select all cabinets to align
3. Right-click > Make Flush
4. All gaps removed, cabinets perfectly connected

**Auto-flush mode:**
Settings > Snap > Auto-flush Adjacent Cabinets
When enabled, cabinets automatically connect when within 2cm.

---

## Collision Detection

Prevent design errors with intelligent collision detection:

### How It Works

KitchenXpert constantly checks for overlapping components:

**Visual Indicators:**

**Green Checkmark:**
- No collision detected
- Proper clearance maintained (2cm+)
- Safe to proceed

**Yellow Warning:**
- Tight fit detected (< 2cm clearance)
- Not a collision, but minimal space
- Review carefully (may impede door opening, installation)

**Red Highlight:**
- Collision detected (objects overlapping)
- Cannot finalize design with collisions
- Must resolve before exporting or ordering

**Red Outline:**
- Both colliding objects outlined in red
- Transparent red overlay shows overlap area
- Severity score (minor, moderate, severe)

[Screenshot: Collision detection showing red highlighted overlap]

---

### Collision Types

**1. Cabinet-to-Cabinet:**
- Two cabinets overlapping
- Most common collision type
- Usually easy to fix (move one cabinet)

**2. Cabinet-to-Wall:**
- Cabinet extends through wall
- May occur when rotating or moving
- Fix: Pull cabinet away from wall

**3. Cabinet-to-Appliance:**
- Appliance overlaps with cabinet
- Check appliance housing dimensions

**4. Door/Drawer Clearance:**
- Advanced collision detection
- Checks if doors/drawers can open
- Simulates opening arc
- Warns if handles or doors collide

**5. Appliance Ventilation:**
- Checks required clearances
- Example: Refrigerator needs 5cm side clearance
- Oven needs 10cm above clearance
- Warnings appear if violated

---

### Resolving Collisions

**Automatic Suggestions:**

When collision detected:
1. Warning popup appears
2. "Show Problem" button highlights colliding objects
3. "Suggest Fix" button offers solutions:
   - Move object A by X cm
   - Rotate object B by 90°
   - Replace with smaller alternative
4. "Apply Fix" button applies suggestion
5. Or "Ignore" to manually fix

**Manual Resolution:**

1. **Identify colliding objects** (both outlined in red)
2. **Select one object**
3. **Move, rotate, or delete** to resolve
4. **Monitor indicator** (changes from red → yellow → green)

**Common Fixes:**
- Move cabinet 5-10cm away
- Rotate cabinet 90° to different orientation
- Replace with narrower alternative
- Delete extra component

---

### Collision Settings

**Configure collision detection:**

Settings > Design > Collision Detection

**Sensitivity:**
- **Strict**: Warns at 5cm clearance
- **Normal**: Warns at 2cm clearance (default)
- **Relaxed**: Warns only on direct overlap

**Check Types:**
- ☑ Object overlap (always enabled)
- ☑ Door/drawer clearance
- ☑ Appliance ventilation
- ☑ Traffic flow (minimum walkway width)

**Advanced:**
- ☑ Check installation clearances
- ☑ Warn about plumbing conflicts
- ☑ Warn about electrical conflicts

---

### Temporary Disable

**For advanced users:**

Sometimes you need to temporarily disable collision detection:

1. **Toolbar** > Collision Detection icon (toggle off)
2. Icon turns gray
3. Place objects freely (no warnings)
4. **Re-enable** when done
5. Review all collisions at once

**Use cases:**
- Importing complex designs
- Precise overlays for measurements
- Custom modifications

**Warning:** Always re-enable before finalizing design!

---

## Measurements and Dimensions

Precise measurements throughout your design:

### Auto-Dimensions

**Automatic measurement display:**

**Enable:** Press **M** key or View > Show Dimensions

**What you see:**
- **Object dimensions**: Width × Depth × Height labels on each component
- **Spacing**: Distance between adjacent objects
- **Wall distances**: Distance from cabinets to walls
- **Overall dimensions**: Total kitchen width and depth

**Display modes:**
- **All Dimensions**: Every measurement visible (can be cluttered)
- **Selected Only**: Measurements only for selected object
- **Smart**: Automatically shows relevant measurements
- **Off**: No dimension display

**Customize:**
Settings > Display > Dimensions
- Font size
- Color
- Units (cm, mm, inches, feet)
- Decimal places

[Screenshot: Kitchen with auto-dimensions displayed]

---

### Manual Measure Tool

**Measure any distance:**

1. **Click Measure Tool** (M) in toolbar
2. **Click first point** (anywhere in 3D space)
   - Snap to object corners, centers, edges
   - Or click empty space for custom point
3. **Move mouse** to second point
   - Live measurement updates as you move
4. **Click second point** to finalize
5. **Measurement line** appears with distance label

**Measurement Features:**
- **Perpendicular snap**: Hold Shift for horizontal/vertical only
- **Multiple measurements**: Create multiple measurement lines
- **Persistent**: Measurements stay until deleted
- **Edit**: Click measurement to edit endpoints
- **Delete**: Select measurement and press Delete

**Keyboard:**
- **M**: Activate measure tool
- **Esc**: Cancel current measurement
- **Delete**: Remove selected measurement
- **Ctrl+M**: Measure from last endpoint (chain measurements)

---

### Area Calculation

**Calculate floor area:**

**Total Kitchen Area:**
- Properties panel (no selection) > Area
- Shows total floor area in m² or ft²

**Zone Areas:**
1. Tools > Define Zone
2. Click corners to draw polygon
3. Area calculated automatically
4. Useful for: Tile estimates, flooring quotes, work zones

**Worktop Area:**
- Select all worktops (Ctrl+Click)
- Properties panel > Total Surface Area
- Useful for: Worktop quotes, surface treatment estimates

---

### Component Dimensions

**View individual component specifications:**

1. **Select any object**
2. **Properties panel** > Dimensions tab

**Displayed:**
- **Width (W)**: Left-to-right dimension
- **Depth (D)**: Front-to-back dimension
- **Height (H)**: Floor-to-top dimension
- **Weight**: Component weight (for installation planning)
- **Capacity**: Internal volume (for storage units)

**For Appliances:**
- **Installation dimensions**: Required cutout size
- **Clearances**: Minimum spacing required
- **Door swing**: Arc of door opening (if applicable)

---

### Export Measurements

**Create measurement report:**

1. File > Export > Dimension Report
2. Choose format (PDF or Excel)
3. Select what to include:
   - All component dimensions
   - Spacings and clearances
   - Wall dimensions
   - Custom measurements
4. Export

**Report includes:**
- Detailed dimension table
- Visual 2D plan with labeled measurements
- Installation notes
- Clearance verification checklist

Perfect for contractors and installers!

---

## Materials and Finishes

Customize the appearance of your kitchen:

### Changing Cabinet Finishes

**Select and customize:**

1. **Select cabinet** (click to select)
2. **Properties panel** > Materials tab
3. **Choose finish type:**
   - **Solid Colors**: White, black, gray, custom colors
   - **Wood Veneer**: Oak, walnut, maple, cherry, etc.
   - **Laminate**: Wide color range, affordable
   - **Lacquer**: High-gloss, modern look
   - **Glass**: For display cabinets

4. **Color selection:**
   - **Preset swatches**: Click to apply
   - **Custom color**: RGB or Hex color picker
   - **Brand-specific**: IKEA colors, Schmidt palettes

5. **Preview** updates in real-time on 3D model

**Apply to Multiple:**
- Select multiple cabinets (Ctrl+Click)
- Change material
- All selected update together
- Useful for: Consistent base cabinet color

[Screenshot: Material selection panel with swatches]

---

### Cabinet Door Styles

**For compatible cabinets:**

Properties panel > Door Style

**Options:**
- **Flat/Slab**: Modern, minimalist, no details
- **Shaker**: Classic frame with recessed panel
- **Glass-front**: Transparent or frosted glass
- **Beadboard**: Vertical grooves, cottage style
- **Raised panel**: Traditional, ornate
- **Handleless**: Integrated grip, modern

**Note:** Door style availability depends on cabinet brand/model.

---

### Worktop Materials

**Customize countertop:**

1. Select worktop
2. Properties panel > Materials tab

**Material Types:**

**Laminate:**
- Budget-friendly
- Many colors and patterns
- Mimics wood, stone, solid colors
- Low maintenance

**Solid Wood:**
- Natural beauty
- Warm appearance
- Requires maintenance (oiling)
- Options: Oak, walnut, maple, bamboo

**Granite:**
- Natural stone
- Unique patterns (each slab different)
- Heat-resistant, durable
- Requires sealing
- Premium price

**Quartz (Engineered Stone):**
- Consistent appearance
- Wide color range
- Very durable, low maintenance
- Heat and scratch resistant
- Premium price

**Marble:**
- Luxury appearance
- Classic elegance
- Requires careful maintenance
- Stains and etches easily
- Highest price

**Solid Surface (Corian):**
- Seamless appearance
- Repairable (scratches can be sanded out)
- Many colors
- Mid-to-high price

**Concrete:**
- Industrial, modern look
- Customizable (colors, aggregates)
- Requires sealing
- Heavy (structural considerations)

[Screenshot: Worktop material comparison]

---

### Hardware (Handles and Knobs)

**Change cabinet hardware:**

1. Select cabinet(s)
2. Properties panel > Hardware tab

**Handle Types:**
- **Bar Handles**: Modern, horizontal
- **Cup Pulls**: Traditional, semi-circular
- **Knobs**: Round, classic
- **Edge Pulls**: Integrated into cabinet edge
- **Handleless**: Push-to-open mechanism

**Finishes:**
- Chrome (polished, brushed)
- Stainless steel
- Brass (polished, antique)
- Black matte
- Bronze
- Copper
- Nickel (polished, brushed, satin)

**Apply All:**
- Change one cabinet's hardware
- Right-click > Apply Hardware to All Cabinets
- Consistent look instantly

---

### Backsplash

**Add and customize backsplash:**

1. Tools > Add Backsplash
2. Click worktop to add backsplash above
3. Properties panel > Material

**Materials:**
- **Ceramic Tile**: Many patterns, affordable
- **Glass Tile**: Sleek, modern, reflective
- **Stone**: Natural look, matches worktop
- **Metal**: Industrial, easy to clean
- **Solid Surface**: Seamless with worktop

**Height:**
- Standard: 60cm (between worktop and wall cabinets)
- Full height: Up to ceiling
- Custom: Enter exact height

---

### Color Schemes

**Create cohesive design:**

Tools > Color Scheme Generator

**Pre-made schemes:**
- **Monochromatic**: Single color, varied shades
- **Complementary**: Opposite color wheel colors
- **Analogous**: Adjacent color wheel colors
- **Two-tone**: Popular contrast (e.g., white top, gray bottom)

**Custom scheme:**
1. Pick primary color (base cabinets)
2. Pick secondary color (wall cabinets)
3. Pick accent color (island or features)
4. System suggests coordinating materials

**Apply scheme:**
- "Apply to Design" button
- All applicable components update
- Maintains brand selections, only changes colors/finishes

---

## Lighting Preview

Visualize your kitchen in different lighting conditions:

### Lighting Modes

**Quick access:** View > Lighting > [Mode]

**1. Natural Daylight:**
- Bright, even illumination
- Simulates mid-day sun
- Best for: General design work, accurate color representation
- No shadows (for clarity)

**2. Morning Light:**
- Soft, warm tones (color temperature: 3500K)
- Gentle shadows
- Simulates sunrise/morning
- Best for: Realistic preview, warm ambiance

**3. Evening Light:**
- Cooler, ambient lighting (color temperature: 5500K)
- Longer shadows
- Simulates late afternoon
- Best for: Dramatic visualization

**4. Night Mode:**
- Only artificial lights illuminated
- Under-cabinet LED strips
- Overhead lights
- Pendant lights
- Best for: See how kitchen looks in evening, test lighting design

**5. Studio Lighting:**
- Professional photography-style lighting
- Multiple soft lights from all angles
- No harsh shadows
- Best for: Marketing renders, perfect presentations

[Screenshot: Same kitchen in 5 different lighting modes]

---

### Adding Light Sources

**Place light fixtures:**

1. **Catalog** > Accessories > Lighting
2. **Choose light type:**
   - Ceiling lights (flush-mount, recessed)
   - Pendant lights (over island, dining area)
   - Under-cabinet LED strips
   - Track lighting
   - Chandeliers
3. **Drag onto design**
4. **Position** above island, over sink, etc.

**Light Properties:**
- **Intensity**: Brightness level (0-100%)
- **Color Temperature**: Warm (2700K) to Cool (6500K)
- **Beam Angle**: Spot vs. flood (for recessed lights)
- **On/Off**: Toggle for night mode preview

---

### Under-Cabinet Lighting

**Add LED strips:**

1. Select wall cabinets
2. Right-click > Add Under-Cabinet Lighting
3. LED strip appears automatically beneath
4. Properties:
   - Color temperature
   - Brightness
   - Continuous or segmented

**Benefits:**
- Task lighting for countertops
- Ambiance in night mode
- Modern, professional look

---

### Natural Light (Windows)

**Add windows for natural light:**

1. **Window Tool** (bottom toolbar)
2. **Click wall** where window should be
3. **Set dimensions** (width, height, sill height)
4. **Lighting automatically adjusts** based on window size and position

**Natural light features:**
- Sunlight streams through window
- Shadows cast based on virtual sun position
- Time of day slider (see lighting at different times)
- Seasonal variations (summer vs. winter sun angles)

---

### Shadows and Reflections

**Enhance realism:**

Settings > Graphics > Quality

**Shadow Settings:**
- **Off**: No shadows (faster performance)
- **Soft Shadows**: Realistic, subtle
- **Hard Shadows**: High contrast, dramatic
- **Ray-Traced** (Pro only): Physically accurate shadows

**Reflection Settings:**
- **Off**: Matte surfaces only
- **Screen Space**: Fast, approximate reflections
- **Ray-Traced** (Pro only): Perfect mirror reflections on glossy surfaces

**Note:** Ray-tracing requires powerful GPU, longer render times.

---

### Render Modes

**Toggle visual quality:**

Bottom toolbar > View Options

**1. Wireframe:**
- Outlines only
- Fast performance
- Useful for: Complex designs, older computers

**2. Flat Shaded:**
- Basic colors, no lighting
- Medium performance
- Useful for: Quick layout work

**3. Smooth Shaded (Default):**
- Realistic lighting and materials
- Balanced performance
- Best for: Most design work

**4. Photorealistic (Ray-Traced):**
- Highest quality
- Accurate reflections and shadows
- Slow performance (real-time or offline render)
- Best for: Final presentations, client reviews

---

## Keyboard Shortcuts

Master these shortcuts for efficient design:

### Essential Shortcuts

| Action | Shortcut |
|--------|----------|
| **Undo** | Ctrl+Z |
| **Redo** | Ctrl+Y |
| **Save** | Ctrl+S |
| **Copy** | Ctrl+C |
| **Paste** | Ctrl+V |
| **Duplicate** | Ctrl+D |
| **Delete** | Delete or Backspace |
| **Select All** | Ctrl+A |
| **Deselect** | Esc |

---

### View & Navigation

| Action | Shortcut |
|--------|----------|
| **Toggle 2D/3D** | Space |
| **Top View** | 1 |
| **Front View** | 2 |
| **Isometric View** | 3 |
| **First-Person** | 4 |
| **Bird's Eye** | 5 |
| **Reset Camera** | R |
| **Focus Selected** | F |
| **Fit All to View** | 0 |
| **Toggle Grid** | G |
| **Toggle Snap** | S |
| **Show Dimensions** | M |

---

### Tools

| Action | Shortcut |
|--------|----------|
| **Select Tool** | V |
| **Measure Tool** | M |
| **Wall Tool** | W |
| **Pan Camera** | Hold Space + Drag |

---

### Object Manipulation

| Action | Shortcut |
|--------|----------|
| **Move (Arrow Keys)** | ↑ ↓ ← → |
| **Move (Large)** | Shift + Arrows |
| **Move (Precision)** | Ctrl + Arrows |
| **Rotate CCW** | [ |
| **Rotate CW** | ] |
| **Rotate 45°** | Shift + [ or ] |
| **Rotate 90°** | Ctrl + [ or ] |
| **Raise/Lower** | Page Up/Down |

---

### Selection

| Action | Shortcut |
|--------|----------|
| **Add to Selection** | Ctrl+Click |
| **Select Similar** | Shift+Ctrl+Click |
| **Rectangular Selection** | Click+Drag |

---

### Alignment

| Action | Shortcut |
|--------|----------|
| **Align Left** | Ctrl+Shift+L |
| **Align Right** | Ctrl+Shift+R |
| **Align Top** | Ctrl+Shift+T |
| **Align Bottom** | Ctrl+Shift+B |
| **Center Horizontal** | Ctrl+Shift+C |
| **Center Vertical** | Ctrl+Shift+V |

---

### Export & Share

| Action | Shortcut |
|--------|----------|
| **Screenshot** | F12 |
| **Export PDF** | Ctrl+E |
| **Share** | Ctrl+Shift+S |

---

### Help

| Action | Shortcut |
|--------|----------|
| **Help Overlay** | ? or F1 |
| **Shortcut List** | Ctrl+/ |

---

### Custom Shortcuts

**Personalize your workflow:**

1. Settings > Keyboard Shortcuts
2. Click any action
3. Press your desired key combination
4. Click "Assign"
5. Conflicts highlighted in red

**Reset to defaults:** Settings > Keyboard Shortcuts > Reset All

---

## Tips and Tricks

### Efficiency Tips

**1. Duplicate for Repetition:**
- Place first base cabinet
- Press Ctrl+D to duplicate
- Adjust position
- Repeat
- Much faster than catalog drag-and-drop for multiples

**2. Component Groups:**
- Select related items (e.g., sink, faucet, cabinet below)
- Ctrl+G to group
- Move all together as one unit
- Ungroup: Ctrl+Shift+G

**3. Use Layers:**
- Organize complex designs: Base cabinets (layer 1), Wall cabinets (layer 2), Appliances (layer 3)
- Toggle layer visibility when working on specific area
- Lock layers to prevent accidental edits

**4. Save Camera Views:**
- Position camera for detail work on specific area
- Ctrl+Shift+1 to save as View 1
- Return anytime with Ctrl+1
- Save up to 9 custom views

**5. Templates:**
- Create standard base cabinet run
- Save as template (File > Save as Template)
- Reuse in future designs
- Share templates with team

**6. Copy Settings:**
- Change one cabinet's material
- Ctrl+C to copy
- Select other cabinets
- Ctrl+Shift+V to paste material only
- Faster than changing each individually

---

### Design Tips

**1. Kitchen Work Triangle:**
- Position **sink**, **stove**, and **fridge** in triangle
- Each leg: 1.2m - 2.7m ideal
- Total triangle perimeter: 4m - 8m optimal
- Ensures efficient workflow

**2. Counter Space:**
- Leave at least **60cm** on either side of cooktop (prep space)
- **40cm landing zone** next to refrigerator (unloading groceries)
- **40cm landing zone** next to oven (hot dishes)
- **80cm+** continuous counter space for main prep area

**3. Traffic Flow:**
- Maintain **120cm** minimum for walkways
- If multiple cooks, consider **150cm**
- Don't place work triangle across main traffic path

**4. Appliance Placement:**
- **Dishwasher**: Next to sink (easier plumbing, workflow)
- **Refrigerator**: End of cabinet run (doesn't break counter space)
- **Oven**: Not in corner (door needs clearance to open fully)
- **Microwave**: 90-120cm from floor (eye level, accessible)

**5. Storage Optimization:**
- **Most used items**: Base cabinets and lower wall cabinets
- **Daily dishes**: Wall cabinets near dishwasher
- **Pots and pans**: Drawers (easier access than base cabinets)
- **Tall items**: Pantry or tall cabinets

**6. Visual Balance:**
- **Symmetry**: Centered range hood above cooktop
- **Weight**: Balance heavy elements (dark cabinets) on both sides
- **Rhythm**: Repeat elements (e.g., glass cabinets on both sides)

**7. Lighting Layers:**
- **Ambient**: Overhead ceiling lights (general illumination)
- **Task**: Under-cabinet lights (prep areas)
- **Accent**: Pendant lights (focal points, island)

**8. Scale and Proportion:**
- **Island**: 100cm × 200cm minimum (comfortable seating)
- **Ceiling Height**: If 240cm+, consider tall cabinets (90cm wall cabinets)
- **Cabinet to Worktop**: 45cm backsplash area (standard)

---

### Troubleshooting Tips

**"Component won't snap to wall":**
- Ensure Wall Snap is enabled (Settings > Snap)
- Bring component within 5cm of wall
- Rotate to correct orientation (back of cabinet to wall)

**"Can't see my component":**
- Might be inside another object (collision)
- Check layers (might be on hidden layer)
- Press 0 to fit all to view
- Check if accidentally deleted (Undo: Ctrl+Z)

**"Movement is too sensitive/not sensitive enough":**
- Settings > Controls > Mouse Sensitivity
- Adjust sliders for pan, rotate, zoom

**"3D view is slow":**
- Settings > Graphics > Quality: Lower to Medium or Low
- Disable shadows
- Disable reflections
- Close other browser tabs
- Hide layers you're not working on

**"Measurements showing in wrong units":**
- Settings > Units > Choose cm, mm, inches, or feet

**"Can't select object behind another":**
- Click multiple times to cycle through stacked objects
- Or use Layer panel to select from list

---

**Congratulations!** You've mastered the KitchenXpert 3D Designer. Now start creating your dream kitchen!

For more help:
- [Getting Started Guide](../getting-started.md)
- [FAQ](../faq.md)
- [Tutorial Library](../tutorials/)
- Live chat support

---

*Last Updated: 2026-01-10*
*For the latest version, visit [docs.kitchenxpert.com/user/features/kitchen-designer](https://docs.kitchenxpert.com/user/features/kitchen-designer)*
