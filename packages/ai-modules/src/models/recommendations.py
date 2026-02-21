"""
Recommendation models for KitchenXpert AI modules.
Pydantic models for style, budget, and layout recommendations.
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from .kitchen import (
    KitchenStyle,
    KitchenShape,
    KitchenConfiguration,
    CatalogProduct,
    Position3D,
    BudgetRange,
    RoomConfiguration,
    UserPreferences,
)


class RecommendationConfidence(str, Enum):
    """Confidence level of a recommendation."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class StyleCategory(str, Enum):
    """Style feature categories."""
    CABINET_STYLE = "cabinet_style"
    COUNTERTOP = "countertop"
    BACKSPLASH = "backsplash"
    HARDWARE = "hardware"
    LIGHTING = "lighting"
    COLOR_PALETTE = "color_palette"
    MATERIAL = "material"
    FINISH = "finish"


class BudgetCategory(str, Enum):
    """Budget allocation categories."""
    CABINETS = "cabinets"
    APPLIANCES = "appliances"
    COUNTERTOPS = "countertops"
    FLOORING = "flooring"
    LIGHTING = "lighting"
    PLUMBING = "plumbing"
    INSTALLATION = "installation"
    CONTINGENCY = "contingency"


class SpaceZone(str, Enum):
    """Kitchen space zones."""
    COOKING = "cooking"
    PREPARATION = "preparation"
    CLEANING = "cleaning"
    STORAGE = "storage"
    DINING = "dining"
    CIRCULATION = "circulation"


# ============================================
# Style Recommendation Models
# ============================================


class StyleFeature(BaseModel):
    """A specific style feature recommendation."""
    category: StyleCategory = Field(..., description="Feature category")
    name: str = Field(..., description="Feature name")
    description: str = Field(..., description="Feature description")
    examples: List[str] = Field(default_factory=list, description="Example products/materials")
    compatibility_score: float = Field(
        default=0.0, ge=0, le=100, description="Compatibility with overall style"
    )
    price_range: Optional[str] = Field(default=None, description="Price range indicator")


class StyleMatch(BaseModel):
    """A matched style with compatibility score."""
    style: KitchenStyle = Field(..., description="Kitchen style")
    match_score: float = Field(..., ge=0, le=100, description="Match score (0-100)")
    key_characteristics: List[str] = Field(
        default_factory=list, description="Key style characteristics"
    )
    color_palette: List[str] = Field(
        default_factory=list, description="Recommended color palette"
    )
    materials: List[str] = Field(
        default_factory=list, description="Recommended materials"
    )
    avoid: List[str] = Field(
        default_factory=list, description="Things to avoid for this style"
    )


class StylePreferenceInput(BaseModel):
    """Input for style preference analysis."""
    preferred_colors: List[str] = Field(
        default_factory=list, description="User's preferred colors"
    )
    preferred_materials: List[str] = Field(
        default_factory=list, description="User's preferred materials"
    )
    lifestyle: Optional[str] = Field(
        default=None, description="User's lifestyle description"
    )
    existing_home_style: Optional[str] = Field(
        default=None, description="Style of existing home"
    )
    inspirations: List[str] = Field(
        default_factory=list, description="Style inspirations or references"
    )
    priorities: List[str] = Field(
        default_factory=list, description="Design priorities (e.g., 'functionality', 'aesthetics')"
    )
    dislikes: List[str] = Field(
        default_factory=list, description="Things the user dislikes"
    )


class StyleRecommendationRequest(BaseModel):
    """Request for style recommendations."""
    preferences: StylePreferenceInput = Field(..., description="User style preferences")
    budget: Optional[BudgetRange] = Field(default=None, description="Budget constraints")
    room: Optional[RoomConfiguration] = Field(default=None, description="Room configuration")
    num_recommendations: int = Field(
        default=3, ge=1, le=5, description="Number of recommendations"
    )


class StyleRecommendation(BaseModel):
    """A complete style recommendation."""
    primary_style: StyleMatch = Field(..., description="Primary recommended style")
    secondary_styles: List[StyleMatch] = Field(
        default_factory=list, description="Compatible secondary styles"
    )
    features: List[StyleFeature] = Field(
        default_factory=list, description="Recommended style features"
    )
    confidence: RecommendationConfidence = Field(
        default=RecommendationConfidence.MEDIUM, description="Recommendation confidence"
    )
    reasoning: str = Field(default="", description="Explanation of recommendation")
    estimated_budget_impact: Optional[str] = Field(
        default=None, description="Impact on budget"
    )


class StyleRecommendationResponse(BaseModel):
    """Response containing style recommendations."""
    success: bool = Field(..., description="Whether recommendation was successful")
    recommendations: List[StyleRecommendation] = Field(
        default_factory=list, description="Style recommendations"
    )
    top_recommendation: Optional[StyleRecommendation] = Field(
        default=None, description="Top recommended style"
    )
    analysis_summary: str = Field(default="", description="Summary of analysis")
    errors: List[str] = Field(default_factory=list, description="Error messages")


# ============================================
# Budget Optimization Models
# ============================================


class BudgetAllocation(BaseModel):
    """Budget allocation for a category."""
    category: BudgetCategory = Field(..., description="Budget category")
    allocated_amount: float = Field(..., ge=0, description="Allocated amount")
    percentage: float = Field(..., ge=0, le=100, description="Percentage of total budget")
    priority: int = Field(default=5, ge=1, le=10, description="Priority level (1-10)")
    flexibility: float = Field(
        default=0.1, ge=0, le=1, description="Budget flexibility (0-1)"
    )


class ProductAlternative(BaseModel):
    """An alternative product suggestion for budget optimization."""
    original_product: CatalogProduct = Field(..., description="Original product")
    alternative_product: CatalogProduct = Field(..., description="Alternative product")
    savings: float = Field(..., description="Cost savings")
    quality_impact: float = Field(
        default=0.0, ge=-100, le=100, description="Impact on quality (-100 to 100)"
    )
    reason: str = Field(default="", description="Reason for suggestion")


class BudgetOptimizationRequest(BaseModel):
    """Request for budget optimization."""
    total_budget: float = Field(..., gt=0, description="Total available budget")
    currency: str = Field(default="EUR", description="Currency code")
    current_configuration: Optional[KitchenConfiguration] = Field(
        default=None, description="Current kitchen configuration"
    )
    preferences: Optional[UserPreferences] = Field(
        default=None, description="User preferences"
    )
    priorities: Dict[BudgetCategory, int] = Field(
        default_factory=dict, description="Category priorities (1-10)"
    )
    fixed_items: List[str] = Field(
        default_factory=list, description="Item IDs that cannot be changed"
    )
    optimization_goal: str = Field(
        default="maximize_value", description="Optimization goal"
    )


class BudgetSavingOpportunity(BaseModel):
    """A budget saving opportunity."""
    category: BudgetCategory = Field(..., description="Category for savings")
    current_spend: float = Field(..., ge=0, description="Current spending")
    potential_savings: float = Field(..., ge=0, description="Potential savings")
    suggestions: List[str] = Field(
        default_factory=list, description="Suggestions for savings"
    )
    impact_level: str = Field(default="low", description="Impact on quality")


class BudgetOptimizationResult(BaseModel):
    """Result of budget optimization."""
    success: bool = Field(..., description="Whether optimization was successful")
    original_total: float = Field(..., ge=0, description="Original total cost")
    optimized_total: float = Field(..., ge=0, description="Optimized total cost")
    total_savings: float = Field(..., ge=0, description="Total savings achieved")
    savings_percentage: float = Field(..., ge=0, le=100, description="Savings percentage")
    allocations: List[BudgetAllocation] = Field(
        default_factory=list, description="Optimized allocations"
    )
    alternatives: List[ProductAlternative] = Field(
        default_factory=list, description="Product alternatives"
    )
    saving_opportunities: List[BudgetSavingOpportunity] = Field(
        default_factory=list, description="Saving opportunities"
    )
    optimized_configuration: Optional[KitchenConfiguration] = Field(
        default=None, description="Optimized configuration"
    )
    recommendations: List[str] = Field(
        default_factory=list, description="Budget recommendations"
    )
    errors: List[str] = Field(default_factory=list, description="Error messages")


# ============================================
# Layout Optimization Models
# ============================================


class WorkTriangle(BaseModel):
    """The kitchen work triangle (sink, stove, refrigerator)."""
    sink_position: Position3D = Field(..., description="Sink position")
    stove_position: Position3D = Field(..., description="Stove position")
    refrigerator_position: Position3D = Field(..., description="Refrigerator position")
    perimeter: float = Field(..., ge=0, description="Triangle perimeter (cm)")
    is_optimal: bool = Field(default=False, description="Whether triangle is optimal")
    efficiency_score: float = Field(
        default=0.0, ge=0, le=100, description="Efficiency score (0-100)"
    )


class LayoutZone(BaseModel):
    """A functional zone in the kitchen layout."""
    zone_type: SpaceZone = Field(..., description="Type of zone")
    position: Position3D = Field(..., description="Zone center position")
    width: float = Field(..., gt=0, description="Zone width (cm)")
    depth: float = Field(..., gt=0, description="Zone depth (cm)")
    items: List[str] = Field(default_factory=list, description="Item IDs in this zone")
    efficiency_score: float = Field(
        default=0.0, ge=0, le=100, description="Zone efficiency score"
    )


class LayoutOptimizationRequest(BaseModel):
    """Request for layout optimization."""
    room: RoomConfiguration = Field(..., description="Room configuration")
    preferences: UserPreferences = Field(..., description="User preferences")
    existing_items: List[CatalogProduct] = Field(
        default_factory=list, description="Existing items to include"
    )
    fixed_positions: Dict[str, Position3D] = Field(
        default_factory=dict, description="Fixed item positions"
    )
    optimization_priorities: List[str] = Field(
        default_factory=lambda: ["ergonomics", "storage", "workflow"],
        description="Optimization priorities"
    )
    population_size: int = Field(
        default=50, ge=10, le=200, description="GA population size"
    )
    generations: int = Field(
        default=100, ge=10, le=500, description="Number of GA generations"
    )


class LayoutOptimizationResult(BaseModel):
    """Result of layout optimization."""
    success: bool = Field(..., description="Whether optimization was successful")
    best_configuration: Optional[KitchenConfiguration] = Field(
        default=None, description="Best optimized configuration"
    )
    alternative_configurations: List[KitchenConfiguration] = Field(
        default_factory=list, description="Alternative configurations"
    )
    work_triangle: Optional[WorkTriangle] = Field(
        default=None, description="Work triangle analysis"
    )
    zones: List[LayoutZone] = Field(
        default_factory=list, description="Identified zones"
    )
    fitness_score: float = Field(
        default=0.0, ge=0, le=100, description="Optimization fitness score"
    )
    generations_completed: int = Field(
        default=0, ge=0, description="GA generations completed"
    )
    convergence_generation: int = Field(
        default=0, ge=0, description="Generation where convergence occurred"
    )
    improvement_history: List[float] = Field(
        default_factory=list, description="Fitness improvement history"
    )
    recommendations: List[str] = Field(
        default_factory=list, description="Layout recommendations"
    )
    errors: List[str] = Field(default_factory=list, description="Error messages")


# ============================================
# Space Analysis Models
# ============================================


class SpaceUtilization(BaseModel):
    """Space utilization metrics."""
    total_floor_area: float = Field(..., ge=0, description="Total floor area (sq cm)")
    usable_floor_area: float = Field(..., ge=0, description="Usable floor area (sq cm)")
    cabinet_footprint: float = Field(..., ge=0, description="Cabinet footprint (sq cm)")
    appliance_footprint: float = Field(..., ge=0, description="Appliance footprint (sq cm)")
    circulation_area: float = Field(..., ge=0, description="Circulation area (sq cm)")
    utilization_percentage: float = Field(
        ..., ge=0, le=100, description="Space utilization percentage"
    )
    efficiency_rating: str = Field(default="good", description="Efficiency rating")


class StorageCapacity(BaseModel):
    """Storage capacity analysis."""
    total_volume: float = Field(..., ge=0, description="Total storage volume (cubic cm)")
    cabinet_volume: float = Field(..., ge=0, description="Cabinet storage volume")
    drawer_volume: float = Field(..., ge=0, description="Drawer storage volume")
    pantry_volume: float = Field(..., ge=0, description="Pantry storage volume")
    overhead_volume: float = Field(..., ge=0, description="Overhead storage volume")
    capacity_rating: str = Field(default="adequate", description="Capacity rating")
    recommendations: List[str] = Field(
        default_factory=list, description="Storage recommendations"
    )


class AccessibilityAnalysis(BaseModel):
    """Accessibility analysis results."""
    wheelchair_accessible: bool = Field(
        default=False, description="Whether wheelchair accessible"
    )
    minimum_passage_width: float = Field(..., ge=0, description="Minimum passage width (cm)")
    counter_heights: Dict[str, float] = Field(
        default_factory=dict, description="Counter heights"
    )
    reach_zones: Dict[str, bool] = Field(
        default_factory=dict, description="Reach zone accessibility"
    )
    compliance_score: float = Field(
        default=0.0, ge=0, le=100, description="Accessibility compliance score"
    )
    issues: List[str] = Field(
        default_factory=list, description="Accessibility issues found"
    )
    recommendations: List[str] = Field(
        default_factory=list, description="Accessibility recommendations"
    )


class SpaceConflict(BaseModel):
    """A spatial conflict between items."""
    item1_id: str = Field(..., description="First item ID")
    item2_id: str = Field(..., description="Second item ID")
    conflict_type: str = Field(..., description="Type of conflict")
    overlap_volume: float = Field(default=0.0, ge=0, description="Overlap volume")
    severity: str = Field(default="medium", description="Conflict severity")
    resolution_suggestion: str = Field(default="", description="Suggested resolution")


class SpaceAnalysisRequest(BaseModel):
    """Request for space analysis."""
    room: RoomConfiguration = Field(..., description="Room configuration")
    configuration: Optional[KitchenConfiguration] = Field(
        default=None, description="Kitchen configuration to analyze"
    )
    items: List[CatalogProduct] = Field(
        default_factory=list, description="Items to consider"
    )
    analyze_accessibility: bool = Field(
        default=True, description="Include accessibility analysis"
    )
    analyze_storage: bool = Field(
        default=True, description="Include storage analysis"
    )
    analyze_workflow: bool = Field(
        default=True, description="Include workflow analysis"
    )


class WorkflowAnalysis(BaseModel):
    """Workflow efficiency analysis."""
    work_triangle: Optional[WorkTriangle] = Field(
        default=None, description="Work triangle analysis"
    )
    zones: List[LayoutZone] = Field(
        default_factory=list, description="Functional zones"
    )
    flow_efficiency: float = Field(
        default=0.0, ge=0, le=100, description="Workflow efficiency score"
    )
    bottlenecks: List[str] = Field(
        default_factory=list, description="Identified bottlenecks"
    )
    recommendations: List[str] = Field(
        default_factory=list, description="Workflow recommendations"
    )


class SpaceAnalysisResult(BaseModel):
    """Result of space analysis."""
    success: bool = Field(..., description="Whether analysis was successful")
    utilization: SpaceUtilization = Field(..., description="Space utilization metrics")
    storage: Optional[StorageCapacity] = Field(
        default=None, description="Storage capacity analysis"
    )
    accessibility: Optional[AccessibilityAnalysis] = Field(
        default=None, description="Accessibility analysis"
    )
    workflow: Optional[WorkflowAnalysis] = Field(
        default=None, description="Workflow analysis"
    )
    conflicts: List[SpaceConflict] = Field(
        default_factory=list, description="Spatial conflicts"
    )
    overall_score: float = Field(
        default=0.0, ge=0, le=100, description="Overall space score"
    )
    summary: str = Field(default="", description="Analysis summary")
    recommendations: List[str] = Field(
        default_factory=list, description="Overall recommendations"
    )
    errors: List[str] = Field(default_factory=list, description="Error messages")
