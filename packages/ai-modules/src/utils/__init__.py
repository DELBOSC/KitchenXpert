"""
KitchenXpert AI Utilities Package.
"""

from .algorithms import (
    # Geometric calculations
    euclidean_distance,
    euclidean_distance_2d,
    manhattan_distance,
    calculate_triangle_perimeter,
    calculate_triangle_area,
    point_in_rectangle,
    rectangles_overlap,
    boxes_overlap_3d,
    calculate_overlap_volume,
    rotate_point_2d,
    calculate_bounding_box,
    # Scoring and normalization
    normalize_score,
    weighted_average,
    sigmoid,
    calculate_fitness_score,
    # Genetic algorithm utilities
    tournament_selection,
    roulette_wheel_selection,
    single_point_crossover,
    two_point_crossover,
    uniform_crossover,
    gaussian_mutation,
    adaptive_mutation_rate,
    # Optimization utilities
    simulated_annealing_probability,
    cooling_schedule_exponential,
    pareto_dominates,
    find_pareto_front,
    # Similarity metrics
    cosine_similarity,
    jaccard_similarity,
    levenshtein_distance,
    # Statistical utilities
    calculate_statistics,
    moving_average,
    detect_convergence,
)

__all__ = [
    # Geometric calculations
    "euclidean_distance",
    "euclidean_distance_2d",
    "manhattan_distance",
    "calculate_triangle_perimeter",
    "calculate_triangle_area",
    "point_in_rectangle",
    "rectangles_overlap",
    "boxes_overlap_3d",
    "calculate_overlap_volume",
    "rotate_point_2d",
    "calculate_bounding_box",
    # Scoring and normalization
    "normalize_score",
    "weighted_average",
    "sigmoid",
    "calculate_fitness_score",
    # Genetic algorithm utilities
    "tournament_selection",
    "roulette_wheel_selection",
    "single_point_crossover",
    "two_point_crossover",
    "uniform_crossover",
    "gaussian_mutation",
    "adaptive_mutation_rate",
    # Optimization utilities
    "simulated_annealing_probability",
    "cooling_schedule_exponential",
    "pareto_dominates",
    "find_pareto_front",
    # Similarity metrics
    "cosine_similarity",
    "jaccard_similarity",
    "levenshtein_distance",
    # Statistical utilities
    "calculate_statistics",
    "moving_average",
    "detect_convergence",
]
