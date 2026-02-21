"""
Tests for Pydantic models.

Tests cover:
- Kitchen models (enums, dimensions, products, configurations)
- Recommendation models (style, budget, layout, space)
- Field validation
- Model serialization/deserialization
"""

import pytest
from pydantic import ValidationError

from src.models.kitchen import (
    MeasurementUnit,
    KitchenShape,
    KitchenStyle,
    ObstacleType,
    UtilityType,
    CabinetType,
    ApplianceCategory,
    WallDirection,
    RoomDimensions,
    WallObstacle,
    WallSegment,
    UtilityConnection,
    RoomConfiguration,
    ProductDimensions,
    CatalogProduct,
    Position3D,
    PlacedItem,
    ColorPreferences,
    AccessibilityRequirements,
    BudgetRange,
    UserPreferences,
    GenerationConstraints,
    PricingSummary,
    ConfigurationScore,
    ValidationError as KitchenValidationError,
    ValidationWarning,
    ValidationResult,
    KitchenConfiguration,
    GenerationRequest,
    GenerationStats,
    GenerationResponse,
)
from src.models.recommendations import (
    RecommendationConfidence,
    StyleCategory,
    BudgetCategory,
    SpaceZone,
    StyleFeature,
    StyleMatch,
    StylePreferenceInput,
    StyleRecommendationRequest,
    StyleRecommendation,
    StyleRecommendationResponse,
    BudgetAllocation,
    ProductAlternative,
    BudgetOptimizationRequest,
    BudgetSavingOpportunity,
    BudgetOptimizationResult,
    WorkTriangle,
    LayoutZone,
    LayoutOptimizationRequest,
    LayoutOptimizationResult,
    SpaceUtilization,
    StorageCapacity,
    AccessibilityAnalysis,
    SpaceConflict,
    SpaceAnalysisRequest,
    WorkflowAnalysis,
    SpaceAnalysisResult,
)


# ============================================
# Enum Tests
# ============================================


class TestEnums:
    """Test enum definitions."""

    def test_measurement_unit_values(self):
        """Test MeasurementUnit enum values."""
        assert MeasurementUnit.CM == "cm"
        assert MeasurementUnit.MM == "mm"
        assert MeasurementUnit.INCH == "in"

    def test_kitchen_shape_values(self):
        """Test KitchenShape enum values."""
        assert KitchenShape.I_SHAPE == "I"
        assert KitchenShape.L_SHAPE == "L"
        assert KitchenShape.U_SHAPE == "U"
        assert KitchenShape.ISLAND == "island"

    def test_kitchen_style_values(self):
        """Test KitchenStyle enum values."""
        assert KitchenStyle.MODERN == "modern"
        assert KitchenStyle.CLASSIC == "classic"
        assert KitchenStyle.SCANDINAVIAN == "scandinavian"

    def test_obstacle_type_values(self):
        """Test ObstacleType enum values."""
        assert ObstacleType.WINDOW == "window"
        assert ObstacleType.DOOR == "door"
        assert ObstacleType.COLUMN == "column"

    def test_utility_type_values(self):
        """Test UtilityType enum values."""
        assert UtilityType.WATER_INLET == "water_inlet"
        assert UtilityType.GAS == "gas"
        assert UtilityType.ELECTRICAL_220V == "electrical_220v"

    def test_cabinet_type_values(self):
        """Test CabinetType enum values."""
        assert CabinetType.BASE == "base"
        assert CabinetType.WALL == "wall"
        assert CabinetType.TALL == "tall"

    def test_appliance_category_values(self):
        """Test ApplianceCategory enum values."""
        assert ApplianceCategory.REFRIGERATOR == "refrigerator"
        assert ApplianceCategory.COOKTOP == "cooktop"
        assert ApplianceCategory.DISHWASHER == "dishwasher"


# ============================================
# Room Dimension Tests
# ============================================


class TestRoomDimensions:
    """Test RoomDimensions model."""

    def test_valid_dimensions(self):
        """Test creating valid room dimensions."""
        dims = RoomDimensions(
            width=400.0,
            length=300.0,
            height=250.0,
            unit=MeasurementUnit.CM,
        )

        assert dims.width == 400.0
        assert dims.length == 300.0
        assert dims.height == 250.0

    def test_default_unit(self):
        """Test default measurement unit."""
        dims = RoomDimensions(width=400.0, length=300.0)

        assert dims.unit == MeasurementUnit.CM

    def test_default_height(self):
        """Test default room height."""
        dims = RoomDimensions(width=400.0, length=300.0)

        assert dims.height == 250.0

    def test_invalid_width_zero(self):
        """Test that zero width is invalid."""
        with pytest.raises(ValidationError):
            RoomDimensions(width=0, length=300.0)

    def test_invalid_width_negative(self):
        """Test that negative width is invalid."""
        with pytest.raises(ValidationError):
            RoomDimensions(width=-100, length=300.0)

    def test_to_cm_from_mm(self):
        """Test conversion from mm to cm."""
        dims = RoomDimensions(
            width=4000.0,
            length=3000.0,
            height=2500.0,
            unit=MeasurementUnit.MM,
        )

        cm_dims = dims.to_cm()

        assert cm_dims.width == 400.0
        assert cm_dims.length == 300.0
        assert cm_dims.height == 250.0
        assert cm_dims.unit == MeasurementUnit.CM

    def test_to_cm_from_inch(self):
        """Test conversion from inches to cm."""
        dims = RoomDimensions(
            width=100.0,
            length=80.0,
            height=100.0,
            unit=MeasurementUnit.INCH,
        )

        cm_dims = dims.to_cm()

        assert cm_dims.width == 254.0
        assert cm_dims.length == 80.0 * 2.54
        assert cm_dims.unit == MeasurementUnit.CM


# ============================================
# Wall Segment Tests
# ============================================


class TestWallSegment:
    """Test WallSegment model."""

    def test_valid_wall_segment(self):
        """Test creating valid wall segment."""
        segment = WallSegment(
            id="north-1",
            wall="north",
            start_position=0.0,
            end_position=400.0,
        )

        assert segment.id == "north-1"
        assert segment.start_position == 0.0
        assert segment.end_position == 400.0
        assert segment.available is True

    def test_wall_segment_with_obstacles(self):
        """Test wall segment with obstacles."""
        obstacle = WallObstacle(
            type=ObstacleType.WINDOW,
            position=100.0,
            width=120.0,
            height_from_floor=90.0,
            height=100.0,
        )

        segment = WallSegment(
            id="east-1",
            wall="east",
            start_position=0.0,
            end_position=300.0,
            obstacles=[obstacle],
        )

        assert len(segment.obstacles) == 1
        assert segment.obstacles[0].type == ObstacleType.WINDOW

    def test_invalid_end_before_start(self):
        """Test that end position must be after start."""
        with pytest.raises(ValidationError):
            WallSegment(
                id="invalid",
                wall="north",
                start_position=100.0,
                end_position=50.0,  # Invalid: before start
            )


# ============================================
# Product Tests
# ============================================


class TestCatalogProduct:
    """Test CatalogProduct model."""

    def test_valid_product(self):
        """Test creating valid catalog product."""
        product = CatalogProduct(
            id="bc-60",
            provider_id="standard",
            provider_product_id="BC-60",
            name="Base Cabinet 60cm",
            type="cabinet",
            category="base_cabinet",
            dimensions=ProductDimensions(width=60, height=85, depth=60),
            price=200.0,
            currency="EUR",
            in_stock=True,
        )

        assert product.id == "bc-60"
        assert product.price == 200.0
        assert product.in_stock is True

    def test_product_default_currency(self):
        """Test default currency."""
        product = CatalogProduct(
            id="test",
            provider_id="p",
            provider_product_id="p1",
            name="Test",
            type="cabinet",
            category="cabinet",
            dimensions=ProductDimensions(width=60, height=85, depth=60),
            price=100.0,
            in_stock=True,
        )

        assert product.currency == "EUR"

    def test_product_optional_fields(self):
        """Test product with optional fields."""
        product = CatalogProduct(
            id="test",
            provider_id="p",
            provider_product_id="p1",
            name="Test",
            type="cabinet",
            category="cabinet",
            subcategory="premium",
            dimensions=ProductDimensions(width=60, height=85, depth=60),
            price=100.0,
            image_url="http://example.com/image.jpg",
            specifications={"material": "oak"},
            compatible_with=["handle-1"],
            requires_utility=[UtilityType.WATER_INLET],
            in_stock=True,
        )

        assert product.subcategory == "premium"
        assert product.image_url == "http://example.com/image.jpg"
        assert product.specifications["material"] == "oak"


# ============================================
# Budget Range Tests
# ============================================


class TestBudgetRange:
    """Test BudgetRange model."""

    def test_valid_budget_range(self):
        """Test creating valid budget range."""
        budget = BudgetRange(
            min_amount=10000.0,
            max_amount=20000.0,
            currency="EUR",
        )

        assert budget.min_amount == 10000.0
        assert budget.max_amount == 20000.0

    def test_budget_range_equal_amounts(self):
        """Test budget range with equal min and max."""
        budget = BudgetRange(
            min_amount=15000.0,
            max_amount=15000.0,
        )

        assert budget.min_amount == budget.max_amount

    def test_invalid_max_less_than_min(self):
        """Test that max must be >= min."""
        with pytest.raises(ValidationError):
            BudgetRange(
                min_amount=20000.0,
                max_amount=10000.0,  # Invalid: less than min
            )

    def test_invalid_negative_min(self):
        """Test that min cannot be negative."""
        with pytest.raises(ValidationError):
            BudgetRange(
                min_amount=-1000.0,
                max_amount=20000.0,
            )


# ============================================
# User Preferences Tests
# ============================================


class TestUserPreferences:
    """Test UserPreferences model."""

    def test_valid_user_preferences(self, basic_budget_range):
        """Test creating valid user preferences."""
        prefs = UserPreferences(
            budget=basic_budget_range,
            style=KitchenStyle.MODERN,
            required_appliances=[ApplianceCategory.REFRIGERATOR],
        )

        assert prefs.style == KitchenStyle.MODERN
        assert ApplianceCategory.REFRIGERATOR in prefs.required_appliances

    def test_user_preferences_default_values(self, basic_budget_range):
        """Test user preferences default values."""
        prefs = UserPreferences(
            budget=basic_budget_range,
            style=KitchenStyle.CLASSIC,
        )

        assert prefs.storage_priority == 5
        assert prefs.accessibility is None
        assert len(prefs.optional_appliances) == 0

    def test_user_preferences_storage_priority_range(self, basic_budget_range):
        """Test storage priority must be 1-10."""
        with pytest.raises(ValidationError):
            UserPreferences(
                budget=basic_budget_range,
                style=KitchenStyle.MODERN,
                storage_priority=15,  # Invalid: > 10
            )


# ============================================
# Configuration Score Tests
# ============================================


class TestConfigurationScore:
    """Test ConfigurationScore model."""

    def test_valid_score(self):
        """Test creating valid configuration score."""
        score = ConfigurationScore(
            overall=85.0,
            ergonomics=90.0,
            storage=80.0,
            aesthetics=85.0,
            budget_efficiency=80.0,
            space_utilization=85.0,
        )

        assert score.overall == 85.0
        assert score.ergonomics == 90.0

    def test_score_default_values(self):
        """Test score default values."""
        score = ConfigurationScore()

        assert score.overall == 0.0
        assert score.ergonomics == 0.0

    def test_score_out_of_range(self):
        """Test score validation (0-100)."""
        with pytest.raises(ValidationError):
            ConfigurationScore(overall=150.0)  # Invalid: > 100


# ============================================
# Style Recommendation Models Tests
# ============================================


class TestStyleModels:
    """Test style recommendation models."""

    def test_style_preference_input(self):
        """Test StylePreferenceInput model."""
        prefs = StylePreferenceInput(
            preferred_colors=["white", "gray"],
            preferred_materials=["wood", "quartz"],
            lifestyle="family",
            priorities=["functionality", "durability"],
        )

        assert "white" in prefs.preferred_colors
        assert prefs.lifestyle == "family"

    def test_style_preference_input_defaults(self):
        """Test StylePreferenceInput default values."""
        prefs = StylePreferenceInput()

        assert len(prefs.preferred_colors) == 0
        assert prefs.lifestyle is None

    def test_style_match(self):
        """Test StyleMatch model."""
        match = StyleMatch(
            style=KitchenStyle.MODERN,
            match_score=85.0,
            key_characteristics=["clean lines", "minimalist"],
            color_palette=["white", "gray"],
            materials=["glass", "stainless"],
            avoid=["ornate details"],
        )

        assert match.style == KitchenStyle.MODERN
        assert match.match_score == 85.0

    def test_style_feature(self):
        """Test StyleFeature model."""
        feature = StyleFeature(
            category=StyleCategory.CABINET_STYLE,
            name="Modern Cabinets",
            description="Sleek flat-panel cabinets",
            examples=["handleless", "high-gloss"],
            compatibility_score=90.0,
            price_range="medium-high",
        )

        assert feature.category == StyleCategory.CABINET_STYLE
        assert feature.compatibility_score == 90.0


# ============================================
# Budget Optimization Models Tests
# ============================================


class TestBudgetModels:
    """Test budget optimization models."""

    def test_budget_allocation(self):
        """Test BudgetAllocation model."""
        allocation = BudgetAllocation(
            category=BudgetCategory.CABINETS,
            allocated_amount=7000.0,
            percentage=35.0,
            priority=7,
            flexibility=0.15,
        )

        assert allocation.category == BudgetCategory.CABINETS
        assert allocation.allocated_amount == 7000.0

    def test_budget_saving_opportunity(self):
        """Test BudgetSavingOpportunity model."""
        opportunity = BudgetSavingOpportunity(
            category=BudgetCategory.APPLIANCES,
            current_spend=5000.0,
            potential_savings=1500.0,
            suggestions=["Consider standard tier"],
            impact_level="medium",
        )

        assert opportunity.potential_savings == 1500.0
        assert len(opportunity.suggestions) == 1


# ============================================
# Layout Optimization Models Tests
# ============================================


class TestLayoutModels:
    """Test layout optimization models."""

    def test_work_triangle(self):
        """Test WorkTriangle model."""
        triangle = WorkTriangle(
            sink_position=Position3D(x=100, y=50, z=0),
            stove_position=Position3D(x=250, y=50, z=85),
            refrigerator_position=Position3D(x=350, y=50, z=0),
            perimeter=500.0,
            is_optimal=True,
            efficiency_score=90.0,
        )

        assert triangle.perimeter == 500.0
        assert triangle.is_optimal is True

    def test_layout_zone(self):
        """Test LayoutZone model."""
        zone = LayoutZone(
            zone_type=SpaceZone.COOKING,
            position=Position3D(x=200, y=100, z=0),
            width=150.0,
            depth=100.0,
            items=["cooktop-1", "oven-1"],
            efficiency_score=85.0,
        )

        assert zone.zone_type == SpaceZone.COOKING
        assert len(zone.items) == 2


# ============================================
# Space Analysis Models Tests
# ============================================


class TestSpaceModels:
    """Test space analysis models."""

    def test_space_utilization(self):
        """Test SpaceUtilization model."""
        utilization = SpaceUtilization(
            total_floor_area=120000.0,
            usable_floor_area=100000.0,
            cabinet_footprint=20000.0,
            appliance_footprint=8000.0,
            circulation_area=72000.0,
            utilization_percentage=28.0,
            efficiency_rating="good",
        )

        assert utilization.total_floor_area == 120000.0
        assert utilization.efficiency_rating == "good"

    def test_storage_capacity(self):
        """Test StorageCapacity model."""
        storage = StorageCapacity(
            total_volume=500000.0,
            cabinet_volume=400000.0,
            drawer_volume=50000.0,
            pantry_volume=30000.0,
            overhead_volume=20000.0,
            capacity_rating="good",
            recommendations=["Add drawers"],
        )

        assert storage.total_volume == 500000.0
        assert storage.capacity_rating == "good"

    def test_accessibility_analysis(self):
        """Test AccessibilityAnalysis model."""
        accessibility = AccessibilityAnalysis(
            wheelchair_accessible=True,
            minimum_passage_width=120.0,
            counter_heights={"main": 90.0},
            reach_zones={"upper": True, "middle": True, "lower": True},
            compliance_score=95.0,
            issues=[],
            recommendations=[],
        )

        assert accessibility.wheelchair_accessible is True
        assert accessibility.compliance_score == 95.0

    def test_space_conflict(self):
        """Test SpaceConflict model."""
        conflict = SpaceConflict(
            item1_id="cab-1",
            item2_id="cab-2",
            conflict_type="physical_overlap",
            overlap_volume=5000.0,
            severity="high",
            resolution_suggestion="Move cabinet-2 east by 20cm",
        )

        assert conflict.conflict_type == "physical_overlap"
        assert conflict.severity == "high"


# ============================================
# Model Serialization Tests
# ============================================


class TestModelSerialization:
    """Test model serialization and deserialization."""

    def test_room_dimensions_serialization(self):
        """Test RoomDimensions serialization."""
        dims = RoomDimensions(width=400, length=300, height=250, unit=MeasurementUnit.CM)

        data = dims.model_dump()

        assert data["width"] == 400
        assert data["unit"] == "cm"

    def test_room_dimensions_deserialization(self):
        """Test RoomDimensions deserialization."""
        data = {"width": 400, "length": 300, "height": 250, "unit": "cm"}

        dims = RoomDimensions.model_validate(data)

        assert dims.width == 400
        assert dims.unit == MeasurementUnit.CM

    def test_catalog_product_serialization(self):
        """Test CatalogProduct serialization."""
        product = CatalogProduct(
            id="test",
            provider_id="p",
            provider_product_id="p1",
            name="Test",
            type="cabinet",
            category="cabinet",
            dimensions=ProductDimensions(width=60, height=85, depth=60),
            price=100.0,
            in_stock=True,
        )

        data = product.model_dump()

        assert data["id"] == "test"
        assert data["dimensions"]["width"] == 60

    def test_kitchen_configuration_serialization(self, basic_kitchen_configuration):
        """Test KitchenConfiguration serialization."""
        data = basic_kitchen_configuration.model_dump()

        assert "id" in data
        assert "shape" in data
        assert "items" in data
        assert isinstance(data["items"], list)

    def test_style_recommendation_serialization(self):
        """Test StyleRecommendation serialization."""
        rec = StyleRecommendation(
            primary_style=StyleMatch(
                style=KitchenStyle.MODERN,
                match_score=85.0,
                key_characteristics=["clean"],
                color_palette=["white"],
                materials=["glass"],
                avoid=[],
            ),
            secondary_styles=[],
            features=[],
            confidence=RecommendationConfidence.HIGH,
            reasoning="Test reasoning",
        )

        data = rec.model_dump()

        assert data["primary_style"]["style"] == "modern"
        assert data["confidence"] == "high"


# ============================================
# Request/Response Models Tests
# ============================================


class TestRequestResponseModels:
    """Test request and response models."""

    def test_generation_request(self, basic_room_configuration, basic_user_preferences):
        """Test GenerationRequest model."""
        request = GenerationRequest(
            room=basic_room_configuration,
            preferences=basic_user_preferences,
            num_configurations=3,
        )

        assert request.num_configurations == 3
        assert request.constraints is None

    def test_generation_response(self):
        """Test GenerationResponse model."""
        response = GenerationResponse(
            success=True,
            configurations=[],
            stats=GenerationStats(total_generated=5, valid_configurations=3),
            errors=[],
        )

        assert response.success is True
        assert response.stats.total_generated == 5

    def test_style_recommendation_request(self):
        """Test StyleRecommendationRequest model."""
        request = StyleRecommendationRequest(
            preferences=StylePreferenceInput(
                preferred_colors=["white"],
            ),
            num_recommendations=3,
        )

        assert request.num_recommendations == 3

    def test_space_analysis_result(self):
        """Test SpaceAnalysisResult model."""
        result = SpaceAnalysisResult(
            success=True,
            utilization=SpaceUtilization(
                total_floor_area=120000,
                usable_floor_area=100000,
                cabinet_footprint=20000,
                appliance_footprint=8000,
                circulation_area=72000,
                utilization_percentage=28,
                efficiency_rating="good",
            ),
            overall_score=75.0,
            summary="Good utilization",
            recommendations=[],
            errors=[],
        )

        assert result.success is True
        assert result.overall_score == 75.0
