"""
Kitchen layout optimizer using genetic algorithms.
Optimizes kitchen configurations for ergonomics, workflow, and space utilization.
"""

import random
import uuid
import copy
from typing import List, Tuple, Dict, Optional, Any
from dataclasses import dataclass
import numpy as np

from ..models.kitchen import (
    KitchenShape,
    KitchenStyle,
    CabinetType,
    ApplianceCategory,
    RoomConfiguration,
    UserPreferences,
    GenerationConstraints,
    CatalogProduct,
    ProductDimensions,
    Position3D,
    PlacedItem,
    KitchenConfiguration,
    ConfigurationScore,
    ValidationResult,
    ValidationError,
    ValidationWarning,
    PricingSummary,
    MeasurementUnit,
)
from ..models.recommendations import (
    LayoutOptimizationRequest,
    LayoutOptimizationResult,
    WorkTriangle,
    LayoutZone,
    SpaceZone,
)
from ..utils.algorithms import (
    euclidean_distance_2d,
    calculate_triangle_perimeter,
    boxes_overlap_3d,
    calculate_bounding_box,
    normalize_score,
    weighted_average,
    tournament_selection,
    two_point_crossover,
    gaussian_mutation,
    adaptive_mutation_rate,
    detect_convergence,
)


@dataclass
class Gene:
    """A gene representing an item placement."""
    product_id: str
    x: float
    y: float
    rotation: float
    wall: Optional[str] = None


@dataclass
class Chromosome:
    """A chromosome representing a complete kitchen layout."""
    genes: List[Gene]
    fitness: float = 0.0


class LayoutOptimizer:
    """
    Genetic algorithm-based kitchen layout optimizer.

    Optimizes placement of cabinets and appliances to maximize:
    - Ergonomics (work triangle efficiency)
    - Storage capacity
    - Workflow efficiency
    - Space utilization
    """

    DEFAULT_CONSTRAINTS = GenerationConstraints(
        min_passage_width=90.0,
        max_work_triangle_perimeter=660.0,
        min_cooktop_sink_distance=60.0,
        max_cooktop_sink_distance=180.0,
        require_ventilation=True,
    )

    # Standard cabinet dimensions (width in cm)
    STANDARD_WIDTHS = [30, 40, 45, 50, 60, 80, 90, 100, 120]

    # Fitness weights
    FITNESS_WEIGHTS = {
        "ergonomics": 0.25,
        "storage": 0.20,
        "workflow": 0.20,
        "space_utilization": 0.15,
        "aesthetics": 0.10,
        "validity": 0.10,
    }

    def __init__(
        self,
        population_size: int = 50,
        generations: int = 100,
        crossover_rate: float = 0.8,
        mutation_rate: float = 0.1,
        elitism_count: int = 2,
    ):
        """
        Initialize the layout optimizer.

        Args:
            population_size: Number of individuals in population
            generations: Maximum number of generations
            crossover_rate: Probability of crossover
            mutation_rate: Initial mutation rate
            elitism_count: Number of elite individuals to preserve
        """
        self.population_size = population_size
        self.generations = generations
        self.crossover_rate = crossover_rate
        self.initial_mutation_rate = mutation_rate
        self.elitism_count = elitism_count

        self._room: Optional[RoomConfiguration] = None
        self._preferences: Optional[UserPreferences] = None
        self._constraints: GenerationConstraints = self.DEFAULT_CONSTRAINTS
        self._available_products: List[CatalogProduct] = []
        self._fixed_positions: Dict[str, Position3D] = {}

    def optimize(self, request: LayoutOptimizationRequest) -> LayoutOptimizationResult:
        """
        Run layout optimization using genetic algorithm.

        Args:
            request: Layout optimization request

        Returns:
            Layout optimization result
        """
        self._room = request.room
        self._preferences = request.preferences
        self._fixed_positions = request.fixed_positions
        self._available_products = self._generate_product_catalog(request.existing_items)

        if request.population_size:
            self.population_size = request.population_size
        if request.generations:
            self.generations = request.generations

        # Initialize population
        population = self._initialize_population()

        # Evaluate initial population
        for chromosome in population:
            chromosome.fitness = self._evaluate_fitness(chromosome)

        improvement_history: List[float] = []
        best_fitness_ever = max(c.fitness for c in population)
        convergence_generation = 0

        # Evolution loop
        for generation in range(self.generations):
            # Sort by fitness (descending)
            population.sort(key=lambda c: c.fitness, reverse=True)

            # Track best fitness
            current_best = population[0].fitness
            improvement_history.append(current_best)

            if current_best > best_fitness_ever:
                best_fitness_ever = current_best
                convergence_generation = generation

            # Check for convergence
            if detect_convergence(improvement_history, window_size=15, threshold=0.0001):
                break

            # Create new population
            new_population: List[Chromosome] = []

            # Elitism: preserve best individuals
            new_population.extend(copy.deepcopy(population[:self.elitism_count]))

            # Generate offspring
            while len(new_population) < self.population_size:
                # Selection
                parent1 = self._tournament_select(population)
                parent2 = self._tournament_select(population)

                # Crossover
                if random.random() < self.crossover_rate:
                    child1, child2 = self._crossover(parent1, parent2)
                else:
                    child1, child2 = copy.deepcopy(parent1), copy.deepcopy(parent2)

                # Mutation
                mutation_rate = adaptive_mutation_rate(
                    generation, self.generations,
                    self.initial_mutation_rate, 0.01
                )
                self._mutate(child1, mutation_rate)
                self._mutate(child2, mutation_rate)

                # Evaluate fitness
                child1.fitness = self._evaluate_fitness(child1)
                child2.fitness = self._evaluate_fitness(child2)

                new_population.append(child1)
                if len(new_population) < self.population_size:
                    new_population.append(child2)

            population = new_population

        # Get best solutions
        population.sort(key=lambda c: c.fitness, reverse=True)
        best_chromosome = population[0]

        # Convert to kitchen configuration
        best_config = self._chromosome_to_configuration(best_chromosome)

        # Get alternative configurations
        alternatives = [
            self._chromosome_to_configuration(c)
            for c in population[1:4]
            if c.fitness > 0
        ]

        # Analyze work triangle
        work_triangle = self._analyze_work_triangle(best_chromosome)

        # Identify zones
        zones = self._identify_zones(best_chromosome)

        return LayoutOptimizationResult(
            success=True,
            best_configuration=best_config,
            alternative_configurations=alternatives,
            work_triangle=work_triangle,
            zones=zones,
            fitness_score=best_chromosome.fitness,
            generations_completed=generation + 1,
            convergence_generation=convergence_generation,
            improvement_history=improvement_history,
            recommendations=self._generate_recommendations(best_chromosome),
            errors=[],
        )

    def _generate_product_catalog(
        self,
        existing_items: List[CatalogProduct]
    ) -> List[CatalogProduct]:
        """Generate a product catalog with standard kitchen items."""
        products = list(existing_items) if existing_items else []

        # If no existing items, create standard catalog
        if not products:
            products = self._create_standard_catalog()

        return products

    def _create_standard_catalog(self) -> List[CatalogProduct]:
        """Create a standard kitchen product catalog."""
        products: List[CatalogProduct] = []

        # Base cabinets
        for width in [40, 50, 60, 80]:
            products.append(CatalogProduct(
                id=f"base-{width}",
                provider_id="standard",
                provider_product_id=f"BC-{width}",
                name=f"Base Cabinet {width}cm",
                type="cabinet",
                category="base_cabinet",
                dimensions=ProductDimensions(width=width, height=85, depth=60, unit=MeasurementUnit.CM),
                price=200 + width * 2,
                currency="EUR",
                in_stock=True,
            ))

        # Wall cabinets
        for width in [40, 50, 60, 80]:
            products.append(CatalogProduct(
                id=f"wall-{width}",
                provider_id="standard",
                provider_product_id=f"WC-{width}",
                name=f"Wall Cabinet {width}cm",
                type="cabinet",
                category="wall_cabinet",
                dimensions=ProductDimensions(width=width, height=70, depth=35, unit=MeasurementUnit.CM),
                price=150 + width * 1.5,
                currency="EUR",
                in_stock=True,
            ))

        # Tall cabinets
        for width in [50, 60]:
            products.append(CatalogProduct(
                id=f"tall-{width}",
                provider_id="standard",
                provider_product_id=f"TC-{width}",
                name=f"Tall Cabinet {width}cm",
                type="cabinet",
                category="tall_cabinet",
                dimensions=ProductDimensions(width=width, height=200, depth=60, unit=MeasurementUnit.CM),
                price=400 + width * 3,
                currency="EUR",
                in_stock=True,
            ))

        # Sink cabinet
        products.append(CatalogProduct(
            id="sink-base-80",
            provider_id="standard",
            provider_product_id="SB-80",
            name="Sink Base Cabinet 80cm",
            type="cabinet",
            category="sink_base",
            dimensions=ProductDimensions(width=80, height=85, depth=60, unit=MeasurementUnit.CM),
            price=350,
            currency="EUR",
            in_stock=True,
        ))

        # Appliances
        # Refrigerator
        products.append(CatalogProduct(
            id="fridge-standard",
            provider_id="standard",
            provider_product_id="REF-001",
            name="Standard Refrigerator",
            type="appliance",
            category="refrigerator",
            dimensions=ProductDimensions(width=60, height=180, depth=65, unit=MeasurementUnit.CM),
            price=800,
            currency="EUR",
            in_stock=True,
        ))

        # Cooktop
        products.append(CatalogProduct(
            id="cooktop-60",
            provider_id="standard",
            provider_product_id="CT-60",
            name="60cm Cooktop",
            type="appliance",
            category="cooktop",
            dimensions=ProductDimensions(width=60, height=5, depth=52, unit=MeasurementUnit.CM),
            price=500,
            currency="EUR",
            in_stock=True,
        ))

        # Oven
        products.append(CatalogProduct(
            id="oven-60",
            provider_id="standard",
            provider_product_id="OV-60",
            name="Built-in Oven 60cm",
            type="appliance",
            category="oven",
            dimensions=ProductDimensions(width=60, height=60, depth=55, unit=MeasurementUnit.CM),
            price=600,
            currency="EUR",
            in_stock=True,
        ))

        # Dishwasher
        products.append(CatalogProduct(
            id="dishwasher-60",
            provider_id="standard",
            provider_product_id="DW-60",
            name="Dishwasher 60cm",
            type="appliance",
            category="dishwasher",
            dimensions=ProductDimensions(width=60, height=82, depth=55, unit=MeasurementUnit.CM),
            price=450,
            currency="EUR",
            in_stock=True,
        ))

        # Range hood
        products.append(CatalogProduct(
            id="hood-60",
            provider_id="standard",
            provider_product_id="RH-60",
            name="Range Hood 60cm",
            type="appliance",
            category="range_hood",
            dimensions=ProductDimensions(width=60, height=50, depth=50, unit=MeasurementUnit.CM),
            price=300,
            currency="EUR",
            in_stock=True,
        ))

        return products

    def _initialize_population(self) -> List[Chromosome]:
        """Initialize the genetic algorithm population."""
        population: List[Chromosome] = []

        for _ in range(self.population_size):
            chromosome = self._create_random_chromosome()
            population.append(chromosome)

        return population

    def _create_random_chromosome(self) -> Chromosome:
        """Create a random chromosome (kitchen layout)."""
        if not self._room:
            return Chromosome(genes=[])

        genes: List[Gene] = []
        room_dims = self._room.dimensions.to_cm()

        # Determine available wall positions
        walls = ["north", "south", "east", "west"]

        # Required items based on preferences
        required_categories = ["refrigerator", "cooktop", "sink_base"]
        if self._preferences:
            for appliance in self._preferences.required_appliances:
                if appliance.value not in required_categories:
                    required_categories.append(appliance.value)

        # Place required items
        for category in required_categories:
            product = self._find_product_by_category(category)
            if product:
                # Check for fixed position
                if product.id in self._fixed_positions:
                    pos = self._fixed_positions[product.id]
                    genes.append(Gene(
                        product_id=product.id,
                        x=pos.x,
                        y=pos.y,
                        rotation=0,
                        wall=self._determine_wall(pos.x, pos.y, room_dims.width, room_dims.length)
                    ))
                else:
                    # Random placement
                    wall = random.choice(walls)
                    x, y = self._get_wall_position(wall, room_dims.width, room_dims.length, product.dimensions.depth)
                    genes.append(Gene(
                        product_id=product.id,
                        x=x,
                        y=y,
                        rotation=self._get_wall_rotation(wall),
                        wall=wall
                    ))

        # Add base cabinets to fill remaining wall space
        base_cabinets = [p for p in self._available_products if p.category == "base_cabinet"]
        wall_lengths = {
            "north": room_dims.width,
            "south": room_dims.width,
            "east": room_dims.length,
            "west": room_dims.length,
        }

        for wall, length in wall_lengths.items():
            filled = sum(
                self._get_product_by_id(g.product_id).dimensions.width
                for g in genes if g.wall == wall and self._get_product_by_id(g.product_id)
            )
            remaining = length - filled - 20  # Leave margin

            while remaining > 30 and base_cabinets:
                cabinet = random.choice(base_cabinets)
                if cabinet.dimensions.width <= remaining:
                    x, y = self._get_wall_position(wall, room_dims.width, room_dims.length, cabinet.dimensions.depth)
                    # Offset based on filled amount
                    if wall in ["north", "south"]:
                        x = filled + cabinet.dimensions.width / 2 + 10
                    else:
                        y = filled + cabinet.dimensions.width / 2 + 10

                    genes.append(Gene(
                        product_id=cabinet.id,
                        x=x,
                        y=y,
                        rotation=self._get_wall_rotation(wall),
                        wall=wall
                    ))
                    filled += cabinet.dimensions.width
                    remaining -= cabinet.dimensions.width
                else:
                    break

        return Chromosome(genes=genes)

    def _find_product_by_category(self, category: str) -> Optional[CatalogProduct]:
        """Find a product by category."""
        for product in self._available_products:
            if product.category == category or category in product.category:
                return product
        return None

    def _get_product_by_id(self, product_id: str) -> Optional[CatalogProduct]:
        """Get a product by ID."""
        for product in self._available_products:
            if product.id == product_id:
                return product
        return None

    def _get_wall_position(
        self,
        wall: str,
        room_width: float,
        room_length: float,
        depth: float
    ) -> Tuple[float, float]:
        """Get a position along a wall."""
        offset = depth / 2 + 5  # Small gap from wall

        if wall == "north":
            return (room_width / 2, room_length - offset)
        elif wall == "south":
            return (room_width / 2, offset)
        elif wall == "east":
            return (room_width - offset, room_length / 2)
        else:  # west
            return (offset, room_length / 2)

    def _get_wall_rotation(self, wall: str) -> float:
        """Get rotation angle for a wall."""
        rotations = {
            "north": 180,
            "south": 0,
            "east": 270,
            "west": 90,
        }
        return rotations.get(wall, 0)

    def _determine_wall(self, x: float, y: float, width: float, length: float) -> str:
        """Determine which wall a position is closest to."""
        distances = {
            "north": length - y,
            "south": y,
            "east": width - x,
            "west": x,
        }
        return min(distances, key=distances.get)

    def _tournament_select(self, population: List[Chromosome]) -> Chromosome:
        """Tournament selection."""
        tournament_size = 3
        tournament = random.sample(population, min(tournament_size, len(population)))
        return max(tournament, key=lambda c: c.fitness)

    def _crossover(
        self,
        parent1: Chromosome,
        parent2: Chromosome
    ) -> Tuple[Chromosome, Chromosome]:
        """Perform crossover between two chromosomes."""
        if len(parent1.genes) < 2 or len(parent2.genes) < 2:
            return copy.deepcopy(parent1), copy.deepcopy(parent2)

        # Order-based crossover for layout genes
        # Preserve relative positions while combining layouts

        child1_genes: List[Gene] = []
        child2_genes: List[Gene] = []

        # Get unique product IDs from both parents
        p1_ids = {g.product_id for g in parent1.genes}
        p2_ids = {g.product_id for g in parent2.genes}
        common_ids = p1_ids & p2_ids

        # For common products, randomly choose position from one parent
        for product_id in common_ids:
            g1 = next((g for g in parent1.genes if g.product_id == product_id), None)
            g2 = next((g for g in parent2.genes if g.product_id == product_id), None)

            if g1 and g2:
                if random.random() < 0.5:
                    child1_genes.append(copy.deepcopy(g1))
                    child2_genes.append(copy.deepcopy(g2))
                else:
                    child1_genes.append(copy.deepcopy(g2))
                    child2_genes.append(copy.deepcopy(g1))

        # Add unique products from each parent
        for gene in parent1.genes:
            if gene.product_id not in common_ids:
                child1_genes.append(copy.deepcopy(gene))

        for gene in parent2.genes:
            if gene.product_id not in common_ids:
                child2_genes.append(copy.deepcopy(gene))

        return Chromosome(genes=child1_genes), Chromosome(genes=child2_genes)

    def _mutate(self, chromosome: Chromosome, mutation_rate: float) -> None:
        """Apply mutation to a chromosome."""
        if not self._room or not chromosome.genes:
            return

        room_dims = self._room.dimensions.to_cm()

        for gene in chromosome.genes:
            # Skip fixed positions
            if gene.product_id in self._fixed_positions:
                continue

            if random.random() < mutation_rate:
                mutation_type = random.choice(["position", "rotation", "wall"])

                if mutation_type == "position":
                    # Small position adjustment
                    gene.x = gaussian_mutation(gene.x, 20, 0, room_dims.width)
                    gene.y = gaussian_mutation(gene.y, 20, 0, room_dims.length)

                elif mutation_type == "rotation":
                    # Change rotation
                    gene.rotation = random.choice([0, 90, 180, 270])

                elif mutation_type == "wall":
                    # Change wall assignment
                    new_wall = random.choice(["north", "south", "east", "west"])
                    product = self._get_product_by_id(gene.product_id)
                    if product:
                        gene.wall = new_wall
                        gene.x, gene.y = self._get_wall_position(
                            new_wall, room_dims.width, room_dims.length, product.dimensions.depth
                        )
                        gene.rotation = self._get_wall_rotation(new_wall)

    def _evaluate_fitness(self, chromosome: Chromosome) -> float:
        """Evaluate fitness of a chromosome."""
        if not chromosome.genes or not self._room:
            return 0.0

        scores = {
            "ergonomics": self._score_ergonomics(chromosome),
            "storage": self._score_storage(chromosome),
            "workflow": self._score_workflow(chromosome),
            "space_utilization": self._score_space_utilization(chromosome),
            "aesthetics": self._score_aesthetics(chromosome),
            "validity": self._score_validity(chromosome),
        }

        return weighted_average(
            list(scores.values()),
            [self.FITNESS_WEIGHTS[k] for k in scores.keys()]
        )

    def _score_ergonomics(self, chromosome: Chromosome) -> float:
        """Score ergonomics (work triangle efficiency)."""
        work_triangle = self._analyze_work_triangle(chromosome)

        if not work_triangle:
            return 30.0  # Penalty for missing work triangle

        # Optimal work triangle perimeter: 360-660 cm
        perimeter = work_triangle.perimeter
        optimal_min, optimal_max = 360, 660

        if optimal_min <= perimeter <= optimal_max:
            # Perfect range
            score = 100.0
        elif perimeter < optimal_min:
            # Too small - cramped
            score = max(0, 100 - (optimal_min - perimeter) * 0.5)
        else:
            # Too large - inefficient
            score = max(0, 100 - (perimeter - optimal_max) * 0.3)

        return score

    def _score_storage(self, chromosome: Chromosome) -> float:
        """Score storage capacity."""
        if not self._room:
            return 50.0

        total_storage_volume = 0.0

        for gene in chromosome.genes:
            product = self._get_product_by_id(gene.product_id)
            if product and "cabinet" in product.category:
                dims = product.dimensions
                volume = dims.width * dims.height * dims.depth
                total_storage_volume += volume

        # Calculate room area
        room_dims = self._room.dimensions.to_cm()
        room_area = room_dims.width * room_dims.length

        # Expected storage: roughly 30-50 liters per square meter
        expected_min = room_area * 30
        expected_max = room_area * 50

        if total_storage_volume >= expected_max:
            return 100.0
        elif total_storage_volume >= expected_min:
            return 70 + 30 * (total_storage_volume - expected_min) / (expected_max - expected_min)
        else:
            return max(0, 70 * total_storage_volume / expected_min)

    def _score_workflow(self, chromosome: Chromosome) -> float:
        """Score workflow efficiency."""
        # Check logical groupings
        score = 80.0  # Start with good score

        # Find key items
        sink_gene = None
        cooktop_gene = None
        fridge_gene = None
        dishwasher_gene = None

        for gene in chromosome.genes:
            product = self._get_product_by_id(gene.product_id)
            if product:
                if "sink" in product.category:
                    sink_gene = gene
                elif "cooktop" in product.category:
                    cooktop_gene = gene
                elif "refrigerator" in product.category:
                    fridge_gene = gene
                elif "dishwasher" in product.category:
                    dishwasher_gene = gene

        # Dishwasher should be near sink
        if sink_gene and dishwasher_gene:
            dist = euclidean_distance_2d(
                (sink_gene.x, sink_gene.y),
                (dishwasher_gene.x, dishwasher_gene.y)
            )
            if dist > 120:  # Too far
                score -= 15
            elif dist < 60:
                score += 10

        # Cooktop shouldn't be next to fridge
        if cooktop_gene and fridge_gene:
            dist = euclidean_distance_2d(
                (cooktop_gene.x, cooktop_gene.y),
                (fridge_gene.x, fridge_gene.y)
            )
            if dist < 60:  # Too close
                score -= 20

        return max(0, min(100, score))

    def _score_space_utilization(self, chromosome: Chromosome) -> float:
        """Score space utilization."""
        if not self._room:
            return 50.0

        room_dims = self._room.dimensions.to_cm()
        room_area = room_dims.width * room_dims.length

        # Calculate used floor area
        used_area = 0.0
        for gene in chromosome.genes:
            product = self._get_product_by_id(gene.product_id)
            if product:
                dims = product.dimensions
                # Account for rotation
                if gene.rotation in [90, 270]:
                    used_area += dims.depth * dims.width
                else:
                    used_area += dims.width * dims.depth

        # Calculate utilization percentage
        utilization = (used_area / room_area) * 100

        # Optimal utilization: 30-50%
        if 30 <= utilization <= 50:
            return 100.0
        elif utilization < 30:
            return 60 + 40 * (utilization / 30)
        else:
            # Overcrowded
            return max(0, 100 - (utilization - 50) * 2)

    def _score_aesthetics(self, chromosome: Chromosome) -> float:
        """Score aesthetic alignment (symmetry, style consistency)."""
        score = 80.0

        if not self._room:
            return score

        room_dims = self._room.dimensions.to_cm()
        center_x = room_dims.width / 2

        # Check symmetry around center line
        left_items = []
        right_items = []

        for gene in chromosome.genes:
            if gene.x < center_x:
                left_items.append(gene)
            else:
                right_items.append(gene)

        # Symmetry bonus/penalty
        balance = abs(len(left_items) - len(right_items))
        if balance <= 1:
            score += 10
        elif balance > 3:
            score -= 10

        return max(0, min(100, score))

    def _score_validity(self, chromosome: Chromosome) -> float:
        """Score layout validity (no overlaps, proper clearances)."""
        score = 100.0

        # Check for overlaps
        genes = chromosome.genes
        for i, g1 in enumerate(genes):
            p1 = self._get_product_by_id(g1.product_id)
            if not p1:
                continue

            b1_min, b1_max = calculate_bounding_box(
                (g1.x, g1.y, 0),
                (p1.dimensions.width, p1.dimensions.depth, p1.dimensions.height),
                g1.rotation
            )

            for g2 in genes[i + 1:]:
                p2 = self._get_product_by_id(g2.product_id)
                if not p2:
                    continue

                b2_min, b2_max = calculate_bounding_box(
                    (g2.x, g2.y, 0),
                    (p2.dimensions.width, p2.dimensions.depth, p2.dimensions.height),
                    g2.rotation
                )

                if boxes_overlap_3d(b1_min, b1_max, b2_min, b2_max):
                    score -= 15  # Penalty for each overlap

        # Check passage width
        if self._room:
            room_dims = self._room.dimensions.to_cm()
            # Simplified passage check
            items_near_center = sum(
                1 for g in genes
                if abs(g.x - room_dims.width / 2) < 100 and abs(g.y - room_dims.length / 2) < 100
            )
            if items_near_center > 2:
                score -= 10  # Might block passage

        return max(0, score)

    def _analyze_work_triangle(self, chromosome: Chromosome) -> Optional[WorkTriangle]:
        """Analyze the kitchen work triangle."""
        sink_pos = None
        stove_pos = None
        fridge_pos = None

        for gene in chromosome.genes:
            product = self._get_product_by_id(gene.product_id)
            if product:
                if "sink" in product.category:
                    sink_pos = (gene.x, gene.y)
                elif "cooktop" in product.category:
                    stove_pos = (gene.x, gene.y)
                elif "refrigerator" in product.category:
                    fridge_pos = (gene.x, gene.y)

        if not all([sink_pos, stove_pos, fridge_pos]):
            return None

        perimeter = calculate_triangle_perimeter(sink_pos, stove_pos, fridge_pos)
        is_optimal = 360 <= perimeter <= 660

        return WorkTriangle(
            sink_position=Position3D(x=sink_pos[0], y=sink_pos[1], z=0),
            stove_position=Position3D(x=stove_pos[0], y=stove_pos[1], z=0),
            refrigerator_position=Position3D(x=fridge_pos[0], y=fridge_pos[1], z=0),
            perimeter=perimeter,
            is_optimal=is_optimal,
            efficiency_score=normalize_score(perimeter, 200, 800) if perimeter <= 510 else
                            normalize_score(1020 - perimeter, 200, 800),
        )

    def _identify_zones(self, chromosome: Chromosome) -> List[LayoutZone]:
        """Identify functional zones in the layout."""
        zones: List[LayoutZone] = []

        cooking_items: List[str] = []
        prep_items: List[str] = []
        cleaning_items: List[str] = []
        storage_items: List[str] = []

        for gene in chromosome.genes:
            product = self._get_product_by_id(gene.product_id)
            if product:
                if "cooktop" in product.category or "oven" in product.category:
                    cooking_items.append(gene.product_id)
                elif "sink" in product.category or "dishwasher" in product.category:
                    cleaning_items.append(gene.product_id)
                elif "base_cabinet" in product.category:
                    prep_items.append(gene.product_id)
                elif "tall" in product.category or "pantry" in product.category:
                    storage_items.append(gene.product_id)

        # Create zones based on item clusters
        zone_configs = [
            (SpaceZone.COOKING, cooking_items),
            (SpaceZone.CLEANING, cleaning_items),
            (SpaceZone.PREPARATION, prep_items),
            (SpaceZone.STORAGE, storage_items),
        ]

        for zone_type, items in zone_configs:
            if items:
                # Calculate zone center from items
                item_genes = [g for g in chromosome.genes if g.product_id in items]
                if item_genes:
                    center_x = sum(g.x for g in item_genes) / len(item_genes)
                    center_y = sum(g.y for g in item_genes) / len(item_genes)

                    zones.append(LayoutZone(
                        zone_type=zone_type,
                        position=Position3D(x=center_x, y=center_y, z=0),
                        width=150,  # Approximate zone size
                        depth=100,
                        items=items,
                        efficiency_score=80.0,
                    ))

        return zones

    def _chromosome_to_configuration(self, chromosome: Chromosome) -> KitchenConfiguration:
        """Convert a chromosome to a kitchen configuration."""
        items: List[PlacedItem] = []
        cabinets: List[PlacedItem] = []
        appliances: List[PlacedItem] = []
        worktops: List[PlacedItem] = []
        total_price = 0.0

        for gene in chromosome.genes:
            product = self._get_product_by_id(gene.product_id)
            if product:
                placed_item = PlacedItem(
                    id=str(uuid.uuid4()),
                    product=product,
                    position=Position3D(x=gene.x, y=gene.y, z=0),
                    rotation=gene.rotation,
                    wall=gene.wall,
                )
                items.append(placed_item)
                total_price += product.price

                if "cabinet" in product.category:
                    cabinets.append(placed_item)
                elif product.type == "appliance":
                    appliances.append(placed_item)
                elif "worktop" in product.category:
                    worktops.append(placed_item)

        # Determine shape from layout
        shape = self._determine_shape(chromosome)

        # Calculate scores
        scores = ConfigurationScore(
            overall=chromosome.fitness,
            ergonomics=self._score_ergonomics(chromosome),
            storage=self._score_storage(chromosome),
            aesthetics=self._score_aesthetics(chromosome),
            budget_efficiency=80.0,  # Placeholder
            space_utilization=self._score_space_utilization(chromosome),
        )

        # Validation
        validation = ValidationResult(
            valid=chromosome.fitness > 50,
            errors=[],
            warnings=[],
        )

        return KitchenConfiguration(
            id=str(uuid.uuid4()),
            name=f"Optimized {shape.value}-shaped Kitchen",
            shape=shape,
            style=self._preferences.style if self._preferences else KitchenStyle.MODERN,
            room=self._room,
            items=items,
            cabinets=cabinets,
            appliances=appliances,
            worktops=worktops,
            pricing=PricingSummary(
                cabinets=sum(p.product.price for p in cabinets),
                appliances=sum(p.product.price for p in appliances),
                worktops=sum(p.product.price for p in worktops),
                fittings=0,
                total=total_price,
                currency="EUR",
                by_provider={"standard": total_price},
            ),
            score=scores,
            validation=validation,
            metadata={
                "optimizer": "genetic_algorithm",
                "fitness": chromosome.fitness,
            },
        )

    def _determine_shape(self, chromosome: Chromosome) -> KitchenShape:
        """Determine the kitchen shape from the layout."""
        if not chromosome.genes or not self._room:
            return KitchenShape.I_SHAPE

        walls_used = set(g.wall for g in chromosome.genes if g.wall)

        if len(walls_used) == 1:
            return KitchenShape.I_SHAPE
        elif len(walls_used) == 2:
            if {"north", "south"} == walls_used or {"east", "west"} == walls_used:
                return KitchenShape.PARALLEL
            else:
                return KitchenShape.L_SHAPE
        elif len(walls_used) == 3:
            return KitchenShape.U_SHAPE
        else:
            return KitchenShape.G_SHAPE

    def _generate_recommendations(self, chromosome: Chromosome) -> List[str]:
        """Generate recommendations based on the optimized layout."""
        recommendations: List[str] = []

        # Work triangle analysis
        work_triangle = self._analyze_work_triangle(chromosome)
        if work_triangle:
            if work_triangle.perimeter < 360:
                recommendations.append(
                    "Consider spacing out the sink, cooktop, and refrigerator for better workflow."
                )
            elif work_triangle.perimeter > 660:
                recommendations.append(
                    "The work triangle is quite large. Consider moving key appliances closer together."
                )
            else:
                recommendations.append(
                    "Work triangle is optimally sized for efficient cooking workflow."
                )

        # Storage recommendations
        storage_score = self._score_storage(chromosome)
        if storage_score < 60:
            recommendations.append(
                "Consider adding more cabinets to increase storage capacity."
            )
        elif storage_score > 90:
            recommendations.append(
                "Excellent storage capacity in this layout."
            )

        # Space utilization
        util_score = self._score_space_utilization(chromosome)
        if util_score < 60:
            recommendations.append(
                "There's room for additional storage or workspace."
            )
        elif util_score > 90:
            recommendations.append(
                "Good balance of fixtures and open space for movement."
            )

        return recommendations
