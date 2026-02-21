"""
Helper algorithms for KitchenXpert AI modules.
Includes geometric calculations, distance metrics, and optimization utilities.
"""

import math
import random
from typing import List, Tuple, Dict, Any, Optional, TypeVar, Callable
import numpy as np


T = TypeVar("T")


# ============================================
# Geometric Calculations
# ============================================


def euclidean_distance(p1: Tuple[float, float, float], p2: Tuple[float, float, float]) -> float:
    """
    Calculate 3D Euclidean distance between two points.

    Args:
        p1: First point (x, y, z)
        p2: Second point (x, y, z)

    Returns:
        Distance between the points
    """
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(p1, p2)))


def euclidean_distance_2d(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    """
    Calculate 2D Euclidean distance between two points.

    Args:
        p1: First point (x, y)
        p2: Second point (x, y)

    Returns:
        Distance between the points
    """
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)


def manhattan_distance(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    """
    Calculate Manhattan (L1) distance between two points.

    Args:
        p1: First point (x, y)
        p2: Second point (x, y)

    Returns:
        Manhattan distance between the points
    """
    return abs(p1[0] - p2[0]) + abs(p1[1] - p2[1])


def calculate_triangle_perimeter(
    p1: Tuple[float, float],
    p2: Tuple[float, float],
    p3: Tuple[float, float]
) -> float:
    """
    Calculate the perimeter of a triangle defined by three points.

    Args:
        p1: First point (x, y)
        p2: Second point (x, y)
        p3: Third point (x, y)

    Returns:
        Perimeter of the triangle
    """
    d1 = euclidean_distance_2d(p1, p2)
    d2 = euclidean_distance_2d(p2, p3)
    d3 = euclidean_distance_2d(p3, p1)
    return d1 + d2 + d3


def calculate_triangle_area(
    p1: Tuple[float, float],
    p2: Tuple[float, float],
    p3: Tuple[float, float]
) -> float:
    """
    Calculate the area of a triangle using Heron's formula.

    Args:
        p1: First point (x, y)
        p2: Second point (x, y)
        p3: Third point (x, y)

    Returns:
        Area of the triangle
    """
    a = euclidean_distance_2d(p1, p2)
    b = euclidean_distance_2d(p2, p3)
    c = euclidean_distance_2d(p3, p1)
    s = (a + b + c) / 2
    area_sq = s * (s - a) * (s - b) * (s - c)
    return math.sqrt(max(0, area_sq))


def point_in_rectangle(
    point: Tuple[float, float],
    rect_min: Tuple[float, float],
    rect_max: Tuple[float, float]
) -> bool:
    """
    Check if a point is inside a rectangle.

    Args:
        point: Point to check (x, y)
        rect_min: Rectangle minimum corner (x, y)
        rect_max: Rectangle maximum corner (x, y)

    Returns:
        True if point is inside rectangle
    """
    return (rect_min[0] <= point[0] <= rect_max[0] and
            rect_min[1] <= point[1] <= rect_max[1])


def rectangles_overlap(
    r1_min: Tuple[float, float],
    r1_max: Tuple[float, float],
    r2_min: Tuple[float, float],
    r2_max: Tuple[float, float]
) -> bool:
    """
    Check if two axis-aligned rectangles overlap.

    Args:
        r1_min: First rectangle minimum corner
        r1_max: First rectangle maximum corner
        r2_min: Second rectangle minimum corner
        r2_max: Second rectangle maximum corner

    Returns:
        True if rectangles overlap
    """
    return not (r1_max[0] < r2_min[0] or r2_max[0] < r1_min[0] or
                r1_max[1] < r2_min[1] or r2_max[1] < r1_min[1])


def boxes_overlap_3d(
    b1_min: Tuple[float, float, float],
    b1_max: Tuple[float, float, float],
    b2_min: Tuple[float, float, float],
    b2_max: Tuple[float, float, float]
) -> bool:
    """
    Check if two axis-aligned 3D boxes overlap.

    Args:
        b1_min: First box minimum corner (x, y, z)
        b1_max: First box maximum corner (x, y, z)
        b2_min: Second box minimum corner (x, y, z)
        b2_max: Second box maximum corner (x, y, z)

    Returns:
        True if boxes overlap
    """
    return not (
        b1_max[0] < b2_min[0] or b2_max[0] < b1_min[0] or
        b1_max[1] < b2_min[1] or b2_max[1] < b1_min[1] or
        b1_max[2] < b2_min[2] or b2_max[2] < b1_min[2]
    )


def calculate_overlap_volume(
    b1_min: Tuple[float, float, float],
    b1_max: Tuple[float, float, float],
    b2_min: Tuple[float, float, float],
    b2_max: Tuple[float, float, float]
) -> float:
    """
    Calculate the overlap volume of two 3D boxes.

    Args:
        b1_min: First box minimum corner
        b1_max: First box maximum corner
        b2_min: Second box minimum corner
        b2_max: Second box maximum corner

    Returns:
        Overlap volume (0 if no overlap)
    """
    overlap_x = max(0, min(b1_max[0], b2_max[0]) - max(b1_min[0], b2_min[0]))
    overlap_y = max(0, min(b1_max[1], b2_max[1]) - max(b1_min[1], b2_min[1]))
    overlap_z = max(0, min(b1_max[2], b2_max[2]) - max(b1_min[2], b2_min[2]))
    return overlap_x * overlap_y * overlap_z


def rotate_point_2d(
    point: Tuple[float, float],
    center: Tuple[float, float],
    angle_degrees: float
) -> Tuple[float, float]:
    """
    Rotate a point around a center point.

    Args:
        point: Point to rotate (x, y)
        center: Center of rotation (x, y)
        angle_degrees: Rotation angle in degrees

    Returns:
        Rotated point (x, y)
    """
    angle_rad = math.radians(angle_degrees)
    cos_a = math.cos(angle_rad)
    sin_a = math.sin(angle_rad)

    dx = point[0] - center[0]
    dy = point[1] - center[1]

    new_x = center[0] + dx * cos_a - dy * sin_a
    new_y = center[1] + dx * sin_a + dy * cos_a

    return (new_x, new_y)


def calculate_bounding_box(
    position: Tuple[float, float, float],
    dimensions: Tuple[float, float, float],
    rotation: float = 0
) -> Tuple[Tuple[float, float, float], Tuple[float, float, float]]:
    """
    Calculate the axis-aligned bounding box for an item.

    Args:
        position: Item center position (x, y, z)
        dimensions: Item dimensions (width, depth, height)
        rotation: Rotation in degrees (0, 90, 180, 270)

    Returns:
        Tuple of (min_corner, max_corner)
    """
    w, d, h = dimensions

    # Handle rotation for width and depth
    if rotation in (90, 270):
        w, d = d, w

    half_w = w / 2
    half_d = d / 2

    min_corner = (position[0] - half_w, position[1] - half_d, position[2])
    max_corner = (position[0] + half_w, position[1] + half_d, position[2] + h)

    return (min_corner, max_corner)


# ============================================
# Scoring and Normalization
# ============================================


def normalize_score(value: float, min_val: float, max_val: float) -> float:
    """
    Normalize a value to 0-100 scale.

    Args:
        value: Value to normalize
        min_val: Minimum expected value
        max_val: Maximum expected value

    Returns:
        Normalized score (0-100)
    """
    if max_val == min_val:
        return 50.0
    return max(0, min(100, ((value - min_val) / (max_val - min_val)) * 100))


def weighted_average(values: List[float], weights: List[float]) -> float:
    """
    Calculate weighted average of values.

    Args:
        values: List of values
        weights: List of weights

    Returns:
        Weighted average
    """
    if not values or not weights or len(values) != len(weights):
        return 0.0
    total_weight = sum(weights)
    if total_weight == 0:
        return 0.0
    return sum(v * w for v, w in zip(values, weights)) / total_weight


def sigmoid(x: float, k: float = 1.0, x0: float = 0.0) -> float:
    """
    Sigmoid function for smooth transitions.

    Args:
        x: Input value
        k: Steepness parameter
        x0: Center point

    Returns:
        Sigmoid value (0 to 1)
    """
    return 1 / (1 + math.exp(-k * (x - x0)))


def calculate_fitness_score(
    scores: Dict[str, float],
    weights: Dict[str, float]
) -> float:
    """
    Calculate overall fitness score from component scores.

    Args:
        scores: Dictionary of component scores
        weights: Dictionary of component weights

    Returns:
        Overall fitness score (0-100)
    """
    total_weight = 0.0
    weighted_sum = 0.0

    for key, score in scores.items():
        weight = weights.get(key, 1.0)
        weighted_sum += score * weight
        total_weight += weight

    if total_weight == 0:
        return 0.0

    return weighted_sum / total_weight


# ============================================
# Genetic Algorithm Utilities
# ============================================


def tournament_selection(
    population: List[T],
    fitness_scores: List[float],
    tournament_size: int = 3
) -> T:
    """
    Tournament selection for genetic algorithms.

    Args:
        population: List of individuals
        fitness_scores: Fitness scores for each individual
        tournament_size: Number of individuals in tournament

    Returns:
        Selected individual
    """
    indices = random.sample(range(len(population)), min(tournament_size, len(population)))
    best_idx = max(indices, key=lambda i: fitness_scores[i])
    return population[best_idx]


def roulette_wheel_selection(
    population: List[T],
    fitness_scores: List[float]
) -> T:
    """
    Roulette wheel selection for genetic algorithms.

    Args:
        population: List of individuals
        fitness_scores: Fitness scores for each individual

    Returns:
        Selected individual
    """
    # Shift scores to be positive
    min_score = min(fitness_scores)
    shifted_scores = [s - min_score + 1 for s in fitness_scores]
    total = sum(shifted_scores)

    if total == 0:
        return random.choice(population)

    pick = random.uniform(0, total)
    current = 0

    for individual, score in zip(population, shifted_scores):
        current += score
        if current >= pick:
            return individual

    return population[-1]


def single_point_crossover(
    parent1: List[Any],
    parent2: List[Any]
) -> Tuple[List[Any], List[Any]]:
    """
    Single-point crossover for genetic algorithms.

    Args:
        parent1: First parent genome
        parent2: Second parent genome

    Returns:
        Tuple of two offspring genomes
    """
    if len(parent1) != len(parent2) or len(parent1) < 2:
        return list(parent1), list(parent2)

    point = random.randint(1, len(parent1) - 1)

    child1 = parent1[:point] + parent2[point:]
    child2 = parent2[:point] + parent1[point:]

    return child1, child2


def two_point_crossover(
    parent1: List[Any],
    parent2: List[Any]
) -> Tuple[List[Any], List[Any]]:
    """
    Two-point crossover for genetic algorithms.

    Args:
        parent1: First parent genome
        parent2: Second parent genome

    Returns:
        Tuple of two offspring genomes
    """
    if len(parent1) != len(parent2) or len(parent1) < 3:
        return list(parent1), list(parent2)

    points = sorted(random.sample(range(1, len(parent1)), 2))

    child1 = parent1[:points[0]] + parent2[points[0]:points[1]] + parent1[points[1]:]
    child2 = parent2[:points[0]] + parent1[points[0]:points[1]] + parent2[points[1]:]

    return child1, child2


def uniform_crossover(
    parent1: List[Any],
    parent2: List[Any],
    probability: float = 0.5
) -> Tuple[List[Any], List[Any]]:
    """
    Uniform crossover for genetic algorithms.

    Args:
        parent1: First parent genome
        parent2: Second parent genome
        probability: Probability of selecting from parent1

    Returns:
        Tuple of two offspring genomes
    """
    child1 = []
    child2 = []

    for g1, g2 in zip(parent1, parent2):
        if random.random() < probability:
            child1.append(g1)
            child2.append(g2)
        else:
            child1.append(g2)
            child2.append(g1)

    return child1, child2


def gaussian_mutation(
    value: float,
    sigma: float,
    min_val: Optional[float] = None,
    max_val: Optional[float] = None
) -> float:
    """
    Apply Gaussian mutation to a value.

    Args:
        value: Original value
        sigma: Standard deviation of mutation
        min_val: Minimum allowed value
        max_val: Maximum allowed value

    Returns:
        Mutated value
    """
    mutated = value + random.gauss(0, sigma)

    if min_val is not None:
        mutated = max(min_val, mutated)
    if max_val is not None:
        mutated = min(max_val, mutated)

    return mutated


def adaptive_mutation_rate(
    generation: int,
    max_generations: int,
    initial_rate: float = 0.1,
    final_rate: float = 0.01
) -> float:
    """
    Calculate adaptive mutation rate based on generation.

    Args:
        generation: Current generation
        max_generations: Maximum generations
        initial_rate: Starting mutation rate
        final_rate: Final mutation rate

    Returns:
        Mutation rate for current generation
    """
    progress = generation / max_generations
    return initial_rate - (initial_rate - final_rate) * progress


# ============================================
# Optimization Utilities
# ============================================


def simulated_annealing_probability(
    delta_cost: float,
    temperature: float
) -> float:
    """
    Calculate acceptance probability for simulated annealing.

    Args:
        delta_cost: Change in cost (negative = improvement)
        temperature: Current temperature

    Returns:
        Acceptance probability
    """
    if delta_cost < 0:
        return 1.0
    if temperature <= 0:
        return 0.0
    return math.exp(-delta_cost / temperature)


def cooling_schedule_exponential(
    initial_temp: float,
    iteration: int,
    alpha: float = 0.95
) -> float:
    """
    Exponential cooling schedule for simulated annealing.

    Args:
        initial_temp: Starting temperature
        iteration: Current iteration
        alpha: Cooling rate (0 < alpha < 1)

    Returns:
        Current temperature
    """
    return initial_temp * (alpha ** iteration)


def pareto_dominates(
    solution1: List[float],
    solution2: List[float],
    minimize: bool = True
) -> bool:
    """
    Check if solution1 Pareto-dominates solution2.

    Args:
        solution1: First solution objectives
        solution2: Second solution objectives
        minimize: Whether objectives are to be minimized

    Returns:
        True if solution1 dominates solution2
    """
    better_in_one = False

    for v1, v2 in zip(solution1, solution2):
        if minimize:
            if v1 > v2:
                return False
            if v1 < v2:
                better_in_one = True
        else:
            if v1 < v2:
                return False
            if v1 > v2:
                better_in_one = True

    return better_in_one


def find_pareto_front(
    solutions: List[List[float]],
    minimize: bool = True
) -> List[int]:
    """
    Find the Pareto front from a set of solutions.

    Args:
        solutions: List of solution objective vectors
        minimize: Whether objectives are to be minimized

    Returns:
        Indices of solutions on the Pareto front
    """
    n = len(solutions)
    is_dominated = [False] * n

    for i in range(n):
        for j in range(n):
            if i != j and not is_dominated[i]:
                if pareto_dominates(solutions[j], solutions[i], minimize):
                    is_dominated[i] = True
                    break

    return [i for i in range(n) if not is_dominated[i]]


# ============================================
# Similarity and Distance Metrics
# ============================================


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """
    Calculate cosine similarity between two vectors.

    Args:
        v1: First vector
        v2: Second vector

    Returns:
        Cosine similarity (-1 to 1)
    """
    if len(v1) != len(v2):
        return 0.0

    dot_product = sum(a * b for a, b in zip(v1, v2))
    magnitude1 = math.sqrt(sum(a * a for a in v1))
    magnitude2 = math.sqrt(sum(b * b for b in v2))

    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0

    return dot_product / (magnitude1 * magnitude2)


def jaccard_similarity(set1: set, set2: set) -> float:
    """
    Calculate Jaccard similarity between two sets.

    Args:
        set1: First set
        set2: Second set

    Returns:
        Jaccard similarity (0 to 1)
    """
    if not set1 and not set2:
        return 1.0

    intersection = len(set1 & set2)
    union = len(set1 | set2)

    return intersection / union if union > 0 else 0.0


def levenshtein_distance(s1: str, s2: str) -> int:
    """
    Calculate Levenshtein (edit) distance between two strings.

    Args:
        s1: First string
        s2: Second string

    Returns:
        Edit distance
    """
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)

    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)

    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


# ============================================
# Statistical Utilities
# ============================================


def calculate_statistics(values: List[float]) -> Dict[str, float]:
    """
    Calculate basic statistics for a list of values.

    Args:
        values: List of numeric values

    Returns:
        Dictionary with min, max, mean, std, median
    """
    if not values:
        return {
            "min": 0.0,
            "max": 0.0,
            "mean": 0.0,
            "std": 0.0,
            "median": 0.0
        }

    arr = np.array(values)
    return {
        "min": float(np.min(arr)),
        "max": float(np.max(arr)),
        "mean": float(np.mean(arr)),
        "std": float(np.std(arr)),
        "median": float(np.median(arr))
    }


def moving_average(values: List[float], window_size: int) -> List[float]:
    """
    Calculate moving average of a list of values.

    Args:
        values: List of numeric values
        window_size: Window size for averaging

    Returns:
        List of moving averages
    """
    if window_size <= 0 or not values:
        return values

    result = []
    for i in range(len(values)):
        start = max(0, i - window_size + 1)
        window = values[start:i + 1]
        result.append(sum(window) / len(window))

    return result


def detect_convergence(
    history: List[float],
    window_size: int = 10,
    threshold: float = 0.001
) -> bool:
    """
    Detect if optimization has converged.

    Args:
        history: Fitness history
        window_size: Window size to check
        threshold: Convergence threshold

    Returns:
        True if converged
    """
    if len(history) < window_size:
        return False

    recent = history[-window_size:]
    variance = np.var(recent)
    mean = abs(np.mean(recent))

    if mean == 0:
        return variance < threshold

    return (variance / mean) < threshold
