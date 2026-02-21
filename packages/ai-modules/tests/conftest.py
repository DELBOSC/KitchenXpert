"""
Pytest fixtures for KitchenXpert AI Modules test suite.

This module provides shared fixtures used across all test files.
"""

import pytest
import uuid
from typing import List

from src.models.kitchen import (
    MeasurementUnit,
    KitchenShape,
    KitchenStyle,
    ObstacleType,
    UtilityType,
    CabinetType,
    ApplianceCategory,
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
    ValidationResult,
    KitchenConfiguration,
)
from src.models.recommendations import (
    StylePreferenceInput,
    StyleRecommendationRequest,
    BudgetCategory,
    BudgetOptimizationRequest,
    LayoutOptimizationRequest,
    SpaceAnalysisRequest,
)
from src.services.layout_optimizer import LayoutOptimizer
from src.services.style_recommender import StyleRecommender
from src.services.budget_optimizer import BudgetOptimizer
from src.services.space_analyzer import SpaceAnalyzer


# ============================================
# Room Configuration Fixtures
# ============================================


@pytest.fixture
def basic_room_dimensions() -> RoomDimensions:
    """Basic room dimensions: 400cm x 300cm x 250cm."""
    return RoomDimensions(
        width=400.0,
        length=300.0,
        height=250.0,
        unit=MeasurementUnit.CM,
    )


@pytest.fixture
def small_room_dimensions() -> RoomDimensions:
    """Small room dimensions: 250cm x 200cm."""
    return RoomDimensions(
        width=250.0,
        length=200.0,
        height=250.0,
        unit=MeasurementUnit.CM,
    )


@pytest.fixture
def large_room_dimensions() -> RoomDimensions:
    """Large room dimensions: 600cm x 500cm."""
    return RoomDimensions(
        width=600.0,
        length=500.0,
        height=280.0,
        unit=MeasurementUnit.CM,
    )


@pytest.fixture
def wall_segment_north() -> WallSegment:
    """North wall segment without obstacles."""
    return WallSegment(
        id="north-wall",
        wall="north",
        start_position=0.0,
        end_position=400.0,
        available=True,
        obstacles=[],
    )


@pytest.fixture
def wall_segment_with_window() -> WallSegment:
    """Wall segment with a window obstacle."""
    return WallSegment(
        id="east-wall-window",
        wall="east",
        start_position=0.0,
        end_position=300.0,
        available=True,
        obstacles=[
            WallObstacle(
                type=ObstacleType.WINDOW,
                position=100.0,
                width=120.0,
                height_from_floor=90.0,
                height=100.0,
            )
        ],
    )


@pytest.fixture
def utility_water_inlet() -> UtilityConnection:
    """Water inlet utility connection."""
    return UtilityConnection(
        type=UtilityType.WATER_INLET,
        wall="south",
        position=150.0,
        height_from_floor=50.0,
    )


@pytest.fixture
def utility_gas() -> UtilityConnection:
    """Gas utility connection."""
    return UtilityConnection(
        type=UtilityType.GAS,
        wall="south",
        position=250.0,
        height_from_floor=60.0,
    )


@pytest.fixture
def basic_room_configuration(
    basic_room_dimensions,
    wall_segment_north,
    wall_segment_with_window,
    utility_water_inlet,
    utility_gas,
) -> RoomConfiguration:
    """Basic room configuration with walls and utilities."""
    return RoomConfiguration(
        dimensions=basic_room_dimensions,
        walls=[
            wall_segment_north,
            wall_segment_with_window,
            WallSegment(
                id="south-wall",
                wall="south",
                start_position=0.0,
                end_position=400.0,
                available=True,
                obstacles=[],
            ),
            WallSegment(
                id="west-wall",
                wall="west",
                start_position=0.0,
                end_position=300.0,
                available=True,
                obstacles=[
                    WallObstacle(
                        type=ObstacleType.DOOR,
                        position=50.0,
                        width=90.0,
                        height_from_floor=0.0,
                        height=210.0,
                    )
                ],
            ),
        ],
        utilities=[utility_water_inlet, utility_gas],
        preferred_shape=KitchenShape.L_SHAPE,
    )


# ============================================
# Product Fixtures
# ============================================


@pytest.fixture
def base_cabinet_60() -> CatalogProduct:
    """Standard 60cm base cabinet."""
    return CatalogProduct(
        id="bc-60",
        provider_id="standard",
        provider_product_id="BC-60",
        name="Base Cabinet 60cm",
        type="cabinet",
        category="base_cabinet",
        dimensions=ProductDimensions(width=60, height=85, depth=60, unit=MeasurementUnit.CM),
        price=200.0,
        currency="EUR",
        in_stock=True,
    )


@pytest.fixture
def wall_cabinet_60() -> CatalogProduct:
    """Standard 60cm wall cabinet."""
    return CatalogProduct(
        id="wc-60",
        provider_id="standard",
        provider_product_id="WC-60",
        name="Wall Cabinet 60cm",
        type="cabinet",
        category="wall_cabinet",
        dimensions=ProductDimensions(width=60, height=70, depth=35, unit=MeasurementUnit.CM),
        price=150.0,
        currency="EUR",
        in_stock=True,
    )


@pytest.fixture
def tall_cabinet_60() -> CatalogProduct:
    """Standard 60cm tall cabinet."""
    return CatalogProduct(
        id="tc-60",
        provider_id="standard",
        provider_product_id="TC-60",
        name="Tall Cabinet 60cm",
        type="cabinet",
        category="tall_cabinet",
        dimensions=ProductDimensions(width=60, height=200, depth=60, unit=MeasurementUnit.CM),
        price=400.0,
        currency="EUR",
        in_stock=True,
    )


@pytest.fixture
def sink_base_cabinet() -> CatalogProduct:
    """Sink base cabinet 80cm."""
    return CatalogProduct(
        id="sink-base-80",
        provider_id="standard",
        provider_product_id="SB-80",
        name="Sink Base Cabinet 80cm",
        type="cabinet",
        category="sink_base",
        dimensions=ProductDimensions(width=80, height=85, depth=60, unit=MeasurementUnit.CM),
        price=350.0,
        currency="EUR",
        in_stock=True,
        requires_utility=[UtilityType.WATER_INLET, UtilityType.WATER_OUTLET],
    )


@pytest.fixture
def refrigerator() -> CatalogProduct:
    """Standard refrigerator."""
    return CatalogProduct(
        id="fridge-standard",
        provider_id="standard",
        provider_product_id="REF-001",
        name="Standard Refrigerator",
        type="appliance",
        category="refrigerator",
        dimensions=ProductDimensions(width=60, height=180, depth=65, unit=MeasurementUnit.CM),
        price=800.0,
        currency="EUR",
        in_stock=True,
    )


@pytest.fixture
def cooktop() -> CatalogProduct:
    """60cm induction cooktop."""
    return CatalogProduct(
        id="cooktop-60",
        provider_id="standard",
        provider_product_id="CT-60",
        name="Induction Cooktop 60cm",
        type="appliance",
        category="cooktop",
        dimensions=ProductDimensions(width=60, height=5, depth=52, unit=MeasurementUnit.CM),
        price=500.0,
        currency="EUR",
        in_stock=True,
        requires_utility=[UtilityType.ELECTRICAL_220V],
    )


@pytest.fixture
def dishwasher() -> CatalogProduct:
    """Standard 60cm dishwasher."""
    return CatalogProduct(
        id="dw-60",
        provider_id="standard",
        provider_product_id="DW-60",
        name="Dishwasher 60cm",
        type="appliance",
        category="dishwasher",
        dimensions=ProductDimensions(width=60, height=82, depth=55, unit=MeasurementUnit.CM),
        price=450.0,
        currency="EUR",
        in_stock=True,
        requires_utility=[UtilityType.WATER_INLET, UtilityType.WATER_OUTLET],
    )


@pytest.fixture
def oven() -> CatalogProduct:
    """Built-in oven 60cm."""
    return CatalogProduct(
        id="oven-60",
        provider_id="standard",
        provider_product_id="OV-60",
        name="Built-in Oven 60cm",
        type="appliance",
        category="oven",
        dimensions=ProductDimensions(width=60, height=60, depth=55, unit=MeasurementUnit.CM),
        price=600.0,
        currency="EUR",
        in_stock=True,
    )


@pytest.fixture
def product_catalog(
    base_cabinet_60,
    wall_cabinet_60,
    tall_cabinet_60,
    sink_base_cabinet,
    refrigerator,
    cooktop,
    dishwasher,
    oven,
) -> List[CatalogProduct]:
    """Complete product catalog for testing."""
    return [
        base_cabinet_60,
        wall_cabinet_60,
        tall_cabinet_60,
        sink_base_cabinet,
        refrigerator,
        cooktop,
        dishwasher,
        oven,
    ]


# ============================================
# Placed Items Fixtures
# ============================================


@pytest.fixture
def placed_sink(sink_base_cabinet) -> PlacedItem:
    """Placed sink cabinet."""
    return PlacedItem(
        id=str(uuid.uuid4()),
        product=sink_base_cabinet,
        position=Position3D(x=150.0, y=35.0, z=0.0),
        rotation=0.0,
        wall="south",
    )


@pytest.fixture
def placed_refrigerator(refrigerator) -> PlacedItem:
    """Placed refrigerator."""
    return PlacedItem(
        id=str(uuid.uuid4()),
        product=refrigerator,
        position=Position3D(x=350.0, y=35.0, z=0.0),
        rotation=0.0,
        wall="south",
    )


@pytest.fixture
def placed_cooktop(cooktop) -> PlacedItem:
    """Placed cooktop."""
    return PlacedItem(
        id=str(uuid.uuid4()),
        product=cooktop,
        position=Position3D(x=250.0, y=35.0, z=85.0),
        rotation=0.0,
        wall="south",
    )


@pytest.fixture
def placed_base_cabinet(base_cabinet_60) -> PlacedItem:
    """Placed base cabinet."""
    return PlacedItem(
        id=str(uuid.uuid4()),
        product=base_cabinet_60,
        position=Position3D(x=50.0, y=35.0, z=0.0),
        rotation=0.0,
        wall="south",
    )


# ============================================
# User Preferences Fixtures
# ============================================


@pytest.fixture
def basic_budget_range() -> BudgetRange:
    """Basic budget range: 10,000 - 20,000 EUR."""
    return BudgetRange(
        min_amount=10000.0,
        max_amount=20000.0,
        currency="EUR",
    )


@pytest.fixture
def premium_budget_range() -> BudgetRange:
    """Premium budget range: 30,000 - 50,000 EUR."""
    return BudgetRange(
        min_amount=30000.0,
        max_amount=50000.0,
        currency="EUR",
    )


@pytest.fixture
def basic_user_preferences(basic_budget_range) -> UserPreferences:
    """Basic user preferences for modern style."""
    return UserPreferences(
        budget=basic_budget_range,
        style=KitchenStyle.MODERN,
        colors=ColorPreferences(
            cabinets=["white", "gray"],
            worktop=["quartz", "granite"],
            handles=["chrome", "stainless"],
        ),
        required_appliances=[
            ApplianceCategory.REFRIGERATOR,
            ApplianceCategory.COOKTOP,
            ApplianceCategory.OVEN,
            ApplianceCategory.DISHWASHER,
        ],
        optional_appliances=[ApplianceCategory.MICROWAVE],
        preferred_providers=[],
        accessibility=None,
        storage_priority=7,
    )


@pytest.fixture
def accessible_user_preferences(basic_budget_range) -> UserPreferences:
    """User preferences with accessibility requirements."""
    return UserPreferences(
        budget=basic_budget_range,
        style=KitchenStyle.SCANDINAVIAN,
        colors=ColorPreferences(
            cabinets=["white", "light wood"],
            worktop=["wood", "laminate"],
            handles=["wood", "metal"],
        ),
        required_appliances=[
            ApplianceCategory.REFRIGERATOR,
            ApplianceCategory.COOKTOP,
            ApplianceCategory.SINK,
        ],
        optional_appliances=[],
        preferred_providers=[],
        accessibility=AccessibilityRequirements(
            wheelchair_accessible=True,
            lowered_worktop=True,
            pull_out_shelves=True,
        ),
        storage_priority=6,
    )


# ============================================
# Kitchen Configuration Fixtures
# ============================================


@pytest.fixture
def basic_kitchen_configuration(
    basic_room_configuration,
    placed_sink,
    placed_refrigerator,
    placed_cooktop,
    placed_base_cabinet,
) -> KitchenConfiguration:
    """Basic kitchen configuration with essential items."""
    items = [placed_sink, placed_refrigerator, placed_cooktop, placed_base_cabinet]

    cabinets = [placed_sink, placed_base_cabinet]
    appliances = [placed_refrigerator, placed_cooktop]

    total_price = sum(item.product.price for item in items)
    cabinet_price = sum(item.product.price for item in cabinets)
    appliance_price = sum(item.product.price for item in appliances)

    return KitchenConfiguration(
        id=str(uuid.uuid4()),
        name="Basic L-Shape Kitchen",
        shape=KitchenShape.L_SHAPE,
        style=KitchenStyle.MODERN,
        room=basic_room_configuration,
        items=items,
        cabinets=cabinets,
        appliances=appliances,
        worktops=[],
        pricing=PricingSummary(
            cabinets=cabinet_price,
            appliances=appliance_price,
            worktops=0.0,
            fittings=0.0,
            total=total_price,
            currency="EUR",
            by_provider={"standard": total_price},
        ),
        score=ConfigurationScore(
            overall=75.0,
            ergonomics=80.0,
            storage=70.0,
            aesthetics=75.0,
            budget_efficiency=80.0,
            space_utilization=70.0,
        ),
        validation=ValidationResult(valid=True, errors=[], warnings=[]),
        metadata={"source": "test"},
    )


# ============================================
# Request Fixtures
# ============================================


@pytest.fixture
def layout_optimization_request(
    basic_room_configuration,
    basic_user_preferences,
    product_catalog,
) -> LayoutOptimizationRequest:
    """Layout optimization request."""
    return LayoutOptimizationRequest(
        room=basic_room_configuration,
        preferences=basic_user_preferences,
        existing_items=product_catalog,
        fixed_positions={},
        optimization_priorities=["ergonomics", "storage", "workflow"],
        population_size=20,  # Smaller for faster tests
        generations=30,  # Fewer for faster tests
    )


@pytest.fixture
def style_recommendation_request() -> StyleRecommendationRequest:
    """Style recommendation request."""
    return StyleRecommendationRequest(
        preferences=StylePreferenceInput(
            preferred_colors=["white", "gray", "navy"],
            preferred_materials=["wood", "quartz", "stainless steel"],
            lifestyle="family with children",
            existing_home_style="modern",
            inspirations=["scandinavian", "minimalist"],
            priorities=["functionality", "durability"],
            dislikes=["ornate details", "brass"],
        ),
        budget=BudgetRange(min_amount=15000, max_amount=25000, currency="EUR"),
        num_recommendations=3,
    )


@pytest.fixture
def budget_optimization_request(
    basic_kitchen_configuration,
    basic_user_preferences,
) -> BudgetOptimizationRequest:
    """Budget optimization request."""
    return BudgetOptimizationRequest(
        total_budget=15000.0,
        currency="EUR",
        current_configuration=basic_kitchen_configuration,
        preferences=basic_user_preferences,
        priorities={
            BudgetCategory.CABINETS: 7,
            BudgetCategory.APPLIANCES: 8,
            BudgetCategory.COUNTERTOPS: 6,
        },
        fixed_items=[],
        optimization_goal="maximize_value",
    )


@pytest.fixture
def space_analysis_request(
    basic_room_configuration,
    basic_kitchen_configuration,
) -> SpaceAnalysisRequest:
    """Space analysis request."""
    return SpaceAnalysisRequest(
        room=basic_room_configuration,
        configuration=basic_kitchen_configuration,
        items=[],
        analyze_accessibility=True,
        analyze_storage=True,
        analyze_workflow=True,
    )


# ============================================
# Service Fixtures
# ============================================


@pytest.fixture
def layout_optimizer() -> LayoutOptimizer:
    """Layout optimizer service instance."""
    return LayoutOptimizer(
        population_size=20,
        generations=30,
        crossover_rate=0.8,
        mutation_rate=0.1,
        elitism_count=2,
    )


@pytest.fixture
def style_recommender() -> StyleRecommender:
    """Style recommender service instance."""
    return StyleRecommender()


@pytest.fixture
def budget_optimizer() -> BudgetOptimizer:
    """Budget optimizer service instance."""
    return BudgetOptimizer()


@pytest.fixture
def space_analyzer() -> SpaceAnalyzer:
    """Space analyzer service instance."""
    return SpaceAnalyzer()
