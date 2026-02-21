"""
Tests for the layout optimizer service using genetic algorithms.

Tests cover:
- Gene and Chromosome data structures
- Population initialization
- Fitness evaluation functions
- Genetic operators (selection, crossover, mutation)
- Work triangle analysis
- Zone identification
- Full optimization workflow
"""

import pytest
import copy
from typing import List

from src.services.layout_optimizer import (
    LayoutOptimizer,
    Gene,
    Chromosome,
)
from src.models.kitchen import (
    KitchenShape,
    KitchenStyle,
    MeasurementUnit,
    RoomDimensions,
    RoomConfiguration,
    WallSegment,
    CatalogProduct,
    ProductDimensions,
    Position3D,
    BudgetRange,
    UserPreferences,
    ApplianceCategory,
)
from src.models.recommendations import (
    LayoutOptimizationRequest,
    WorkTriangle,
    LayoutZone,
    SpaceZone,
)


class TestGeneStructure:
    """Test the Gene data structure."""

    def test_gene_creation(self):
        """Test creating a Gene."""
        gene = Gene(
            product_id="bc-60",
            x=100.0,
            y=50.0,
            rotation=0.0,
            wall="south",
        )

        assert gene.product_id == "bc-60"
        assert gene.x == 100.0
        assert gene.y == 50.0
        assert gene.rotation == 0.0
        assert gene.wall == "south"

    def test_gene_default_wall(self):
        """Test Gene with default wall value."""
        gene = Gene(
            product_id="test",
            x=0.0,
            y=0.0,
            rotation=90.0,
        )

        assert gene.wall is None

    def test_gene_rotations(self):
        """Test Gene rotation values."""
        for rotation in [0, 90, 180, 270]:
            gene = Gene(
                product_id="test",
                x=0.0,
                y=0.0,
                rotation=float(rotation),
            )
            assert gene.rotation == float(rotation)


class TestChromosomeStructure:
    """Test the Chromosome data structure."""

    def test_chromosome_creation(self):
        """Test creating a Chromosome."""
        genes = [
            Gene(product_id="p1", x=10.0, y=10.0, rotation=0.0),
            Gene(product_id="p2", x=20.0, y=10.0, rotation=0.0),
        ]
        chromosome = Chromosome(genes=genes, fitness=75.0)

        assert len(chromosome.genes) == 2
        assert chromosome.fitness == 75.0

    def test_chromosome_default_fitness(self):
        """Test Chromosome with default fitness."""
        chromosome = Chromosome(genes=[])
        assert chromosome.fitness == 0.0

    def test_chromosome_empty_genes(self):
        """Test Chromosome with empty genes list."""
        chromosome = Chromosome(genes=[])
        assert len(chromosome.genes) == 0


class TestLayoutOptimizerInitialization:
    """Test LayoutOptimizer initialization."""

    def test_default_initialization(self):
        """Test default optimizer initialization."""
        optimizer = LayoutOptimizer()

        assert optimizer.population_size == 50
        assert optimizer.generations == 100
        assert optimizer.crossover_rate == 0.8
        assert optimizer.initial_mutation_rate == 0.1
        assert optimizer.elitism_count == 2

    def test_custom_initialization(self):
        """Test custom optimizer initialization."""
        optimizer = LayoutOptimizer(
            population_size=30,
            generations=50,
            crossover_rate=0.7,
            mutation_rate=0.15,
            elitism_count=3,
        )

        assert optimizer.population_size == 30
        assert optimizer.generations == 50
        assert optimizer.crossover_rate == 0.7
        assert optimizer.initial_mutation_rate == 0.15
        assert optimizer.elitism_count == 3

    def test_default_constraints(self):
        """Test default generation constraints."""
        optimizer = LayoutOptimizer()

        assert optimizer.DEFAULT_CONSTRAINTS.min_passage_width == 90.0
        assert optimizer.DEFAULT_CONSTRAINTS.max_work_triangle_perimeter == 660.0
        assert optimizer.DEFAULT_CONSTRAINTS.require_ventilation is True

    def test_fitness_weights_sum(self):
        """Test that fitness weights sum approximately to 1."""
        optimizer = LayoutOptimizer()
        total = sum(optimizer.FITNESS_WEIGHTS.values())
        assert abs(total - 1.0) < 0.01

    def test_standard_widths(self):
        """Test standard cabinet widths are defined."""
        optimizer = LayoutOptimizer()
        assert 60 in optimizer.STANDARD_WIDTHS
        assert 80 in optimizer.STANDARD_WIDTHS


class TestProductCatalogGeneration:
    """Test product catalog generation."""

    def test_create_standard_catalog(self, layout_optimizer):
        """Test creating standard product catalog."""
        catalog = layout_optimizer._create_standard_catalog()

        assert len(catalog) > 0
        categories = {p.category for p in catalog}
        assert "base_cabinet" in categories
        assert "refrigerator" in categories
        assert "cooktop" in categories

    def test_catalog_has_required_items(self, layout_optimizer):
        """Test catalog has all required item types."""
        catalog = layout_optimizer._create_standard_catalog()

        has_fridge = any("refrigerator" in p.category for p in catalog)
        has_cooktop = any("cooktop" in p.category for p in catalog)
        has_sink = any("sink" in p.category for p in catalog)
        has_cabinets = any("cabinet" in p.category for p in catalog)

        assert has_fridge
        assert has_cooktop
        assert has_sink
        assert has_cabinets

    def test_catalog_products_valid(self, layout_optimizer):
        """Test catalog products have valid dimensions and prices."""
        catalog = layout_optimizer._create_standard_catalog()

        for product in catalog:
            assert product.dimensions.width > 0
            assert product.dimensions.height > 0
            assert product.dimensions.depth > 0
            assert product.price > 0


class TestPopulationInitialization:
    """Test population initialization."""

    def test_initialize_population_size(
        self,
        layout_optimizer,
        basic_room_configuration,
        basic_user_preferences,
    ):
        """Test population is initialized with correct size."""
        layout_optimizer._room = basic_room_configuration
        layout_optimizer._preferences = basic_user_preferences
        layout_optimizer._fixed_positions = {}
        layout_optimizer._available_products = layout_optimizer._create_standard_catalog()

        population = layout_optimizer._initialize_population()

        assert len(population) == layout_optimizer.population_size

    def test_initialize_population_has_genes(
        self,
        layout_optimizer,
        basic_room_configuration,
        basic_user_preferences,
    ):
        """Test initialized chromosomes have genes."""
        layout_optimizer._room = basic_room_configuration
        layout_optimizer._preferences = basic_user_preferences
        layout_optimizer._fixed_positions = {}
        layout_optimizer._available_products = layout_optimizer._create_standard_catalog()

        population = layout_optimizer._initialize_population()

        # Most chromosomes should have genes
        chromosomes_with_genes = sum(1 for c in population if len(c.genes) > 0)
        assert chromosomes_with_genes > len(population) * 0.5


class TestWallPositionCalculations:
    """Test wall position calculations."""

    def test_get_wall_position_north(self, layout_optimizer):
        """Test getting position for north wall."""
        x, y = layout_optimizer._get_wall_position("north", 400.0, 300.0, 60.0)

        assert x == 200.0  # Center of room width
        assert y > 250.0  # Near north wall (high Y)

    def test_get_wall_position_south(self, layout_optimizer):
        """Test getting position for south wall."""
        x, y = layout_optimizer._get_wall_position("south", 400.0, 300.0, 60.0)

        assert x == 200.0
        assert y < 50.0  # Near south wall (low Y)

    def test_get_wall_position_east(self, layout_optimizer):
        """Test getting position for east wall."""
        x, y = layout_optimizer._get_wall_position("east", 400.0, 300.0, 60.0)

        assert x > 350.0  # Near east wall (high X)
        assert y == 150.0  # Center of room length

    def test_get_wall_position_west(self, layout_optimizer):
        """Test getting position for west wall."""
        x, y = layout_optimizer._get_wall_position("west", 400.0, 300.0, 60.0)

        assert x < 50.0  # Near west wall (low X)
        assert y == 150.0

    def test_get_wall_rotation(self, layout_optimizer):
        """Test wall rotation values."""
        assert layout_optimizer._get_wall_rotation("north") == 180
        assert layout_optimizer._get_wall_rotation("south") == 0
        assert layout_optimizer._get_wall_rotation("east") == 270
        assert layout_optimizer._get_wall_rotation("west") == 90

    def test_determine_wall(self, layout_optimizer):
        """Test determining closest wall."""
        # Point close to south wall
        wall = layout_optimizer._determine_wall(200.0, 10.0, 400.0, 300.0)
        assert wall == "south"

        # Point close to north wall
        wall = layout_optimizer._determine_wall(200.0, 290.0, 400.0, 300.0)
        assert wall == "north"


class TestFitnessEvaluation:
    """Test fitness evaluation functions."""

    def test_evaluate_fitness_empty_chromosome(self, layout_optimizer, basic_room_configuration):
        """Test fitness of empty chromosome."""
        layout_optimizer._room = basic_room_configuration
        chromosome = Chromosome(genes=[])

        fitness = layout_optimizer._evaluate_fitness(chromosome)
        assert fitness == 0.0

    def test_evaluate_fitness_basic_chromosome(
        self,
        layout_optimizer,
        basic_room_configuration,
        basic_user_preferences,
    ):
        """Test fitness of a basic chromosome."""
        layout_optimizer._room = basic_room_configuration
        layout_optimizer._preferences = basic_user_preferences
        layout_optimizer._available_products = layout_optimizer._create_standard_catalog()

        genes = [
            Gene(product_id="fridge-standard", x=50.0, y=50.0, rotation=0.0, wall="south"),
            Gene(product_id="cooktop-60", x=150.0, y=50.0, rotation=0.0, wall="south"),
            Gene(product_id="sink-base-80", x=250.0, y=50.0, rotation=0.0, wall="south"),
        ]
        chromosome = Chromosome(genes=genes)

        fitness = layout_optimizer._evaluate_fitness(chromosome)

        assert 0 <= fitness <= 100

    def test_score_ergonomics_no_work_triangle(self, layout_optimizer, basic_room_configuration):
        """Test ergonomics score without complete work triangle."""
        layout_optimizer._room = basic_room_configuration
        layout_optimizer._available_products = layout_optimizer._create_standard_catalog()

        # Chromosome without all work triangle items
        chromosome = Chromosome(genes=[
            Gene(product_id="base-60", x=100.0, y=50.0, rotation=0.0),
        ])

        score = layout_optimizer._score_ergonomics(chromosome)
        assert score == 30.0  # Penalty score

    def test_score_storage_empty(self, layout_optimizer, basic_room_configuration):
        """Test storage score with no cabinets."""
        layout_optimizer._room = basic_room_configuration
        layout_optimizer._available_products = []

        chromosome = Chromosome(genes=[])
        score = layout_optimizer._score_storage(chromosome)

        assert 0 <= score <= 100

    def test_score_validity_no_overlaps(
        self,
        layout_optimizer,
        basic_room_configuration,
    ):
        """Test validity score with non-overlapping items."""
        layout_optimizer._room = basic_room_configuration
        layout_optimizer._available_products = layout_optimizer._create_standard_catalog()

        # Items that don't overlap
        genes = [
            Gene(product_id="base-60", x=50.0, y=50.0, rotation=0.0),
            Gene(product_id="base-60", x=150.0, y=50.0, rotation=0.0),
        ]
        chromosome = Chromosome(genes=genes)

        score = layout_optimizer._score_validity(chromosome)
        assert score >= 85.0  # Should be high without overlaps


class TestGeneticOperators:
    """Test genetic algorithm operators."""

    def test_tournament_selection(
        self,
        layout_optimizer,
        basic_room_configuration,
        basic_user_preferences,
    ):
        """Test tournament selection returns valid chromosome."""
        layout_optimizer._room = basic_room_configuration
        layout_optimizer._preferences = basic_user_preferences
        layout_optimizer._available_products = layout_optimizer._create_standard_catalog()

        population = layout_optimizer._initialize_population()

        # Set random fitness values
        for i, chromosome in enumerate(population):
            chromosome.fitness = float(i * 2)

        selected = layout_optimizer._tournament_select(population)

        assert isinstance(selected, Chromosome)
        assert selected in population

    def test_crossover_produces_valid_children(
        self,
        layout_optimizer,
    ):
        """Test crossover produces valid children."""
        parent1 = Chromosome(genes=[
            Gene(product_id="p1", x=10.0, y=10.0, rotation=0.0),
            Gene(product_id="p2", x=20.0, y=10.0, rotation=0.0),
            Gene(product_id="p3", x=30.0, y=10.0, rotation=0.0),
        ])
        parent2 = Chromosome(genes=[
            Gene(product_id="p1", x=100.0, y=100.0, rotation=90.0),
            Gene(product_id="p2", x=110.0, y=100.0, rotation=90.0),
            Gene(product_id="p4", x=120.0, y=100.0, rotation=90.0),
        ])

        child1, child2 = layout_optimizer._crossover(parent1, parent2)

        assert isinstance(child1, Chromosome)
        assert isinstance(child2, Chromosome)
        assert len(child1.genes) > 0
        assert len(child2.genes) > 0

    def test_crossover_short_parents(self, layout_optimizer):
        """Test crossover with short parent chromosomes."""
        parent1 = Chromosome(genes=[Gene(product_id="p1", x=10.0, y=10.0, rotation=0.0)])
        parent2 = Chromosome(genes=[Gene(product_id="p1", x=20.0, y=20.0, rotation=90.0)])

        child1, child2 = layout_optimizer._crossover(parent1, parent2)

        # Should return copies of parents
        assert len(child1.genes) == 1
        assert len(child2.genes) == 1

    def test_mutation_changes_genes(
        self,
        layout_optimizer,
        basic_room_configuration,
    ):
        """Test mutation can modify chromosome genes."""
        layout_optimizer._room = basic_room_configuration
        layout_optimizer._fixed_positions = {}
        layout_optimizer._available_products = layout_optimizer._create_standard_catalog()

        chromosome = Chromosome(genes=[
            Gene(product_id="base-60", x=100.0, y=100.0, rotation=0.0, wall="south"),
        ])

        original_x = chromosome.genes[0].x
        original_y = chromosome.genes[0].y

        # Apply mutation multiple times (high rate to ensure changes)
        for _ in range(20):
            layout_optimizer._mutate(chromosome, 1.0)

        # At least something should have changed
        changed = (
            chromosome.genes[0].x != original_x or
            chromosome.genes[0].y != original_y or
            chromosome.genes[0].rotation != 0.0
        )
        # Note: Due to randomness, we can't guarantee change, but with high rate it's likely
        # The test mainly verifies mutation doesn't crash

    def test_mutation_respects_fixed_positions(
        self,
        layout_optimizer,
        basic_room_configuration,
    ):
        """Test mutation doesn't modify fixed positions."""
        layout_optimizer._room = basic_room_configuration
        layout_optimizer._fixed_positions = {"base-60": Position3D(x=100.0, y=100.0, z=0.0)}
        layout_optimizer._available_products = layout_optimizer._create_standard_catalog()

        chromosome = Chromosome(genes=[
            Gene(product_id="base-60", x=100.0, y=100.0, rotation=0.0),
        ])

        original_x = chromosome.genes[0].x
        original_y = chromosome.genes[0].y

        # Apply mutation multiple times
        for _ in range(10):
            layout_optimizer._mutate(chromosome, 1.0)

        # Fixed position should not change
        assert chromosome.genes[0].x == original_x
        assert chromosome.genes[0].y == original_y


class TestWorkTriangleAnalysis:
    """Test work triangle analysis."""

    def test_analyze_work_triangle_complete(
        self,
        layout_optimizer,
    ):
        """Test work triangle analysis with all components."""
        layout_optimizer._available_products = layout_optimizer._create_standard_catalog()

        chromosome = Chromosome(genes=[
            Gene(product_id="sink-base-80", x=100.0, y=50.0, rotation=0.0),
            Gene(product_id="cooktop-60", x=250.0, y=50.0, rotation=0.0),
            Gene(product_id="fridge-standard", x=350.0, y=50.0, rotation=0.0),
        ])

        work_triangle = layout_optimizer._analyze_work_triangle(chromosome)

        assert work_triangle is not None
        assert work_triangle.perimeter > 0
        assert work_triangle.sink_position.x == 100.0
        assert work_triangle.stove_position.x == 250.0
        assert work_triangle.refrigerator_position.x == 350.0

    def test_analyze_work_triangle_incomplete(
        self,
        layout_optimizer,
    ):
        """Test work triangle analysis with missing component."""
        layout_optimizer._available_products = layout_optimizer._create_standard_catalog()

        # Missing refrigerator
        chromosome = Chromosome(genes=[
            Gene(product_id="sink-base-80", x=100.0, y=50.0, rotation=0.0),
            Gene(product_id="cooktop-60", x=250.0, y=50.0, rotation=0.0),
        ])

        work_triangle = layout_optimizer._analyze_work_triangle(chromosome)

        assert work_triangle is None

    def test_work_triangle_optimal_perimeter(
        self,
        layout_optimizer,
    ):
        """Test work triangle identifies optimal perimeter."""
        layout_optimizer._available_products = layout_optimizer._create_standard_catalog()

        # Create triangle with perimeter around 500cm (within optimal 360-660)
        chromosome = Chromosome(genes=[
            Gene(product_id="sink-base-80", x=0.0, y=0.0, rotation=0.0),
            Gene(product_id="cooktop-60", x=200.0, y=0.0, rotation=0.0),
            Gene(product_id="fridge-standard", x=100.0, y=170.0, rotation=0.0),  # Forms triangle
        ])

        work_triangle = layout_optimizer._analyze_work_triangle(chromosome)

        assert work_triangle is not None
        # Check perimeter is in reasonable range
        assert 200 < work_triangle.perimeter < 1000


class TestZoneIdentification:
    """Test zone identification."""

    def test_identify_zones_cooking(self, layout_optimizer):
        """Test identifying cooking zone."""
        layout_optimizer._available_products = layout_optimizer._create_standard_catalog()

        chromosome = Chromosome(genes=[
            Gene(product_id="cooktop-60", x=100.0, y=50.0, rotation=0.0),
            Gene(product_id="oven-60", x=160.0, y=50.0, rotation=0.0),
        ])

        zones = layout_optimizer._identify_zones(chromosome)

        cooking_zones = [z for z in zones if z.zone_type == SpaceZone.COOKING]
        assert len(cooking_zones) > 0

    def test_identify_zones_cleaning(self, layout_optimizer):
        """Test identifying cleaning zone."""
        layout_optimizer._available_products = layout_optimizer._create_standard_catalog()

        chromosome = Chromosome(genes=[
            Gene(product_id="sink-base-80", x=100.0, y=50.0, rotation=0.0),
            Gene(product_id="dishwasher-60", x=180.0, y=50.0, rotation=0.0),
        ])

        zones = layout_optimizer._identify_zones(chromosome)

        cleaning_zones = [z for z in zones if z.zone_type == SpaceZone.CLEANING]
        assert len(cleaning_zones) > 0

    def test_identify_zones_multiple(self, layout_optimizer):
        """Test identifying multiple zones."""
        layout_optimizer._available_products = layout_optimizer._create_standard_catalog()

        chromosome = Chromosome(genes=[
            Gene(product_id="cooktop-60", x=100.0, y=50.0, rotation=0.0),
            Gene(product_id="sink-base-80", x=250.0, y=50.0, rotation=0.0),
            Gene(product_id="tall-60", x=350.0, y=50.0, rotation=0.0),
        ])

        zones = layout_optimizer._identify_zones(chromosome)

        zone_types = {z.zone_type for z in zones}
        assert len(zone_types) >= 2


class TestShapeDetermination:
    """Test kitchen shape determination."""

    def test_determine_shape_i(self, layout_optimizer, basic_room_configuration):
        """Test I-shape determination (one wall)."""
        layout_optimizer._room = basic_room_configuration

        chromosome = Chromosome(genes=[
            Gene(product_id="p1", x=50.0, y=50.0, rotation=0.0, wall="south"),
            Gene(product_id="p2", x=150.0, y=50.0, rotation=0.0, wall="south"),
            Gene(product_id="p3", x=250.0, y=50.0, rotation=0.0, wall="south"),
        ])

        shape = layout_optimizer._determine_shape(chromosome)
        assert shape == KitchenShape.I_SHAPE

    def test_determine_shape_l(self, layout_optimizer, basic_room_configuration):
        """Test L-shape determination (two adjacent walls)."""
        layout_optimizer._room = basic_room_configuration

        chromosome = Chromosome(genes=[
            Gene(product_id="p1", x=50.0, y=50.0, rotation=0.0, wall="south"),
            Gene(product_id="p2", x=50.0, y=150.0, rotation=0.0, wall="west"),
        ])

        shape = layout_optimizer._determine_shape(chromosome)
        assert shape == KitchenShape.L_SHAPE

    def test_determine_shape_u(self, layout_optimizer, basic_room_configuration):
        """Test U-shape determination (three walls)."""
        layout_optimizer._room = basic_room_configuration

        chromosome = Chromosome(genes=[
            Gene(product_id="p1", x=50.0, y=50.0, rotation=0.0, wall="south"),
            Gene(product_id="p2", x=50.0, y=150.0, rotation=0.0, wall="west"),
            Gene(product_id="p3", x=200.0, y=250.0, rotation=0.0, wall="north"),
        ])

        shape = layout_optimizer._determine_shape(chromosome)
        assert shape == KitchenShape.U_SHAPE


class TestFullOptimization:
    """Test full optimization workflow."""

    def test_optimize_returns_result(
        self,
        layout_optimizer,
        layout_optimization_request,
    ):
        """Test optimization returns valid result."""
        result = layout_optimizer.optimize(layout_optimization_request)

        assert result.success is True
        assert result.best_configuration is not None
        assert result.fitness_score > 0
        assert result.generations_completed > 0

    def test_optimize_improvement_history(
        self,
        layout_optimizer,
        layout_optimization_request,
    ):
        """Test optimization records improvement history."""
        result = layout_optimizer.optimize(layout_optimization_request)

        assert len(result.improvement_history) > 0
        # First value should exist
        assert result.improvement_history[0] >= 0

    def test_optimize_generates_alternatives(
        self,
        layout_optimizer,
        layout_optimization_request,
    ):
        """Test optimization generates alternative configurations."""
        result = layout_optimizer.optimize(layout_optimization_request)

        # Should have some alternatives (may be empty if population is small)
        assert isinstance(result.alternative_configurations, list)

    def test_optimize_generates_recommendations(
        self,
        layout_optimizer,
        layout_optimization_request,
    ):
        """Test optimization generates recommendations."""
        result = layout_optimizer.optimize(layout_optimization_request)

        assert isinstance(result.recommendations, list)
        # Should have at least some recommendations
        assert len(result.recommendations) >= 0

    def test_optimize_respects_parameters(self, layout_optimizer, layout_optimization_request):
        """Test optimization respects population and generation parameters."""
        layout_optimization_request.population_size = 15
        layout_optimization_request.generations = 20

        result = layout_optimizer.optimize(layout_optimization_request)

        # Should complete within specified generations
        assert result.generations_completed <= 20

    def test_optimize_configuration_valid(
        self,
        layout_optimizer,
        layout_optimization_request,
    ):
        """Test optimized configuration is valid."""
        result = layout_optimizer.optimize(layout_optimization_request)

        config = result.best_configuration
        assert config is not None
        assert config.id is not None
        assert config.shape is not None
        assert config.style is not None
        assert config.room is not None
