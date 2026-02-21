"""
Tests for the space analyzer service.

Tests cover:
- Space utilization analysis
- Storage capacity analysis
- Accessibility analysis
- Workflow analysis
- Conflict detection
- Work triangle analysis
- Zone identification
"""

import pytest
import uuid
from typing import List

from src.services.space_analyzer import (
    SpaceAnalyzer,
    BoundingBox,
)
from src.models.kitchen import (
    KitchenShape,
    KitchenStyle,
    MeasurementUnit,
    RoomDimensions,
    WallSegment,
    RoomConfiguration,
    CatalogProduct,
    ProductDimensions,
    PlacedItem,
    Position3D,
    PricingSummary,
    ConfigurationScore,
    ValidationResult,
    KitchenConfiguration,
)
from src.models.recommendations import (
    SpaceZone,
    SpaceUtilization,
    StorageCapacity,
    AccessibilityAnalysis,
    WorkflowAnalysis,
    SpaceConflict,
    SpaceAnalysisRequest,
    SpaceAnalysisResult,
    WorkTriangle,
    LayoutZone,
)


class TestBoundingBox:
    """Test BoundingBox data structure."""

    def test_bounding_box_creation(self):
        """Test creating a BoundingBox."""
        bbox = BoundingBox(
            min_x=0.0, min_y=0.0, min_z=0.0,
            max_x=60.0, max_y=60.0, max_z=85.0,
        )

        assert bbox.min_x == 0.0
        assert bbox.max_x == 60.0
        assert bbox.max_z == 85.0

    def test_bounding_box_volume(self):
        """Test BoundingBox volume calculation."""
        bbox = BoundingBox(
            min_x=0.0, min_y=0.0, min_z=0.0,
            max_x=60.0, max_y=60.0, max_z=85.0,
        )

        expected_volume = 60.0 * 60.0 * 85.0
        assert bbox.volume == expected_volume

    def test_bounding_box_floor_area(self):
        """Test BoundingBox floor area calculation."""
        bbox = BoundingBox(
            min_x=0.0, min_y=0.0, min_z=0.0,
            max_x=100.0, max_y=50.0, max_z=200.0,
        )

        expected_area = 100.0 * 50.0
        assert bbox.floor_area == expected_area

    def test_bounding_box_overlaps_true(self):
        """Test BoundingBox overlap detection - overlapping."""
        bbox1 = BoundingBox(
            min_x=0.0, min_y=0.0, min_z=0.0,
            max_x=100.0, max_y=100.0, max_z=100.0,
        )
        bbox2 = BoundingBox(
            min_x=50.0, min_y=50.0, min_z=0.0,
            max_x=150.0, max_y=150.0, max_z=100.0,
        )

        assert bbox1.overlaps(bbox2) is True

    def test_bounding_box_overlaps_false(self):
        """Test BoundingBox overlap detection - not overlapping."""
        bbox1 = BoundingBox(
            min_x=0.0, min_y=0.0, min_z=0.0,
            max_x=50.0, max_y=50.0, max_z=50.0,
        )
        bbox2 = BoundingBox(
            min_x=100.0, min_y=100.0, min_z=0.0,
            max_x=150.0, max_y=150.0, max_z=50.0,
        )

        assert bbox1.overlaps(bbox2) is False

    def test_bounding_box_overlap_volume(self):
        """Test BoundingBox overlap volume calculation."""
        bbox1 = BoundingBox(
            min_x=0.0, min_y=0.0, min_z=0.0,
            max_x=100.0, max_y=100.0, max_z=100.0,
        )
        bbox2 = BoundingBox(
            min_x=50.0, min_y=50.0, min_z=0.0,
            max_x=150.0, max_y=150.0, max_z=100.0,
        )

        # Overlap is 50x50x100
        expected_overlap = 50.0 * 50.0 * 100.0
        assert bbox1.overlap_volume(bbox2) == expected_overlap


class TestSpaceAnalyzerInitialization:
    """Test SpaceAnalyzer initialization."""

    def test_initialization(self):
        """Test analyzer initializes correctly."""
        analyzer = SpaceAnalyzer()
        assert analyzer is not None

    def test_accessibility_standards_defined(self, space_analyzer):
        """Test accessibility standards are defined."""
        standards = space_analyzer.ACCESSIBILITY_STANDARDS

        assert "min_passage_width" in standards
        assert "wheelchair_passage" in standards
        assert "max_reach_height" in standards
        assert standards["min_passage_width"] == 90

    def test_storage_standards_defined(self, space_analyzer):
        """Test storage standards are defined."""
        standards = space_analyzer.STORAGE_STANDARDS

        assert "minimum" in standards
        assert "adequate" in standards
        assert "good" in standards
        assert "excellent" in standards


class TestUtilizationAnalysis:
    """Test space utilization analysis."""

    def test_analyze_utilization(self, space_analyzer, basic_room_configuration, basic_kitchen_configuration):
        """Test space utilization analysis."""
        utilization = space_analyzer._analyze_utilization(
            basic_room_configuration,
            basic_kitchen_configuration,
        )

        assert isinstance(utilization, SpaceUtilization)
        assert utilization.total_floor_area > 0
        assert utilization.usable_floor_area > 0
        assert 0 <= utilization.utilization_percentage <= 100
        assert utilization.efficiency_rating in ["excellent", "good", "adequate", "poor"]

    def test_analyze_utilization_no_items(self, space_analyzer, basic_room_configuration):
        """Test utilization analysis without items."""
        empty_config = KitchenConfiguration(
            id="test",
            name="Empty Kitchen",
            shape=KitchenShape.I_SHAPE,
            style=KitchenStyle.MODERN,
            room=basic_room_configuration,
            items=[],
            cabinets=[],
            appliances=[],
            worktops=[],
            pricing=PricingSummary(),
            score=ConfigurationScore(),
            validation=ValidationResult(valid=True),
            metadata={},
        )

        utilization = space_analyzer._analyze_utilization(
            basic_room_configuration,
            empty_config,
        )

        assert utilization.cabinet_footprint == 0.0
        assert utilization.appliance_footprint == 0.0
        assert utilization.utilization_percentage == 0.0

    def test_analyze_utilization_efficiency_ratings(self, space_analyzer, basic_room_configuration):
        """Test efficiency rating assignment."""
        # Test different utilization levels would get different ratings
        utilization = space_analyzer._analyze_utilization(
            basic_room_configuration,
            None,
        )

        # With None config, should have zero utilization
        assert utilization.efficiency_rating == "poor"


class TestStorageAnalysis:
    """Test storage capacity analysis."""

    def test_analyze_storage(self, space_analyzer, basic_room_configuration, basic_kitchen_configuration):
        """Test storage capacity analysis."""
        storage = space_analyzer._analyze_storage(
            basic_room_configuration,
            basic_kitchen_configuration,
        )

        assert isinstance(storage, StorageCapacity)
        assert storage.total_volume >= 0
        assert storage.capacity_rating in ["excellent", "good", "adequate", "minimum", "insufficient"]

    def test_analyze_storage_volume_breakdown(self, space_analyzer, basic_room_configuration, basic_kitchen_configuration):
        """Test storage volume breakdown."""
        storage = space_analyzer._analyze_storage(
            basic_room_configuration,
            basic_kitchen_configuration,
        )

        # Total should be sum of components (approximately)
        component_sum = (
            storage.cabinet_volume +
            storage.drawer_volume +
            storage.pantry_volume +
            storage.overhead_volume
        )

        assert abs(storage.total_volume - component_sum) < 1.0

    def test_analyze_storage_recommendations(self, space_analyzer, basic_room_configuration, basic_kitchen_configuration):
        """Test storage analysis generates recommendations."""
        storage = space_analyzer._analyze_storage(
            basic_room_configuration,
            basic_kitchen_configuration,
        )

        # Recommendations should exist (may be empty if storage is excellent)
        assert isinstance(storage.recommendations, list)


class TestAccessibilityAnalysis:
    """Test accessibility analysis."""

    def test_analyze_accessibility(self, space_analyzer, basic_room_configuration, basic_kitchen_configuration):
        """Test accessibility analysis."""
        accessibility = space_analyzer._analyze_accessibility(
            basic_room_configuration,
            basic_kitchen_configuration,
        )

        assert isinstance(accessibility, AccessibilityAnalysis)
        assert isinstance(accessibility.wheelchair_accessible, bool)
        assert accessibility.minimum_passage_width >= 0
        assert 0 <= accessibility.compliance_score <= 100

    def test_analyze_accessibility_passage_width(self, space_analyzer, basic_room_configuration, basic_kitchen_configuration):
        """Test minimum passage width calculation."""
        accessibility = space_analyzer._analyze_accessibility(
            basic_room_configuration,
            basic_kitchen_configuration,
        )

        # Passage width should be calculated
        assert accessibility.minimum_passage_width >= 0

    def test_analyze_accessibility_issues_reporting(self, space_analyzer, basic_room_configuration, basic_kitchen_configuration):
        """Test accessibility issues are reported."""
        accessibility = space_analyzer._analyze_accessibility(
            basic_room_configuration,
            basic_kitchen_configuration,
        )

        # Should have issues or recommendations lists
        assert isinstance(accessibility.issues, list)
        assert isinstance(accessibility.recommendations, list)


class TestMinimumPassageCalculation:
    """Test minimum passage width calculation."""

    def test_calculate_minimum_passage_empty_room(self, space_analyzer, basic_room_configuration):
        """Test passage calculation in empty room."""
        empty_config = KitchenConfiguration(
            id="test",
            name="Empty",
            shape=KitchenShape.I_SHAPE,
            style=KitchenStyle.MODERN,
            room=basic_room_configuration,
            items=[],
            cabinets=[],
            appliances=[],
            worktops=[],
            pricing=PricingSummary(),
            score=ConfigurationScore(),
            validation=ValidationResult(valid=True),
            metadata={},
        )

        passage = space_analyzer._calculate_minimum_passage(
            basic_room_configuration,
            empty_config,
        )

        # Should be large in empty room
        assert passage > 100


class TestWorkflowAnalysis:
    """Test workflow analysis."""

    def test_analyze_workflow(self, space_analyzer, basic_room_configuration, basic_kitchen_configuration):
        """Test workflow analysis."""
        workflow = space_analyzer._analyze_workflow(
            basic_room_configuration,
            basic_kitchen_configuration,
        )

        assert isinstance(workflow, WorkflowAnalysis)
        assert 0 <= workflow.flow_efficiency <= 100
        assert isinstance(workflow.zones, list)
        assert isinstance(workflow.bottlenecks, list)
        assert isinstance(workflow.recommendations, list)

    def test_workflow_work_triangle(self, space_analyzer, basic_room_configuration, basic_kitchen_configuration):
        """Test work triangle is analyzed in workflow."""
        workflow = space_analyzer._analyze_workflow(
            basic_room_configuration,
            basic_kitchen_configuration,
        )

        # Work triangle may or may not exist depending on items
        if workflow.work_triangle:
            assert isinstance(workflow.work_triangle, WorkTriangle)
            assert workflow.work_triangle.perimeter > 0


class TestWorkTriangleAnalysis:
    """Test work triangle analysis."""

    def test_analyze_work_triangle_complete(
        self,
        space_analyzer,
        sink_base_cabinet,
        cooktop,
        refrigerator,
    ):
        """Test work triangle with all components."""
        # Create placed items
        placed_sink = PlacedItem(
            id=str(uuid.uuid4()),
            product=sink_base_cabinet,
            position=Position3D(x=100.0, y=50.0, z=0.0),
            rotation=0.0,
        )
        placed_cooktop = PlacedItem(
            id=str(uuid.uuid4()),
            product=cooktop,
            position=Position3D(x=250.0, y=50.0, z=85.0),
            rotation=0.0,
        )
        placed_fridge = PlacedItem(
            id=str(uuid.uuid4()),
            product=refrigerator,
            position=Position3D(x=100.0, y=200.0, z=0.0),
            rotation=0.0,
        )

        config = KitchenConfiguration(
            id="test",
            name="Test",
            shape=KitchenShape.L_SHAPE,
            style=KitchenStyle.MODERN,
            room=RoomConfiguration(
                dimensions=RoomDimensions(width=400, length=300, height=250, unit=MeasurementUnit.CM),
                walls=[],
                utilities=[],
            ),
            items=[placed_sink, placed_cooktop, placed_fridge],
            cabinets=[placed_sink],
            appliances=[placed_cooktop, placed_fridge],
            worktops=[],
            pricing=PricingSummary(),
            score=ConfigurationScore(),
            validation=ValidationResult(valid=True),
            metadata={},
        )

        work_triangle = space_analyzer._analyze_work_triangle(config)

        assert work_triangle is not None
        assert work_triangle.perimeter > 0
        assert work_triangle.sink_position.x == 100.0
        assert work_triangle.stove_position.x == 250.0

    def test_analyze_work_triangle_optimal_check(self, space_analyzer):
        """Test work triangle optimal range check."""
        # Create items forming optimal triangle (perimeter 360-660)
        sink_product = CatalogProduct(
            id="sink", provider_id="std", provider_product_id="S1",
            name="Sink", type="cabinet", category="sink_base",
            dimensions=ProductDimensions(width=80, height=85, depth=60, unit=MeasurementUnit.CM),
            price=300.0, currency="EUR", in_stock=True,
        )
        cooktop_product = CatalogProduct(
            id="cooktop", provider_id="std", provider_product_id="C1",
            name="Cooktop", type="appliance", category="cooktop",
            dimensions=ProductDimensions(width=60, height=5, depth=52, unit=MeasurementUnit.CM),
            price=400.0, currency="EUR", in_stock=True,
        )
        fridge_product = CatalogProduct(
            id="fridge", provider_id="std", provider_product_id="F1",
            name="Fridge", type="appliance", category="refrigerator",
            dimensions=ProductDimensions(width=60, height=180, depth=65, unit=MeasurementUnit.CM),
            price=700.0, currency="EUR", in_stock=True,
        )

        # Position to form ~500cm perimeter
        config = KitchenConfiguration(
            id="test",
            name="Test",
            shape=KitchenShape.L_SHAPE,
            style=KitchenStyle.MODERN,
            room=RoomConfiguration(
                dimensions=RoomDimensions(width=400, length=300, height=250, unit=MeasurementUnit.CM),
                walls=[],
                utilities=[],
            ),
            items=[
                PlacedItem(id="1", product=sink_product, position=Position3D(x=0, y=0, z=0), rotation=0),
                PlacedItem(id="2", product=cooktop_product, position=Position3D(x=200, y=0, z=85), rotation=0),
                PlacedItem(id="3", product=fridge_product, position=Position3D(x=100, y=170, z=0), rotation=0),
            ],
            cabinets=[],
            appliances=[],
            worktops=[],
            pricing=PricingSummary(),
            score=ConfigurationScore(),
            validation=ValidationResult(valid=True),
            metadata={},
        )

        work_triangle = space_analyzer._analyze_work_triangle(config)

        assert work_triangle is not None
        # Check perimeter is in reasonable range for our positions
        assert 300 < work_triangle.perimeter < 800


class TestZoneIdentification:
    """Test zone identification."""

    def test_identify_zones(self, space_analyzer, basic_kitchen_configuration):
        """Test zone identification."""
        zones = space_analyzer._identify_zones(basic_kitchen_configuration)

        assert isinstance(zones, list)
        assert all(isinstance(z, LayoutZone) for z in zones)

    def test_identify_zones_types(self, space_analyzer, basic_kitchen_configuration):
        """Test zone types are identified."""
        zones = space_analyzer._identify_zones(basic_kitchen_configuration)

        if zones:
            zone_types = {z.zone_type for z in zones}
            # Should have at least some zone types
            assert len(zone_types) > 0

    def test_identify_zones_positions(self, space_analyzer, basic_kitchen_configuration):
        """Test zones have valid positions."""
        zones = space_analyzer._identify_zones(basic_kitchen_configuration)

        for zone in zones:
            assert zone.position.x >= 0
            assert zone.position.y >= 0
            assert zone.width > 0
            assert zone.depth > 0


class TestConflictDetection:
    """Test spatial conflict detection."""

    def test_detect_conflicts_no_overlap(self, space_analyzer):
        """Test no conflicts when items don't overlap."""
        product = CatalogProduct(
            id="cab", provider_id="std", provider_product_id="C1",
            name="Cabinet", type="cabinet", category="base_cabinet",
            dimensions=ProductDimensions(width=60, height=85, depth=60, unit=MeasurementUnit.CM),
            price=200.0, currency="EUR", in_stock=True,
        )

        config = KitchenConfiguration(
            id="test",
            name="Test",
            shape=KitchenShape.I_SHAPE,
            style=KitchenStyle.MODERN,
            room=RoomConfiguration(
                dimensions=RoomDimensions(width=400, length=300, height=250, unit=MeasurementUnit.CM),
                walls=[],
                utilities=[],
            ),
            items=[
                PlacedItem(id="1", product=product, position=Position3D(x=50, y=50, z=0), rotation=0),
                PlacedItem(id="2", product=product, position=Position3D(x=200, y=50, z=0), rotation=0),
            ],
            cabinets=[],
            appliances=[],
            worktops=[],
            pricing=PricingSummary(),
            score=ConfigurationScore(),
            validation=ValidationResult(valid=True),
            metadata={},
        )

        conflicts = space_analyzer._detect_conflicts(config)

        assert len(conflicts) == 0

    def test_detect_conflicts_with_overlap(self, space_analyzer):
        """Test conflicts detected when items overlap."""
        product = CatalogProduct(
            id="cab", provider_id="std", provider_product_id="C1",
            name="Cabinet", type="cabinet", category="base_cabinet",
            dimensions=ProductDimensions(width=60, height=85, depth=60, unit=MeasurementUnit.CM),
            price=200.0, currency="EUR", in_stock=True,
        )

        config = KitchenConfiguration(
            id="test",
            name="Test",
            shape=KitchenShape.I_SHAPE,
            style=KitchenStyle.MODERN,
            room=RoomConfiguration(
                dimensions=RoomDimensions(width=400, length=300, height=250, unit=MeasurementUnit.CM),
                walls=[],
                utilities=[],
            ),
            items=[
                PlacedItem(id="1", product=product, position=Position3D(x=50, y=50, z=0), rotation=0),
                PlacedItem(id="2", product=product, position=Position3D(x=70, y=50, z=0), rotation=0),  # Overlapping
            ],
            cabinets=[],
            appliances=[],
            worktops=[],
            pricing=PricingSummary(),
            score=ConfigurationScore(),
            validation=ValidationResult(valid=True),
            metadata={},
        )

        conflicts = space_analyzer._detect_conflicts(config)

        assert len(conflicts) > 0
        assert conflicts[0].severity in ["low", "medium", "high"]

    def test_detect_conflicts_resolution_suggestion(self, space_analyzer):
        """Test conflict resolution suggestions are provided."""
        product = CatalogProduct(
            id="cab", provider_id="std", provider_product_id="C1",
            name="Cabinet", type="cabinet", category="base_cabinet",
            dimensions=ProductDimensions(width=60, height=85, depth=60, unit=MeasurementUnit.CM),
            price=200.0, currency="EUR", in_stock=True,
        )

        config = KitchenConfiguration(
            id="test",
            name="Test",
            shape=KitchenShape.I_SHAPE,
            style=KitchenStyle.MODERN,
            room=RoomConfiguration(
                dimensions=RoomDimensions(width=400, length=300, height=250, unit=MeasurementUnit.CM),
                walls=[],
                utilities=[],
            ),
            items=[
                PlacedItem(id="1", product=product, position=Position3D(x=50, y=50, z=0), rotation=0),
                PlacedItem(id="2", product=product, position=Position3D(x=55, y=50, z=0), rotation=0),
            ],
            cabinets=[],
            appliances=[],
            worktops=[],
            pricing=PricingSummary(),
            score=ConfigurationScore(),
            validation=ValidationResult(valid=True),
            metadata={},
        )

        conflicts = space_analyzer._detect_conflicts(config)

        if conflicts:
            assert len(conflicts[0].resolution_suggestion) > 0


class TestItemBoundingBox:
    """Test item bounding box calculation."""

    def test_get_item_bounding_box_no_rotation(self, space_analyzer):
        """Test bounding box calculation without rotation."""
        product = CatalogProduct(
            id="cab", provider_id="std", provider_product_id="C1",
            name="Cabinet", type="cabinet", category="base_cabinet",
            dimensions=ProductDimensions(width=60, height=85, depth=60, unit=MeasurementUnit.CM),
            price=200.0, currency="EUR", in_stock=True,
        )
        item = PlacedItem(
            id="1",
            product=product,
            position=Position3D(x=100, y=100, z=0),
            rotation=0,
        )

        bbox = space_analyzer._get_item_bounding_box(item)

        assert bbox.min_x == 70.0  # 100 - 30
        assert bbox.max_x == 130.0  # 100 + 30
        assert bbox.min_y == 70.0  # 100 - 30
        assert bbox.max_y == 130.0  # 100 + 30
        assert bbox.min_z == 0.0
        assert bbox.max_z == 85.0

    def test_get_item_bounding_box_with_rotation(self, space_analyzer):
        """Test bounding box calculation with 90 degree rotation."""
        product = CatalogProduct(
            id="cab", provider_id="std", provider_product_id="C1",
            name="Cabinet", type="cabinet", category="base_cabinet",
            dimensions=ProductDimensions(width=60, height=85, depth=40, unit=MeasurementUnit.CM),
            price=200.0, currency="EUR", in_stock=True,
        )
        item = PlacedItem(
            id="1",
            product=product,
            position=Position3D(x=100, y=100, z=0),
            rotation=90,
        )

        bbox = space_analyzer._get_item_bounding_box(item)

        # Width and depth should be swapped due to rotation
        assert bbox.max_x - bbox.min_x == 40.0  # Depth becomes width
        assert bbox.max_y - bbox.min_y == 60.0  # Width becomes depth


class TestOverallScoreCalculation:
    """Test overall score calculation."""

    def test_calculate_overall_score(self, space_analyzer):
        """Test overall score calculation."""
        utilization = SpaceUtilization(
            total_floor_area=120000,
            usable_floor_area=100000,
            cabinet_footprint=15000,
            appliance_footprint=5000,
            circulation_area=80000,
            utilization_percentage=20,
            efficiency_rating="good",
        )

        score = space_analyzer._calculate_overall_score(
            utilization,
            storage=None,
            accessibility=None,
            workflow=None,
            conflicts=[],
        )

        assert 0 <= score <= 100

    def test_calculate_overall_score_with_conflicts(self, space_analyzer):
        """Test score is reduced by conflicts."""
        utilization = SpaceUtilization(
            total_floor_area=120000,
            usable_floor_area=100000,
            cabinet_footprint=35000,
            appliance_footprint=5000,
            circulation_area=60000,
            utilization_percentage=40,
            efficiency_rating="excellent",
        )

        conflicts = [
            SpaceConflict(
                item1_id="1",
                item2_id="2",
                conflict_type="physical_overlap",
                overlap_volume=5000,
                severity="high",
                resolution_suggestion="Move items",
            )
        ]

        score_no_conflicts = space_analyzer._calculate_overall_score(
            utilization, None, None, None, []
        )
        score_with_conflicts = space_analyzer._calculate_overall_score(
            utilization, None, None, None, conflicts
        )

        assert score_with_conflicts < score_no_conflicts


class TestFullAnalysis:
    """Test full space analysis workflow."""

    def test_analyze_success(self, space_analyzer, space_analysis_request):
        """Test successful space analysis."""
        result = space_analyzer.analyze(space_analysis_request)

        assert result.success is True
        assert result.utilization is not None
        assert result.overall_score >= 0

    def test_analyze_returns_utilization(self, space_analyzer, space_analysis_request):
        """Test analysis returns utilization metrics."""
        result = space_analyzer.analyze(space_analysis_request)

        assert result.utilization.total_floor_area > 0

    def test_analyze_returns_summary(self, space_analyzer, space_analysis_request):
        """Test analysis returns summary."""
        result = space_analyzer.analyze(space_analysis_request)

        assert len(result.summary) > 0

    def test_analyze_returns_recommendations(self, space_analyzer, space_analysis_request):
        """Test analysis returns recommendations."""
        result = space_analyzer.analyze(space_analysis_request)

        assert isinstance(result.recommendations, list)

    def test_analyze_all_options(self, space_analyzer, basic_room_configuration, basic_kitchen_configuration):
        """Test analysis with all options enabled."""
        request = SpaceAnalysisRequest(
            room=basic_room_configuration,
            configuration=basic_kitchen_configuration,
            analyze_accessibility=True,
            analyze_storage=True,
            analyze_workflow=True,
        )

        result = space_analyzer.analyze(request)

        assert result.success is True
        # These may be None if configuration doesn't have enough items
        # but the analysis should not fail


class TestSummaryGeneration:
    """Test summary generation."""

    def test_generate_summary(self, space_analyzer):
        """Test generating analysis summary."""
        utilization = SpaceUtilization(
            total_floor_area=120000,
            usable_floor_area=100000,
            cabinet_footprint=35000,
            appliance_footprint=5000,
            circulation_area=60000,
            utilization_percentage=40,
            efficiency_rating="excellent",
        )

        summary = space_analyzer._generate_summary(
            utilization,
            storage=None,
            accessibility=None,
            workflow=None,
            conflicts=[],
        )

        assert "utilization" in summary.lower()
        assert "excellent" in summary.lower()

    def test_generate_summary_with_all_components(self, space_analyzer):
        """Test summary with all analysis components."""
        utilization = SpaceUtilization(
            total_floor_area=120000,
            usable_floor_area=100000,
            cabinet_footprint=35000,
            appliance_footprint=5000,
            circulation_area=60000,
            utilization_percentage=40,
            efficiency_rating="good",
        )
        storage = StorageCapacity(
            total_volume=500000,
            cabinet_volume=400000,
            drawer_volume=50000,
            pantry_volume=30000,
            overhead_volume=20000,
            capacity_rating="good",
            recommendations=[],
        )
        accessibility = AccessibilityAnalysis(
            wheelchair_accessible=True,
            minimum_passage_width=120,
            counter_heights={},
            reach_zones={},
            compliance_score=90,
            issues=[],
            recommendations=[],
        )

        summary = space_analyzer._generate_summary(
            utilization,
            storage,
            accessibility,
            workflow=None,
            conflicts=[],
        )

        assert "storage" in summary.lower()
        assert "wheelchair" in summary.lower()


class TestRecommendationGeneration:
    """Test recommendation generation."""

    def test_generate_recommendations(self, space_analyzer):
        """Test generating recommendations."""
        utilization = SpaceUtilization(
            total_floor_area=120000,
            usable_floor_area=100000,
            cabinet_footprint=5000,
            appliance_footprint=2000,
            circulation_area=93000,
            utilization_percentage=7,
            efficiency_rating="poor",
        )

        recommendations = space_analyzer._generate_recommendations(
            utilization,
            storage=None,
            accessibility=None,
            workflow=None,
            conflicts=[],
        )

        # Should recommend adding more items
        assert len(recommendations) > 0

    def test_generate_recommendations_limited(self, space_analyzer):
        """Test recommendations are limited to reasonable count."""
        utilization = SpaceUtilization(
            total_floor_area=120000,
            usable_floor_area=100000,
            cabinet_footprint=5000,
            appliance_footprint=2000,
            circulation_area=93000,
            utilization_percentage=7,
            efficiency_rating="poor",
        )
        storage = StorageCapacity(
            total_volume=100000,
            cabinet_volume=100000,
            drawer_volume=0,
            pantry_volume=0,
            overhead_volume=0,
            capacity_rating="minimum",
            recommendations=["Add tall cabinets", "Add drawers", "Add pantry"],
        )

        recommendations = space_analyzer._generate_recommendations(
            utilization,
            storage,
            accessibility=None,
            workflow=None,
            conflicts=[],
        )

        # Should be limited to 6 recommendations
        assert len(recommendations) <= 6
