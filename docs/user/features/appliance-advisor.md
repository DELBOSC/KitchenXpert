# AI Appliance Advisor

Get personalized appliance recommendations based on your cooking habits, kitchen
size, budget, and energy preferences. Find the perfect appliances with
confidence.

**Last Updated:** 2026-01-10

---

## What is the Appliance Advisor?

**Your personal appliance consultant powered by AI**

Instead of browsing hundreds of appliances, answer a few questions and receive
curated recommendations matched to your specific needs.

**How it works:**

1. Answer 8-10 questions (2-3 minutes)
2. AI analyzes your requirements
3. Receive ranked recommendations with match scores
4. Review detailed comparisons
5. Add to your kitchen design with one click

**Available for:**

- Ovens (single, double, steam, combination)
- Cooktops (gas, electric, induction)
- Refrigerators (all types and sizes)
- Dishwashers (full-size, compact, drawer)
- Range hoods (wall, island, integrated)
- Microwaves (built-in, drawer, countertop)
- Specialty appliances (wine coolers, coffee machines)

[Screenshot: Appliance Advisor interface]

---

## How Recommendations Work

### Input Parameters

**Kitchen Context:**

- Kitchen size (small, medium, large)
- Existing design (if available, for sizing compatibility)
- Installation type (built-in vs. freestanding)

**Cooking Habits:**

- Frequency (rarely, occasionally, frequently, daily)
- Cooking style (quick meals, home cooking, gourmet, baking)
- Household size (1-2, 3-4, 5-6, 7+ people)

**Preferences:**

- Budget range (per appliance or total)
- Energy efficiency priority (not important, somewhat, very important)
- Brand preferences (specific brands or tiers)
- Must-have features (convection, self-cleaning, smart home, etc.)

**Constraints:**

- Available space (dimensions for built-in)
- Power supply (gas line available?, 220V outlet?)
- Aesthetic requirements (color, finish)

---

### Recommendation Engine

**AI considers:**

**Compatibility:**

- Fits your kitchen dimensions
- Works with available utilities (gas, electric)
- Matches design style

**Suitability:**

- Capacity matches household size
- Features match cooking style
- Performance matches frequency

**Value:**

- Fits budget
- Quality to price ratio
- Long-term costs (energy, maintenance)

**Matching Algorithm:**

- Analyzes 138+ appliances in database
- Scores each appliance 0-100 for your needs
- Ranks by match score
- Presents top 5-10 recommendations

[Screenshot: Recommendation algorithm visualization]

---

## Understanding Recommendations

### Match Score (0-100)

**How match score is calculated:**

**Suitability (40 points):**

- Capacity vs. household size (10 pts)
- Features vs. cooking style (15 pts)
- Performance vs. frequency (15 pts)

**Value (30 points):**

- Price vs. budget (10 pts)
- Quality-to-price ratio (10 pts)
- Energy efficiency vs. priority (10 pts)

**Compatibility (20 points):**

- Fits dimensions (10 pts)
- Matches utilities (5 pts)
- Matches style (5 pts)

**User Reviews (10 points):**

- Average rating (5 pts)
- Number of reviews (reliability) (5 pts)

**Score Interpretation:**

- **90-100**: Excellent match - Highly recommended
- **80-89**: Very good match - Strong choice
- **70-79**: Good match - Solid option
- **60-69**: Fair match - Some compromises
- **<60**: Poor match - Not recommended

[Screenshot: Match score breakdown for an appliance]

---

### Reasons for Recommendation

**For each recommended appliance, see:**

**Why It's Recommended:**

- "Large capacity (5.2 cu ft) perfect for family of 5"
- "Induction cooktop matches gourmet cooking style"
- "A+++ energy rating aligns with efficiency priority"
- "Self-cleaning feature ideal for busy lifestyle"
- "Excellent reviews (4.7/5 stars, 342 reviews)"

**Strengths (Pros):**

- High energy efficiency (save $80/year)
- Powerful (3600W induction elements)
- Large capacity
- Premium brand (Miele)
- 20+ year lifespan

**Limitations (Cons):**

- Higher upfront cost ($2,400 vs. $1,800 average)
- Requires 220V dedicated circuit
- Complex controls (learning curve)

**Best For:**

- Gourmet home cooks
- Energy-conscious households
- Those valuing longevity over initial cost

---

### Energy Savings Analysis

**For energy-efficient appliances:**

**Annual Energy Cost:**

- This appliance: $65/year
- Average similar: $120/year
- Your savings: $55/year

**Lifetime Savings:**

- Expected lifespan: 15 years
- Total savings: $825
- Payback period: 4.2 years (premium pays for itself)

**Environmental Impact:**

- CO2 reduction: 320 kg/year
- Equivalent to: Planting 15 trees/year

[Screenshot: Energy savings comparison chart]

---

## Filtering Recommendations

### Refine Results

**After seeing initial recommendations:**

**Filter by:**

- **Price Range:** Adjust slider to narrow budget
- **Energy Rating:** A+++ only, A++ or better, any
- **Brand:** Select specific brands
- **Features:** Must have convection, smart home, self-cleaning, etc.
- **Size:** Specific capacity or dimensions
- **Color/Finish:** Stainless, black, white, panel-ready

**Sort by:**

- **Best Match** (default, by match score)
- **Price: Low to High**
- **Price: High to Low**
- **Energy Efficiency** (most efficient first)
- **Customer Rating** (highest rated first)
- **Newest Models** (latest releases)

**Results update in real-time** as you filter

---

### Compare Side-by-Side

**Select 2-4 appliances to compare:**

**Comparison table shows:**

| Feature            | Appliance A                   | Appliance B            | Appliance C |
| ------------------ | ----------------------------- | ---------------------- | ----------- |
| Match Score        | 92                            | 88                     | 85          |
| Price              | $2,400                        | $1,800                 | $1,500      |
| Brand              | Miele                         | Bosch                  | Siemens     |
| Capacity           | 5.2 cu ft                     | 4.6 cu ft              | 4.8 cu ft   |
| Energy Rating      | A+++                          | A++                    | A++         |
| Annual Energy Cost | $65                           | $85                    | $90         |
| Features           | Convection, Self-clean, Smart | Convection, Self-clean | Convection  |
| Customer Rating    | 4.7 (342)                     | 4.5 (518)              | 4.3 (201)   |
| Warranty           | 2yr + ext. to 10yr            | 2 years                | 2 years     |

**Highlight differences:** Cells with significant differences highlighted
**Winner badges:** "Best Value", "Most Efficient", "Highest Rated"

[Screenshot: Side-by-side appliance comparison]

---

## Adding Recommended Appliances to Design

### One-Click Integration

**From recommendations:**

1. Click "Add to Design" on any appliance
2. If you have open design: Appliance appears on canvas (drag to position)
3. If no open design: Create new design or select existing
4. Appliance automatically placed in compatible location

**AI placement:**

- Oven → Placed in oven housing cabinet
- Cooktop → Placed on countertop with clearances
- Refrigerator → Placed at end of cabinet run
- Dishwasher → Placed next to sink
- Range hood → Placed above cooktop

**Adjust as needed:** Drag to final position after initial placement

---

### Replace Existing Appliance

**Already have an appliance in design:**

1. Select existing appliance in design
2. Tools > Appliance Advisor
3. Get recommendations for that appliance type
4. Click "Replace" on any recommendation
5. Old appliance removed, new one placed in same location
6. Budget and design score update automatically

**Perfect for:** Upgrading specific appliances while keeping layout

---

## Appliance Categories

### Ovens

**Types:**

- **Single Oven:** Standard, 60-90cm wide
- **Double Oven:** Two separate ovens, more capacity
- **Combination:** Oven + microwave in one unit
- **Steam Oven:** Healthier cooking, professional results
- **Compact Oven:** 45cm height, fits under counter

**Key Questions:**

- How often do you bake or roast?
- Do you cook multiple dishes simultaneously?
- Important features? (Convection, self-cleaning, smart controls)

**Recommendations consider:**

- Cooking frequency → Standard vs. premium features
- Household size → Single vs. double
- Baking focus → Convection, precise temperature control

---

### Cooktops

**Types:**

- **Gas:** Responsive, visible flame, works in power outages
- **Electric:** Affordable, easy to clean
- **Induction:** Fast, efficient, safe (cool surface)

**Sizes:** 60cm (4 zones), 80cm (5 zones), 90cm (6 zones)

**Key Questions:**

- Preferred cooking method?
- Gas line available?
- Budget range?

**Recommendations consider:**

- Cooking style → Gas for wok cooking, Induction for precision
- Energy priority → Induction most efficient
- Budget → Electric most affordable

**Safety:** Induction recommended for families with young children (surface
stays cool)

---

### Refrigerators

**Types:**

- **Standard:** Top freezer, bottom freezer
- **French Door:** Double doors, bottom freezer drawer
- **Side-by-Side:** Vertical split, large capacity
- **Built-In:** Custom panel-ready, integrated look
- **Compact:** Small spaces, apartments

**Capacity:** 200L (1-2 people), 400L (3-4), 600L (5-6), 800L+ (7+)

**Key Questions:**

- Household size?
- Shopping habits (bulk buying)?
- Built-in or freestanding?

**Recommendations consider:**

- Household size → Capacity
- Bulk buying → Larger freezer, door storage
- Style → Built-in for integrated look

**Energy:** Refrigerators run 24/7, so efficiency is critical

---

### Dishwashers

**Types:**

- **Full-Size:** 60cm wide, 12-16 place settings
- **Compact/Slimline:** 45cm wide, 9-10 place settings
- **Drawer Dishwashers:** 1 or 2 independent drawers

**Key Questions:**

- Household size and dishware amount?
- Kitchen layout (space for 60cm)?
- Energy priority?

**Recommendations consider:**

- Household → Place settings capacity
- Space constraints → Compact if needed
- Energy priority → A+++ rated options

**Noise:** Important if open plan kitchen (look for <42 dB)

---

### Range Hoods

**Types:**

- **Wall-Mounted:** Standard, above cooktop against wall
- **Island:** Suspended from ceiling above island cooktop
- **Integrated/Hidden:** Built into cabinet, discreet

**Extraction Rate:** 400 m³/h (minimum), 600-800 m³/h (recommended), 1000+ m³/h
(professional)

**Key Questions:**

- Cooktop location (wall or island)?
- Cooking frequency and style?
- Noise tolerance?

**Recommendations consider:**

- Cooktop type → Higher power hoods for gas
- Cooking frequency → Higher CFM for frequent cooking
- Kitchen size → Larger kitchens need more powerful hoods

**Formula:** Minimum CFM = (Kitchen volume in m³) × 10

---

### Specialty Appliances

**Wine Coolers:**

- Capacity: 12, 24, 48, 96+ bottles
- Zones: Single, dual (red and white temps)
- Built-in or freestanding

**Coffee Machines:**

- Built-in espresso machines
- Bean-to-cup fully automatic
- Plumbed or water tank

**Warming Drawers:**

- Keep food warm before serving
- Proof bread dough
- Slow cooking

**Recommendations based on:** Entertaining frequency, beverage preferences,
available space

---

## Tips for Choosing Appliances

### Prioritize Your Needs

**Cooking Style Matters Most:**

- Gourmet cook → Invest in cooktop and oven
- Minimal cooking → Basic appliances, invest in other areas (cabinets)
- Baking focus → High-quality oven with precise temperature
- Large families → Capacity over features

**Energy Efficiency:**

- Appliances run for 10-20 years
- Energy savings compound over time
- A+++ costs more upfront but saves long-term
- Calculate payback period (usually 3-5 years)

**Brand Reliability:**

- **Miele:** Premium, 20+ year lifespan, expensive
- **Bosch/Siemens:** Reliable, 10-15 years, good value
- **IKEA:** Budget, 5-8 years, basic features

**Tip:** Mix brands! Premium appliances you use most, budget elsewhere

---

### Don't Over-Buy

**Common Mistakes:**

- Double oven for household that rarely bakes
- Oversized refrigerator for 1-2 people (energy waste)
- Professional-grade cooktop for occasional cooking
- Too many features you won't use

**Right-Sizing:**

- Be honest about cooking frequency
- Consider future (growing family?), but don't over-project
- Features you'll actually use, not nice-to-haves

---

### Consider Installation

**Built-In vs. Freestanding:**

- **Built-In:** Integrated look, higher cost, professional installation
- **Freestanding:** Easier, lower cost, DIY possible

**Installation Costs:**

- Gas cooktop: $200-500 (gas line work)
- Electric/Induction: $100-200 (outlet install)
- Built-in oven: $150-300
- Refrigerator: $0-100 (delivery included usually)
- Dishwasher: $150-300 (plumbing + electric)

**Include installation in budget planning**

---

### Read Reviews

**What to look for:**

- **Number of reviews:** 50+ for reliability
- **Average rating:** 4+ stars
- **Recent reviews:** Check last 6 months (quality changes)
- **Negative reviews:** What are common complaints?

**Red flags:**

- Poor customer service experiences
- Frequent repairs needed
- Difficult installation
- Features don't work as advertised

**Our review aggregation:** KitchenXpert shows verified user reviews from
multiple sources

---

## FAQ

**Q: Can I get recommendations without a full kitchen design?** A: Yes! Use
standalone Appliance Advisor (Tools > Appliance Advisor) for any appliance.

**Q: How accurate are energy savings estimates?** A: Based on manufacturer specs
and average usage patterns. Actual savings vary by usage.

**Q: Can I request brands not in your catalog?** A: Request via
products@kitchenxpert.com. Popular requests may be added.

**Q: Do you get commission from recommendations?** A: No. Our recommendations
are unbiased based only on your needs.

**Q: What if recommended appliance doesn't fit my cabinet?** A: AI checks
compatibility, but always verify dimensions. We show cutout requirements.

**Q: Can I compare appliances from my own research?** A: Yes, add any appliances
to "Compare List" and use side-by-side comparison.

---

**Related guides:**

- [AI Questionnaire](questionnaire.md)
- [AI Design Generation](ai-generation.md)
- [Product Catalog Guide](../getting-started.md#browsing-the-catalog)

---

_Last Updated: 2026-01-10_
