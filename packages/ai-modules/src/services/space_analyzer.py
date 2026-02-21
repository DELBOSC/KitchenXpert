"""
3D space analysis service for KitchenXpert.
Analyzes kitchen space utilization, accessibility, and workflow.
"""

from typing import List, Dict, Optional, Tuple, Set
from dataclasses import dataclass
import math

from ..models.kitchen import (
    RoomConfiguration,
    RoomDimensions,
    KitchenConfiguration,
    CatalogProduct,
    PlacedItem,
    Position3D,
    WallSegment,
    WallObstacle,
    UtilityConnection,
)
from ..models.recommendations import (
    SpaceZone,
    SpaceUtilization,
    StorageCapacity,
    AccessibilityAnalysis,
    SpaceConflict,
    SpaceAnalysisRequest,
    WorkflowAnalysis,
    SpaceAnalysisResult,
    WorkTriangle,
    LayoutZone,
)
from ..utils.algorithms import (
    euclidean_distance_2d,
    calculate_triangle_perimeter,
    boxes_overlap_3d,
    calculate_overlap_volume,
    calculate_bounding_box,
    normalize_score,
    weighted_average,
)


@dataclass
class BoundingBox:
    """3D bounding box representation."""
    min_x: float
    min_y: float
    min_z: float
    max_x: float
    max_y: float
    max_z: float

    @property
    def volume(self) -> float:
        return (self.max_x - self.min_x) * (self.max_y - self.min_y) * (self.max_z - self.min_z)

    @property
    def floor_area(self) -> float:
        return (self.max_x - self.min_x) * (self.max_y - self.min_y)

    def overlaps(self, other: "BoundingBox") -> bool:
        return boxes_overlap_3d(
            (self.min_x, self.min_y, self.min_z),
            (self.max_x, self.max_y, self.max_z),
            (other.min_x, other.min_y, other.min_z),
            (other.max_x, other.max_y, other.max_z),
        )

    def overlap_volume(self, other: "BoundingBox") -> float:
        return calculate_overlap_volume(
            (self.min_x, self.min_y, self.min_z),
            (self.max_x, self.max_y, self.max_z),
            (other.min_x, other.min_y, other.min_z),
            (other.max_x, other.max_y, other.max_z),
        )


class SpaceAnalyzer:
    """
    3D space analysis engine for kitchen configurations.

    Analyzes:
    - Space utilization and efficiency
    - Storage capacity
    - Accessibility compliance
    - Workflow optimization
    - Spatial conflicts
    """

    # Accessibility standards (in cm)
    ACCESSIBILITY_STANDARDS = {
        "min_passage_width": 90,  # ADA minimum
        "wheelchair_passage": 120,  # Comfortable wheelchair passage
        "min_work_aisle": 100,
        "max_reach_height": 120,  # Maximum comfortable reach
        "min_reach_height": 40,
        "counter_height_standard": 90,
        "counter_height_wheelchair": 75,
        "knee_clearance_depth": 60,
        "knee_clearance_height": 70,
    }

    # Storage capacity standards (liters per square meter of kitchen)
    STORAGE_STANDARDS = {
        "minimum": 30,
        "adequate": 45,
        "good": 60,
        "excellent": 80,
    }

    def __init__(self):
        """Initialize the space analyzer."""
        pass

    def analyze(self, request: SpaceAnalysisRequest) -> SpaceAnalysisResult:
        """
        Perform comprehensive space analysis.

        Args:
            request: Space analysis request

        Returns:
            Space analysis result
        """
        room = request.room
        configuration = request.configuration
        items = request.items or []

        if configuration:
            items = [item.product for item in configuration.items]

        # Analyze space utilization
        utilization = self._analyze_utilization(room, configuration)

        # Analyze storage capacity
        storage = None
        if request.analyze_storage and configuration:
            storage = self._analyze_storage(room, configuration)

        # Analyze accessibility
        accessibility = None
        if request.analyze_accessibility and configuration:
            accessibility = self._analyze_accessibility(room, configuration)

        # Analyze workflow
        workflow = None
        if request.analyze_workflow and configuration:
            workflow = self._analyze_workflow(room, configuration)

        # Detect spatial conflicts
        conflicts = self._detect_conflicts(configuration) if configuration else []

        # Calculate overall score
        overall_score = self._calculate_overall_score(
            utilization, storage, accessibility, workflow, conflicts
        )

        # Generate summary and recommendations
        summary = self._generate_summary(
            utilization, storage, accessibility, workflow, conflicts
        )
        recommendations = self._generate_recommendations(
            utilization, storage, accessibility, workflow, conflicts
        )

        return SpaceAnalysisResult(
            success=True,
            utilization=utilization,
            storage=storage,
            accessibility=accessibility,
            workflow=workflow,
            conflicts=conflicts,
            overall_score=overall_score,
            summary=summary,
            recommendations=recommendations,
            errors=[],
        )

    def _analyze_utilization(
        self,
        room: RoomConfiguration,
        configuration: Optional[KitchenConfiguration]
    ) -> SpaceUtilization:
        """Analyze space utilization."""
        room_dims = room.dimensions.to_cm()
        total_floor_area = room_dims.width * room_dims.length

        # Calculate usable area (excluding obstacles)
        obstacle_area = self._calculate_obstacle_area(room)
        usable_floor_area = total_floor_area - obstacle_area

        cabinet_footprint = 0.0
        appliance_footprint = 0.0

        if configuration:
            for item in configuration.items:
                bbox = self._get_item_bounding_box(item)
                footprint = bbox.floor_area

                if "cabinet" in item.product.category.lower():
                    cabinet_footprint += footprint
                elif item.product.type.lower() == "appliance":
                    appliance_footprint += footprint

        total_footprint = cabinet_footprint + appliance_footprint
        circulation_area = usable_floor_area - total_footprint

        utilization_percentage = (total_footprint / usable_floor_area * 100) if usable_floor_area > 0 else 0

        # Determine efficiency rating
        if 30 <= utilization_percentage <= 50:
            efficiency_rating = "excellent"
        elif 25 <= utilization_percentage < 30 or 50 < utilization_percentage <= 55:
            efficiency_rating = "good"
        elif 20 <= utilization_percentage < 25 or 55 < utilization_percentage <= 60:
            efficiency_rating = "adequate"
        else:
            efficiency_rating = "poor"

        return SpaceUtilization(
            total_floor_area=total_floor_area,
            usable_floor_area=usable_floor_area,
            cabinet_footprint=cabinet_footprint,
            appliance_footprint=appliance_footprint,
            circulation_area=circulation_area,
            utilization_percentage=utilization_percentage,
            efficiency_rating=efficiency_rating,
        )

    def _calculate_obstacle_area(self, room: RoomConfiguration) -> float:
        """Calculate total floor area occupied by obstacles."""
        obstacle_area = 0.0

        for wall in room.walls:
            for obstacle in wall.obstacles:
                if obstacle.type.value in ["column", "radiator"]:
                    # These occupy floor space
                    obstacle_area += obstacle.width * 30  # Assume 30cm depth

        return obstacle_area

    def _analyze_storage(
        self,
        room: RoomConfiguration,
        configuration: KitchenConfiguration
    ) -> StorageCapacity:
        """Analyze storage capacity."""
        total_volume = 0.0
        cabinet_volume = 0.0
        drawer_volume = 0.0
        pantry_volume = 0.0
        overhead_volume = 0.0

        for item in configuration.items:
            if "cabinet" not in item.product.category.lower():
                continue

            dims = item.product.dimensions
            volume = dims.width * dims.height * dims.depth

            total_volume += volume

            category = item.product.category.lower()
            if "drawer" in category:
                drawer_volume += volume
            elif "pantry" in category or "tall" in category:
                pantry_volume += volume
            elif "wall" in category:
                overhead_volume += volume
            else:
                cabinet_volume += volume

        # Calculate room area for standards comparison
        room_dims = room.dimensions.to_cm()
        room_area_m2 = (room_dims.width * room_dims.length) / 10000  # Convert to m2
        volume_liters = total_volume / 1000  # Convert to liters
        volume_per_m2 = volume_liters / room_area_m2 if room_area_m2 > 0 else 0

        # Determine rating
        if volume_per_m2 >= self.STORAGE_STANDARDS["excellent"]:
            capacity_rating = "excellent"
        elif volume_per_m2 >= self.STORAGE_STANDARDS["good"]:
            capacity_rating = "good"
        elif volume_per_m2 >= self.STORAGE_STANDARDS["adequate"]:
            capacity_rating = "adequate"
        elif volume_per_m2 >= self.STORAGE_STANDARDS["minimum"]:
            capacity_rating = "minimum"
        else:
            capacity_rating = "insufficient"

        # Generate recommendations
        recommendations: List[str] = []
        if capacity_rating in ["minimum", "insufficient"]:
            recommendations.append("Consider adding tall cabinets for additional storage")
            recommendations.append("Install wall cabinets above base cabinets")
        if drawer_volume < total_volume * 0.2:
            recommendations.append("Add more drawer units for better organization")
        if pantry_volume < total_volume * 0.15:
            recommendations.append("Consider a pantry cabinet for dry goods storage")

        return StorageCapacity(
            total_volume=total_volume,
            cabinet_volume=cabinet_volume,
            drawer_volume=drawer_volume,
            pantry_volume=pantry_volume,
            overhead_volume=overhead_volume,
            capacity_rating=capacity_rating,
            recommendations=recommendations,
        )

    def _analyze_accessibility(
        self,
        room: RoomConfiguration,
        configuration: KitchenConfiguration
    ) -> AccessibilityAnalysis:
        """Analyze accessibility compliance."""
        issues: List[str] = []
        recommendations: List[str] = []

        # Check minimum passage widths
        min_passage = self._calculate_minimum_passage(room, configuration)

        wheelchair_accessible = min_passage >= self.ACCESSIBILITY_STANDARDS["wheelchair_passage"]

        if min_passage < self.ACCESSIBILITY_STANDARDS["min_passage_width"]:
            issues.append(f"Passage width ({min_passage:.0f}cm) is below minimum ({self.ACCESSIBILITY_STANDARDS['min_passage_width']}cm)")
            recommendations.append("Reconfigure layout to increase passage width")
        elif min_passage < self.ACCESSIBILITY_STANDARDS["wheelchair_passage"]:
            issues.append(f"Passage width ({min_passage:.0f}cm) may not accommodate wheelchairs")
            recommendations.append("Consider wider passage for wheelchair access")

        # Check counter heights
        counter_heights: Dict[str, float] = {}
        for item in configuration.items:
            if "cabinet" in item.product.category.lower() and "base" in item.product.category.lower():
                height = item.position.z + item.product.dimensions.height
                counter_heights[item.id] = height

        # Check reach zones
        reach_zones: Dict[str, bool] = {
            "lower_zone": True,
            "middle_zone": True,
            "upper_zone": True,
        }

        for item in configuration.items:
            if "wall" in item.product.category.lower():
                top_height = item.position.z + item.product.dimensions.height
                if top_height > self.ACCESSIBILITY_STANDARDS["max_reach_height"] + 50:
                    reach_zones["upper_zone"] = False
                    issues.append("Upper cabinets may be difficult to reach")

        # Calculate compliance score
        compliance_factors = [
            min_passage >= self.ACCESSIBILITY_STANDARDS["min_passage_width"],
            min_passage >= self.ACCESSIBILITY_STANDARDS["min_work_aisle"],
            reach_zones["middle_zone"],
            reach_zones["lower_zone"],
        ]
        compliance_score = sum(compliance_factors) / len(compliance_factors) * 100

        if not wheelchair_accessible:
            recommendations.append("For wheelchair accessibility, ensure 120cm clear passage")
            recommendations.append("Consider lowered counter sections (75cm height)")

        return AccessibilityAnalysis(
            wheelchair_accessible=wheelchair_accessible,
            minimum_passage_width=min_passage,
            counter_heights=counter_heights,
            reach_zones=reach_zones,
            compliance_score=compliance_score,
            issues=issues,
            recommendations=recommendations,
        )

    def _calculate_minimum_passage(
        self,
        room: RoomConfiguration,
        configuration: KitchenConfiguration
    ) -> float:
        """Calculate minimum passage width in the kitchen."""
        room_dims = room.dimensions.to_cm()

        # Get all item positions and sizes
        item_bounds: List[BoundingBox] = []
        for item in configuration.items:
            bbox = self._get_item_bounding_box(item)
            item_bounds.append(bbox)

        # Check passages along X and Y axes
        min_passage = min(room_dims.width, room_dims.length)

        # Sample points to find minimum clear space
        for x in range(0, int(room_dims.width), 20):
            for y in range(0, int(room_dims.length), 20):
                # Find distance to nearest item
                min_dist = float('inf')

                for bbox in item_bounds:
                    # Calculate distance from point to bounding box
                    dx = max(bbox.min_x - x, 0, x - bbox.max_x)
                    dy = max(bbox.min_y - y, 0, y - bbox.max_y)
                    dist = math.sqrt(dx * dx + dy * dy)

                    min_dist = min(min_dist, dist)

                # This is a valid passage width at this point
                if min_dist < min_passage:
                    # Check if this is actually a passage (not in an item)
                    in_item = any(
                        bbox.min_x <= x <= bbox.max_x and bbox.min_y <= y <= bbox.max_y
                        for bbox in item_bounds
                    )
                    if not in_item:
                        min_passage = min_dist

        # Also check between parallel counters/cabinets
        # Find items on opposite walls
        north_items = [b for b in item_bounds if b.max_y > room_dims.length * 0.7]
        south_items = [b for b in item_bounds if b.min_y < room_dims.length * 0.3]

        if north_items and south_items:
            for n_item in north_items:
                for s_item in south_items:
                    passage = n_item.min_y - s_item.max_y
                    if passage > 0:
                        min_passage = min(min_passage, passage)

        return max(0, min_passage)

    def _analyze_workflow(
        self,
        room: RoomConfiguration,
        configuration: KitchenConfiguration
    ) -> WorkflowAnalysis:
        """Analyze workflow efficiency."""
        # Analyze work triangle
        work_triangle = self._analyze_work_triangle(configuration)

        # Identify zones
        zones = self._identify_zones(configuration)

        # Calculate flow efficiency
        flow_efficiency = self._calculate_flow_efficiency(work_triangle, zones)

        # Identify bottlenecks
        bottlenecks = self._identify_bottlenecks(configuration, zones)

        # Generate recommendations
        recommendations = self._generate_workflow_recommendations(
            work_triangle, zones, flow_efficiency, bottlenecks
        )

        return WorkflowAnalysis(
            work_triangle=work_triangle,
            zones=zones,
            flow_efficiency=flow_efficiency,
            bottlenecks=bottlenecks,
            recommendations=recommendations,
        )

    def _analyze_work_triangle(
        self,
        configuration: KitchenConfiguration
    ) -> Optional[WorkTriangle]:
        """Analyze the kitchen work triangle."""
        sink_pos = None
        stove_pos = None
        fridge_pos = None

        for item in configuration.items:
            category = item.product.category.lower()
            if "sink" in category:
                sink_pos = (item.position.x, item.position.y)
            elif "cooktop" in category:
                stove_pos = (item.position.x, item.position.y)
            elif "refrigerator" in category:
                fridge_pos = (item.position.x, item.position.y)

        if not all([sink_pos, stove_pos, fridge_pos]):
            return None

        perimeter = calculate_triangle_perimeter(sink_pos, stove_pos, fridge_pos)

        # Optimal perimeter: 360-660 cm
        is_optimal = 360 <= perimeter <= 660

        # Calculate efficiency score
        if perimeter < 360:
            efficiency = max(0, 100 - (360 - perimeter) * 0.5)
        elif perimeter > 660:
            efficiency = max(0, 100 - (perimeter - 660) * 0.3)
        else:
            # In optimal range - closer to middle is better
            middle = 510
            deviation = abs(perimeter - middle)
            efficiency = 100 - (deviation / 150) * 20

        return WorkTriangle(
            sink_position=Position3D(x=sink_pos[0], y=sink_pos[1], z=0),
            stove_position=Position3D(x=stove_pos[0], y=stove_pos[1], z=0),
            refrigerator_position=Position3D(x=fridge_pos[0], y=fridge_pos[1], z=0),
            perimeter=perimeter,
            is_optimal=is_optimal,
            efficiency_score=efficiency,
        )

    def _identify_zones(self, configuration: KitchenConfiguration) -> List[LayoutZone]:
        """Identify functional zones in the kitchen."""
        zones: List[LayoutZone] = []

        # Group items by function
        zone_items: Dict[SpaceZone, List[PlacedItem]] = {
            SpaceZone.COOKING: [],
            SpaceZone.PREPARATION: [],
            SpaceZone.CLEANING: [],
            SpaceZone.STORAGE: [],
        }

        for item in configuration.items:
            category = item.product.category.lower()
            product_type = item.product.type.lower()

            if any(x in category for x in ["cooktop", "oven", "hood"]):
                zone_items[SpaceZone.COOKING].append(item)
            elif any(x in category for x in ["sink", "dishwasher"]):
                zone_items[SpaceZone.CLEANING].append(item)
            elif any(x in category for x in ["pantry", "tall", "fridge", "refrigerator"]):
                zone_items[SpaceZone.STORAGE].append(item)
            elif "base" in category:
                zone_items[SpaceZone.PREPARATION].append(item)

        # Create zones from item clusters
        for zone_type, items in zone_items.items():
            if not items:
                continue

            # Calculate zone center
            center_x = sum(i.position.x for i in items) / len(items)
            center_y = sum(i.position.y for i in items) / len(items)

            # Calculate zone dimensions (bounding box of items)
            min_x = min(i.position.x - i.product.dimensions.width / 2 for i in items)
            max_x = max(i.position.x + i.product.dimensions.width / 2 for i in items)
            min_y = min(i.position.y - i.product.dimensions.depth / 2 for i in items)
            max_y = max(i.position.y + i.product.dimensions.depth / 2 for i in items)

            zones.append(LayoutZone(
                zone_type=zone_type,
                position=Position3D(x=center_x, y=center_y, z=0),
                width=max_x - min_x,
                depth=max_y - min_y,
                items=[i.id for i in items],
                efficiency_score=80.0,  # Base score
            ))

        return zones

    def _calculate_flow_efficiency(
        self,
        work_triangle: Optional[WorkTriangle],
        zones: List[LayoutZone]
    ) -> float:
        """Calculate overall workflow efficiency."""
        scores: List[float] = []

        # Work triangle contributes 40%
        if work_triangle:
            scores.append(work_triangle.efficiency_score)
        else:
            scores.append(50.0)  # Penalty for missing work triangle

        # Zone organization contributes 30%
        if zones:
            zone_score = sum(z.efficiency_score for z in zones) / len(zones)
            scores.append(zone_score)
        else:
            scores.append(50.0)

        # Zone separation contributes 30%
        separation_score = self._calculate_zone_separation_score(zones)
        scores.append(separation_score)

        return weighted_average(scores, [0.4, 0.3, 0.3])

    def _calculate_zone_separation_score(self, zones: List[LayoutZone]) -> float:
        """Calculate how well zones are separated."""
        if len(zones) < 2:
            return 80.0

        score = 100.0

        # Check for overlapping zones (bad)
        for i, z1 in enumerate(zones):
            for z2 in zones[i + 1:]:
                dist = euclidean_distance_2d(
                    (z1.position.x, z1.position.y),
                    (z2.position.x, z2.position.y)
                )

                # Zones should have some separation
                min_separation = (z1.width + z2.width) / 4
                if dist < min_separation:
                    score -= 10

        return max(0, score)

    def _identify_bottlenecks(
        self,
        configuration: KitchenConfiguration,
        zones: List[LayoutZone]
    ) -> List[str]:
        """Identify workflow bottlenecks."""
        bottlenecks: List[str] = []

        # Check for crowded areas
        item_positions = [(i.position.x, i.position.y) for i in configuration.items]

        for i, pos1 in enumerate(item_positions):
            nearby_count = sum(
                1 for pos2 in item_positions[i + 1:]
                if euclidean_distance_2d(pos1, pos2) < 60
            )
            if nearby_count > 2:
                bottlenecks.append(
                    f"Crowded area near position ({pos1[0]:.0f}, {pos1[1]:.0f})"
                )
                break  # Only report one

        # Check for blocked zones
        for zone in zones:
            if zone.zone_type == SpaceZone.COOKING:
                # Cooking zone needs clear access
                blocking_items = sum(
                    1 for item in configuration.items
                    if euclidean_distance_2d(
                        (item.position.x, item.position.y),
                        (zone.position.x, zone.position.y)
                    ) < 80 and "cabinet" not in item.product.category.lower()
                )
                if blocking_items > 0:
                    bottlenecks.append("Cooking zone may have obstructed access")

        return bottlenecks

    def _generate_workflow_recommendations(
        self,
        work_triangle: Optional[WorkTriangle],
        zones: List[LayoutZone],
        flow_efficiency: float,
        bottlenecks: List[str]
    ) -> List[str]:
        """Generate workflow improvement recommendations."""
        recommendations: List[str] = []

        if work_triangle:
            if work_triangle.perimeter < 360:
                recommendations.append(
                    "Work triangle is too compact. Consider spreading out sink, stove, and refrigerator."
                )
            elif work_triangle.perimeter > 660:
                recommendations.append(
                    "Work triangle is too large. Consider moving key appliances closer together."
                )
            elif work_triangle.is_optimal:
                recommendations.append(
                    "Work triangle is optimally sized for efficient cooking workflow."
                )
        else:
            recommendations.append(
                "Ensure sink, cooktop, and refrigerator form a functional work triangle."
            )

        if bottlenecks:
            recommendations.append(
                "Consider rearranging items to eliminate bottlenecks."
            )

        if flow_efficiency < 70:
            recommendations.append(
                "Overall workflow could be improved with better zone organization."
            )

        return recommendations

    def _detect_conflicts(
        self,
        configuration: Optional[KitchenConfiguration]
    ) -> List[SpaceConflict]:
        """Detect spatial conflicts between items."""
        if not configuration:
            return []

        conflicts: List[SpaceConflict] = []
        items = configuration.items

        for i, item1 in enumerate(items):
            bbox1 = self._get_item_bounding_box(item1)

            for item2 in items[i + 1:]:
                bbox2 = self._get_item_bounding_box(item2)

                if bbox1.overlaps(bbox2):
                    overlap = bbox1.overlap_volume(bbox2)

                    # Determine conflict type and severity
                    if overlap > 1000:  # Significant overlap
                        conflict_type = "physical_overlap"
                        severity = "high"
                    elif overlap > 100:
                        conflict_type = "minor_overlap"
                        severity = "medium"
                    else:
                        conflict_type = "touch_conflict"
                        severity = "low"

                    conflicts.append(SpaceConflict(
                        item1_id=item1.id,
                        item2_id=item2.id,
                        conflict_type=conflict_type,
                        overlap_volume=overlap,
                        severity=severity,
                        resolution_suggestion=self._suggest_conflict_resolution(
                            item1, item2, overlap
                        ),
                    ))

        return conflicts

    def _suggest_conflict_resolution(
        self,
        item1: PlacedItem,
        item2: PlacedItem,
        overlap: float
    ) -> str:
        """Suggest resolution for a spatial conflict."""
        if overlap > 1000:
            return f"Move {item1.product.name} or {item2.product.name} to eliminate significant overlap"
        elif overlap > 100:
            return f"Adjust position of {item1.product.name} slightly to prevent overlap"
        else:
            return "Minor adjustment may improve fit"

    def _get_item_bounding_box(self, item: PlacedItem) -> BoundingBox:
        """Get bounding box for a placed item."""
        dims = item.product.dimensions
        pos = item.position

        # Account for rotation
        if item.rotation in [90, 270]:
            w, d = dims.depth, dims.width
        else:
            w, d = dims.width, dims.depth

        return BoundingBox(
            min_x=pos.x - w / 2,
            min_y=pos.y - d / 2,
            min_z=pos.z,
            max_x=pos.x + w / 2,
            max_y=pos.y + d / 2,
            max_z=pos.z + dims.height,
        )

    def _calculate_overall_score(
        self,
        utilization: SpaceUtilization,
        storage: Optional[StorageCapacity],
        accessibility: Optional[AccessibilityAnalysis],
        workflow: Optional[WorkflowAnalysis],
        conflicts: List[SpaceConflict]
    ) -> float:
        """Calculate overall space analysis score."""
        scores: List[float] = []
        weights: List[float] = []

        # Utilization score (based on efficiency rating)
        utilization_scores = {
            "excellent": 100,
            "good": 80,
            "adequate": 60,
            "poor": 40,
        }
        scores.append(utilization_scores.get(utilization.efficiency_rating, 50))
        weights.append(0.25)

        # Storage score
        if storage:
            storage_scores = {
                "excellent": 100,
                "good": 85,
                "adequate": 70,
                "minimum": 55,
                "insufficient": 30,
            }
            scores.append(storage_scores.get(storage.capacity_rating, 50))
            weights.append(0.20)

        # Accessibility score
        if accessibility:
            scores.append(accessibility.compliance_score)
            weights.append(0.20)

        # Workflow score
        if workflow:
            scores.append(workflow.flow_efficiency)
            weights.append(0.25)

        # Conflict penalty
        if conflicts:
            high_conflicts = sum(1 for c in conflicts if c.severity == "high")
            medium_conflicts = sum(1 for c in conflicts if c.severity == "medium")
            conflict_penalty = high_conflicts * 15 + medium_conflicts * 5
            conflict_score = max(0, 100 - conflict_penalty)
            scores.append(conflict_score)
            weights.append(0.10)

        return weighted_average(scores, weights) if scores else 50.0

    def _generate_summary(
        self,
        utilization: SpaceUtilization,
        storage: Optional[StorageCapacity],
        accessibility: Optional[AccessibilityAnalysis],
        workflow: Optional[WorkflowAnalysis],
        conflicts: List[SpaceConflict]
    ) -> str:
        """Generate analysis summary."""
        parts: List[str] = []

        parts.append(
            f"Space utilization is {utilization.efficiency_rating} "
            f"at {utilization.utilization_percentage:.1f}%."
        )

        if storage:
            parts.append(f"Storage capacity is rated as {storage.capacity_rating}.")

        if accessibility:
            if accessibility.wheelchair_accessible:
                parts.append("Layout is wheelchair accessible.")
            else:
                parts.append("Layout may need adjustments for wheelchair accessibility.")

        if workflow:
            if workflow.flow_efficiency >= 80:
                parts.append("Workflow efficiency is excellent.")
            elif workflow.flow_efficiency >= 60:
                parts.append("Workflow efficiency is good with room for improvement.")
            else:
                parts.append("Workflow efficiency needs attention.")

        if conflicts:
            parts.append(f"Found {len(conflicts)} spatial conflict(s) to resolve.")

        return " ".join(parts)

    def _generate_recommendations(
        self,
        utilization: SpaceUtilization,
        storage: Optional[StorageCapacity],
        accessibility: Optional[AccessibilityAnalysis],
        workflow: Optional[WorkflowAnalysis],
        conflicts: List[SpaceConflict]
    ) -> List[str]:
        """Generate overall recommendations."""
        recommendations: List[str] = []

        # Utilization recommendations
        if utilization.efficiency_rating == "poor":
            if utilization.utilization_percentage < 25:
                recommendations.append(
                    "Consider adding more cabinets or a kitchen island to better utilize space."
                )
            else:
                recommendations.append(
                    "Kitchen may be overcrowded. Consider removing non-essential items."
                )

        # Storage recommendations
        if storage and storage.recommendations:
            recommendations.extend(storage.recommendations[:2])

        # Accessibility recommendations
        if accessibility and accessibility.recommendations:
            recommendations.extend(accessibility.recommendations[:2])

        # Workflow recommendations
        if workflow and workflow.recommendations:
            recommendations.extend(workflow.recommendations[:2])

        # Conflict recommendations
        for conflict in conflicts[:2]:
            if conflict.resolution_suggestion:
                recommendations.append(conflict.resolution_suggestion)

        return recommendations[:6]  # Limit to 6 recommendations
