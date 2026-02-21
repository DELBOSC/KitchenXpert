"""
Kitchen data models for KitchenXpert AI modules.
Pydantic models for kitchen configuration, room dimensions, and products.
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator


class MeasurementUnit(str, Enum):
    """Unit of measurement for dimensions."""
    CM = "cm"
    MM = "mm"
    INCH = "in"


class KitchenShape(str, Enum):
    """Available kitchen layout shapes."""
    I_SHAPE = "I"
    L_SHAPE = "L"
    U_SHAPE = "U"
    G_SHAPE = "G"
    PARALLEL = "parallel"
    ISLAND = "island"
    PENINSULA = "peninsula"


class KitchenStyle(str, Enum):
    """Available kitchen styles."""
    MODERN = "modern"
    CLASSIC = "classic"
    SCANDINAVIAN = "scandinavian"
    INDUSTRIAL = "industrial"
    RUSTIC = "rustic"
    MINIMALIST = "minimalist"
    TRADITIONAL = "traditional"
    CONTEMPORARY = "contemporary"


class ObstacleType(str, Enum):
    """Types of wall obstacles."""
    WINDOW = "window"
    DOOR = "door"
    COLUMN = "column"
    PIPE = "pipe"
    ELECTRICAL = "electrical"
    RADIATOR = "radiator"
    OTHER = "other"


class UtilityType(str, Enum):
    """Types of utility connections."""
    WATER_INLET = "water_inlet"
    WATER_OUTLET = "water_outlet"
    GAS = "gas"
    ELECTRICAL_220V = "electrical_220v"
    ELECTRICAL_380V = "electrical_380v"
    VENTILATION = "ventilation"


class CabinetType(str, Enum):
    """Types of kitchen cabinets."""
    BASE = "base"
    WALL = "wall"
    TALL = "tall"
    CORNER_BASE = "corner_base"
    CORNER_WALL = "corner_wall"
    DRAWER = "drawer"
    SINK_BASE = "sink_base"
    OVEN_HOUSING = "oven_housing"
    FRIDGE_HOUSING = "fridge_housing"
    PANTRY = "pantry"


class ApplianceCategory(str, Enum):
    """Categories of kitchen appliances."""
    REFRIGERATOR = "refrigerator"
    FREEZER = "freezer"
    FRIDGE_FREEZER = "fridge_freezer"
    OVEN = "oven"
    MICROWAVE = "microwave"
    COOKTOP = "cooktop"
    RANGE_HOOD = "range_hood"
    DISHWASHER = "dishwasher"
    WASHING_MACHINE = "washing_machine"
    SINK = "sink"
    FAUCET = "faucet"


class WallDirection(str, Enum):
    """Wall direction identifiers."""
    NORTH = "north"
    SOUTH = "south"
    EAST = "east"
    WEST = "west"


class RoomDimensions(BaseModel):
    """Room dimensions in specified unit."""
    width: float = Field(..., gt=0, description="Width in specified unit")
    length: float = Field(..., gt=0, description="Length/depth in specified unit")
    height: float = Field(default=250.0, gt=0, description="Height in specified unit")
    unit: MeasurementUnit = Field(default=MeasurementUnit.CM, description="Unit of measurement")

    def to_cm(self) -> "RoomDimensions":
        """Convert dimensions to centimeters."""
        multiplier = 1.0
        if self.unit == MeasurementUnit.MM:
            multiplier = 0.1
        elif self.unit == MeasurementUnit.INCH:
            multiplier = 2.54

        return RoomDimensions(
            width=self.width * multiplier,
            length=self.length * multiplier,
            height=self.height * multiplier,
            unit=MeasurementUnit.CM
        )


class WallObstacle(BaseModel):
    """An obstacle on a wall segment."""
    type: ObstacleType = Field(..., description="Type of obstacle")
    position: float = Field(..., ge=0, description="Position from wall start (cm)")
    width: float = Field(..., gt=0, description="Width of obstacle (cm)")
    height_from_floor: float = Field(..., ge=0, description="Height from floor (cm)")
    height: float = Field(..., gt=0, description="Height of obstacle (cm)")


class WallSegment(BaseModel):
    """A segment of wall in the kitchen."""
    id: str = Field(..., description="Unique identifier for the wall segment")
    wall: str = Field(..., description="Wall identifier (north, south, east, west, or custom)")
    start_position: float = Field(..., ge=0, description="Start position along wall (cm from corner)")
    end_position: float = Field(..., gt=0, description="End position along wall (cm from corner)")
    available: bool = Field(default=True, description="Whether this segment is available for cabinets")
    obstacles: List[WallObstacle] = Field(default_factory=list, description="Obstacles on this segment")

    @field_validator("end_position")
    @classmethod
    def end_must_be_after_start(cls, v: float, info) -> float:
        if "start_position" in info.data and v <= info.data["start_position"]:
            raise ValueError("end_position must be greater than start_position")
        return v


class UtilityConnection(BaseModel):
    """A utility connection point in the kitchen."""
    type: UtilityType = Field(..., description="Type of utility connection")
    wall: str = Field(..., description="Wall location")
    position: float = Field(..., ge=0, description="Position along wall (cm)")
    height_from_floor: float = Field(..., ge=0, description="Height from floor (cm)")


class RoomConfiguration(BaseModel):
    """Complete room configuration for kitchen planning."""
    dimensions: RoomDimensions = Field(..., description="Room dimensions")
    walls: List[WallSegment] = Field(default_factory=list, description="Wall segments")
    utilities: List[UtilityConnection] = Field(default_factory=list, description="Utility connections")
    preferred_shape: Optional[KitchenShape] = Field(default=None, description="Preferred kitchen shape")


class ProductDimensions(BaseModel):
    """Product dimensions."""
    width: float = Field(..., gt=0, description="Width in specified unit")
    height: float = Field(..., gt=0, description="Height in specified unit")
    depth: float = Field(..., gt=0, description="Depth in specified unit")
    unit: MeasurementUnit = Field(default=MeasurementUnit.CM, description="Unit of measurement")


class CatalogProduct(BaseModel):
    """A product from the catalog."""
    id: str = Field(..., description="Unique product identifier")
    provider_id: str = Field(..., description="Provider identifier")
    provider_product_id: str = Field(..., description="Provider's product ID")
    name: str = Field(..., description="Product name")
    type: str = Field(..., description="Product type")
    category: str = Field(..., description="Product category")
    subcategory: Optional[str] = Field(default=None, description="Product subcategory")
    dimensions: ProductDimensions = Field(..., description="Product dimensions")
    price: float = Field(..., ge=0, description="Product price")
    currency: str = Field(default="EUR", description="Currency code")
    image_url: Optional[str] = Field(default=None, description="Product image URL")
    specifications: Dict[str, Any] = Field(default_factory=dict, description="Additional specifications")
    compatible_with: List[str] = Field(default_factory=list, description="Compatible product IDs")
    requires_utility: List[UtilityType] = Field(default_factory=list, description="Required utility connections")
    in_stock: bool = Field(default=True, description="Stock availability")


class Position3D(BaseModel):
    """A 3D position in the kitchen space."""
    x: float = Field(..., description="X coordinate (cm)")
    y: float = Field(..., description="Y coordinate (cm)")
    z: float = Field(..., description="Z coordinate (cm)")


class PlacedItem(BaseModel):
    """An item placed in the kitchen configuration."""
    id: str = Field(..., description="Unique identifier for this placement")
    product: CatalogProduct = Field(..., description="The product being placed")
    position: Position3D = Field(..., description="Position in 3D space")
    rotation: float = Field(default=0.0, description="Rotation in degrees (0, 90, 180, 270)")
    wall: Optional[str] = Field(default=None, description="Associated wall")
    linked_items: List[str] = Field(default_factory=list, description="IDs of linked items")


class ColorPreferences(BaseModel):
    """Color preferences for kitchen elements."""
    cabinets: List[str] = Field(default_factory=list, description="Preferred cabinet colors")
    worktop: List[str] = Field(default_factory=list, description="Preferred worktop colors")
    handles: List[str] = Field(default_factory=list, description="Preferred handle colors")


class AccessibilityRequirements(BaseModel):
    """Accessibility requirements for the kitchen."""
    wheelchair_accessible: bool = Field(default=False, description="Wheelchair accessibility needed")
    lowered_worktop: bool = Field(default=False, description="Lowered worktop needed")
    pull_out_shelves: bool = Field(default=False, description="Pull-out shelves needed")


class BudgetRange(BaseModel):
    """Budget range specification."""
    min_amount: float = Field(..., ge=0, description="Minimum budget")
    max_amount: float = Field(..., gt=0, description="Maximum budget")
    currency: str = Field(default="EUR", description="Currency code")

    @field_validator("max_amount")
    @classmethod
    def max_must_be_greater_than_min(cls, v: float, info) -> float:
        if "min_amount" in info.data and v < info.data["min_amount"]:
            raise ValueError("max_amount must be greater than or equal to min_amount")
        return v


class UserPreferences(BaseModel):
    """User preferences for kitchen generation."""
    budget: BudgetRange = Field(..., description="Budget range")
    style: KitchenStyle = Field(..., description="Preferred kitchen style")
    colors: Optional[ColorPreferences] = Field(default=None, description="Color preferences")
    required_appliances: List[ApplianceCategory] = Field(
        default_factory=list, description="Required appliances"
    )
    optional_appliances: List[ApplianceCategory] = Field(
        default_factory=list, description="Optional appliances"
    )
    preferred_providers: List[str] = Field(
        default_factory=list, description="Preferred provider IDs"
    )
    accessibility: Optional[AccessibilityRequirements] = Field(
        default=None, description="Accessibility requirements"
    )
    storage_priority: int = Field(
        default=5, ge=1, le=10, description="Storage priority (1-10)"
    )


class GenerationConstraints(BaseModel):
    """Constraints for kitchen generation."""
    min_passage_width: float = Field(default=90.0, gt=0, description="Minimum passage width (cm)")
    max_work_triangle_perimeter: float = Field(
        default=660.0, gt=0, description="Maximum work triangle perimeter (cm)"
    )
    min_cooktop_sink_distance: float = Field(
        default=60.0, ge=0, description="Minimum cooktop to sink distance (cm)"
    )
    max_cooktop_sink_distance: float = Field(
        default=180.0, gt=0, description="Maximum cooktop to sink distance (cm)"
    )
    require_ventilation: bool = Field(default=True, description="Require ventilation above cooktop")


class PricingSummary(BaseModel):
    """Pricing summary for a kitchen configuration."""
    cabinets: float = Field(default=0.0, ge=0, description="Cabinet costs")
    appliances: float = Field(default=0.0, ge=0, description="Appliance costs")
    worktops: float = Field(default=0.0, ge=0, description="Worktop costs")
    fittings: float = Field(default=0.0, ge=0, description="Fitting costs")
    total: float = Field(default=0.0, ge=0, description="Total cost")
    currency: str = Field(default="EUR", description="Currency code")
    by_provider: Dict[str, float] = Field(
        default_factory=dict, description="Price breakdown by provider"
    )


class ConfigurationScore(BaseModel):
    """Score breakdown for a kitchen configuration."""
    overall: float = Field(default=0.0, ge=0, le=100, description="Overall score (0-100)")
    ergonomics: float = Field(default=0.0, ge=0, le=100, description="Ergonomics score")
    storage: float = Field(default=0.0, ge=0, le=100, description="Storage capacity score")
    aesthetics: float = Field(default=0.0, ge=0, le=100, description="Aesthetics score")
    budget_efficiency: float = Field(default=0.0, ge=0, le=100, description="Budget efficiency score")
    space_utilization: float = Field(default=0.0, ge=0, le=100, description="Space utilization score")


class ValidationError(BaseModel):
    """A validation error."""
    code: str = Field(..., description="Error code")
    message: str = Field(..., description="Error message")
    item_id: Optional[str] = Field(default=None, description="Related item ID")
    severity: str = Field(default="error", description="Severity level")


class ValidationWarning(BaseModel):
    """A validation warning."""
    code: str = Field(..., description="Warning code")
    message: str = Field(..., description="Warning message")
    item_id: Optional[str] = Field(default=None, description="Related item ID")
    severity: str = Field(default="warning", description="Severity level")
    suggestion: Optional[str] = Field(default=None, description="Suggested fix")


class ValidationResult(BaseModel):
    """Result of configuration validation."""
    valid: bool = Field(default=True, description="Whether the configuration is valid")
    errors: List[ValidationError] = Field(default_factory=list, description="Validation errors")
    warnings: List[ValidationWarning] = Field(default_factory=list, description="Validation warnings")


class KitchenConfiguration(BaseModel):
    """A complete kitchen configuration."""
    id: str = Field(..., description="Unique configuration identifier")
    name: str = Field(..., description="Configuration name")
    shape: KitchenShape = Field(..., description="Kitchen shape")
    style: KitchenStyle = Field(..., description="Kitchen style")
    room: RoomConfiguration = Field(..., description="Room configuration")
    items: List[PlacedItem] = Field(default_factory=list, description="All placed items")
    cabinets: List[PlacedItem] = Field(default_factory=list, description="Placed cabinets")
    appliances: List[PlacedItem] = Field(default_factory=list, description="Placed appliances")
    worktops: List[PlacedItem] = Field(default_factory=list, description="Placed worktops")
    pricing: PricingSummary = Field(default_factory=PricingSummary, description="Pricing summary")
    score: ConfigurationScore = Field(
        default_factory=ConfigurationScore, description="Configuration score"
    )
    validation: ValidationResult = Field(
        default_factory=ValidationResult, description="Validation result"
    )
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Generation metadata")


class GenerationRequest(BaseModel):
    """Request for kitchen generation."""
    room: RoomConfiguration = Field(..., description="Room configuration")
    preferences: UserPreferences = Field(..., description="User preferences")
    constraints: Optional[GenerationConstraints] = Field(
        default=None, description="Generation constraints"
    )
    num_configurations: int = Field(
        default=3, ge=1, le=10, description="Number of configurations to generate"
    )
    providers: List[str] = Field(
        default_factory=list, description="Provider IDs to use (empty = all)"
    )


class GenerationStats(BaseModel):
    """Statistics from generation process."""
    total_generated: int = Field(default=0, ge=0, description="Total configurations generated")
    valid_configurations: int = Field(default=0, ge=0, description="Valid configurations")
    generation_time_ms: float = Field(default=0.0, ge=0, description="Generation time in ms")
    providers_queried: List[str] = Field(default_factory=list, description="Providers queried")
    products_considered: int = Field(default=0, ge=0, description="Products considered")


class GenerationResponse(BaseModel):
    """Response from kitchen generation."""
    success: bool = Field(..., description="Whether generation was successful")
    configurations: List[KitchenConfiguration] = Field(
        default_factory=list, description="Generated configurations"
    )
    recommended: Optional[KitchenConfiguration] = Field(
        default=None, description="Recommended configuration"
    )
    stats: GenerationStats = Field(
        default_factory=GenerationStats, description="Generation statistics"
    )
    errors: List[str] = Field(default_factory=list, description="Error messages")
