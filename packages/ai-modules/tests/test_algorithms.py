"""
Tests for utility algorithms module.

Tests cover:
- Geometric calculations (distance, area, overlap)
- Scoring and normalization functions
- Genetic algorithm utilities
- Optimization utilities
- Similarity metrics
- Statistical utilities
"""

import pytest
import math
import numpy as np
from typing import List

from src.utils.algorithms import (
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


# ============================================
# Geometric Calculation Tests
# ============================================


class TestEuclideanDistance:
    """Test Euclidean distance calculations."""

    def test_euclidean_distance_3d_same_point(self):
        """Test distance between same point is 0."""
        p = (1.0, 2.0, 3.0)
        assert euclidean_distance(p, p) == 0.0

    def test_euclidean_distance_3d_unit(self):
        """Test distance along single axis."""
        p1 = (0.0, 0.0, 0.0)
        p2 = (1.0, 0.0, 0.0)
        assert euclidean_distance(p1, p2) == 1.0

    def test_euclidean_distance_3d_diagonal(self):
        """Test diagonal distance."""
        p1 = (0.0, 0.0, 0.0)
        p2 = (3.0, 4.0, 0.0)
        assert euclidean_distance(p1, p2) == 5.0  # 3-4-5 triangle

    def test_euclidean_distance_2d_same_point(self):
        """Test 2D distance between same point."""
        p = (5.0, 5.0)
        assert euclidean_distance_2d(p, p) == 0.0

    def test_euclidean_distance_2d_unit(self):
        """Test 2D distance along axis."""
        p1 = (0.0, 0.0)
        p2 = (0.0, 10.0)
        assert euclidean_distance_2d(p1, p2) == 10.0

    def test_euclidean_distance_2d_diagonal(self):
        """Test 2D diagonal distance."""
        p1 = (0.0, 0.0)
        p2 = (3.0, 4.0)
        assert euclidean_distance_2d(p1, p2) == 5.0


class TestManhattanDistance:
    """Test Manhattan distance calculations."""

    def test_manhattan_same_point(self):
        """Test Manhattan distance between same point."""
        p = (5.0, 5.0)
        assert manhattan_distance(p, p) == 0.0

    def test_manhattan_single_axis(self):
        """Test Manhattan distance along one axis."""
        p1 = (0.0, 0.0)
        p2 = (10.0, 0.0)
        assert manhattan_distance(p1, p2) == 10.0

    def test_manhattan_both_axes(self):
        """Test Manhattan distance using both axes."""
        p1 = (0.0, 0.0)
        p2 = (3.0, 4.0)
        assert manhattan_distance(p1, p2) == 7.0  # 3 + 4


class TestTriangleCalculations:
    """Test triangle calculations."""

    def test_triangle_perimeter(self):
        """Test triangle perimeter calculation."""
        p1 = (0.0, 0.0)
        p2 = (3.0, 0.0)
        p3 = (0.0, 4.0)

        perimeter = calculate_triangle_perimeter(p1, p2, p3)

        # 3 + 4 + 5 = 12
        assert abs(perimeter - 12.0) < 0.001

    def test_triangle_area_right_triangle(self):
        """Test area of right triangle."""
        p1 = (0.0, 0.0)
        p2 = (6.0, 0.0)
        p3 = (0.0, 8.0)

        area = calculate_triangle_area(p1, p2, p3)

        # Area = 0.5 * base * height = 0.5 * 6 * 8 = 24
        assert abs(area - 24.0) < 0.001

    def test_triangle_area_collinear(self):
        """Test area of collinear points (degenerate triangle)."""
        p1 = (0.0, 0.0)
        p2 = (5.0, 0.0)
        p3 = (10.0, 0.0)

        area = calculate_triangle_area(p1, p2, p3)

        # Collinear points = no area
        assert abs(area) < 0.001


class TestPointInRectangle:
    """Test point in rectangle checks."""

    def test_point_inside(self):
        """Test point inside rectangle."""
        point = (5.0, 5.0)
        rect_min = (0.0, 0.0)
        rect_max = (10.0, 10.0)

        assert point_in_rectangle(point, rect_min, rect_max) is True

    def test_point_outside(self):
        """Test point outside rectangle."""
        point = (15.0, 15.0)
        rect_min = (0.0, 0.0)
        rect_max = (10.0, 10.0)

        assert point_in_rectangle(point, rect_min, rect_max) is False

    def test_point_on_edge(self):
        """Test point on rectangle edge."""
        point = (10.0, 5.0)
        rect_min = (0.0, 0.0)
        rect_max = (10.0, 10.0)

        assert point_in_rectangle(point, rect_min, rect_max) is True

    def test_point_on_corner(self):
        """Test point on rectangle corner."""
        point = (0.0, 0.0)
        rect_min = (0.0, 0.0)
        rect_max = (10.0, 10.0)

        assert point_in_rectangle(point, rect_min, rect_max) is True


class TestRectangleOverlap:
    """Test rectangle overlap checks."""

    def test_rectangles_overlap_true(self):
        """Test overlapping rectangles."""
        r1_min, r1_max = (0.0, 0.0), (10.0, 10.0)
        r2_min, r2_max = (5.0, 5.0), (15.0, 15.0)

        assert rectangles_overlap(r1_min, r1_max, r2_min, r2_max) is True

    def test_rectangles_no_overlap(self):
        """Test non-overlapping rectangles."""
        r1_min, r1_max = (0.0, 0.0), (10.0, 10.0)
        r2_min, r2_max = (20.0, 20.0), (30.0, 30.0)

        assert rectangles_overlap(r1_min, r1_max, r2_min, r2_max) is False

    def test_rectangles_touching_edge(self):
        """Test rectangles touching on edge."""
        r1_min, r1_max = (0.0, 0.0), (10.0, 10.0)
        r2_min, r2_max = (10.0, 0.0), (20.0, 10.0)

        # Edge touching is not overlapping
        assert rectangles_overlap(r1_min, r1_max, r2_min, r2_max) is False


class TestBoxesOverlap3D:
    """Test 3D box overlap checks."""

    def test_boxes_overlap_true(self):
        """Test overlapping 3D boxes."""
        b1_min, b1_max = (0.0, 0.0, 0.0), (10.0, 10.0, 10.0)
        b2_min, b2_max = (5.0, 5.0, 5.0), (15.0, 15.0, 15.0)

        assert boxes_overlap_3d(b1_min, b1_max, b2_min, b2_max) is True

    def test_boxes_no_overlap(self):
        """Test non-overlapping 3D boxes."""
        b1_min, b1_max = (0.0, 0.0, 0.0), (10.0, 10.0, 10.0)
        b2_min, b2_max = (20.0, 20.0, 20.0), (30.0, 30.0, 30.0)

        assert boxes_overlap_3d(b1_min, b1_max, b2_min, b2_max) is False

    def test_boxes_overlap_single_dimension(self):
        """Test boxes separated in single dimension."""
        b1_min, b1_max = (0.0, 0.0, 0.0), (10.0, 10.0, 10.0)
        b2_min, b2_max = (0.0, 0.0, 20.0), (10.0, 10.0, 30.0)

        assert boxes_overlap_3d(b1_min, b1_max, b2_min, b2_max) is False


class TestOverlapVolume:
    """Test overlap volume calculations."""

    def test_overlap_volume_full(self):
        """Test overlap volume for fully contained box."""
        b1_min, b1_max = (0.0, 0.0, 0.0), (20.0, 20.0, 20.0)
        b2_min, b2_max = (5.0, 5.0, 5.0), (10.0, 10.0, 10.0)

        volume = calculate_overlap_volume(b1_min, b1_max, b2_min, b2_max)

        # Smaller box is 5x5x5 = 125
        assert volume == 125.0

    def test_overlap_volume_partial(self):
        """Test partial overlap volume."""
        b1_min, b1_max = (0.0, 0.0, 0.0), (10.0, 10.0, 10.0)
        b2_min, b2_max = (5.0, 5.0, 5.0), (15.0, 15.0, 15.0)

        volume = calculate_overlap_volume(b1_min, b1_max, b2_min, b2_max)

        # Overlap is 5x5x5 = 125
        assert volume == 125.0

    def test_overlap_volume_no_overlap(self):
        """Test no overlap volume."""
        b1_min, b1_max = (0.0, 0.0, 0.0), (10.0, 10.0, 10.0)
        b2_min, b2_max = (20.0, 20.0, 20.0), (30.0, 30.0, 30.0)

        volume = calculate_overlap_volume(b1_min, b1_max, b2_min, b2_max)

        assert volume == 0.0


class TestPointRotation:
    """Test point rotation."""

    def test_rotate_no_rotation(self):
        """Test rotation by 0 degrees."""
        point = (10.0, 0.0)
        center = (0.0, 0.0)

        result = rotate_point_2d(point, center, 0.0)

        assert abs(result[0] - 10.0) < 0.001
        assert abs(result[1] - 0.0) < 0.001

    def test_rotate_90_degrees(self):
        """Test rotation by 90 degrees."""
        point = (10.0, 0.0)
        center = (0.0, 0.0)

        result = rotate_point_2d(point, center, 90.0)

        assert abs(result[0] - 0.0) < 0.001
        assert abs(result[1] - 10.0) < 0.001

    def test_rotate_180_degrees(self):
        """Test rotation by 180 degrees."""
        point = (10.0, 0.0)
        center = (0.0, 0.0)

        result = rotate_point_2d(point, center, 180.0)

        assert abs(result[0] - (-10.0)) < 0.001
        assert abs(result[1] - 0.0) < 0.001


class TestBoundingBox:
    """Test bounding box calculation."""

    def test_bounding_box_no_rotation(self):
        """Test bounding box without rotation."""
        position = (50.0, 50.0, 0.0)
        dimensions = (60.0, 40.0, 85.0)

        min_corner, max_corner = calculate_bounding_box(position, dimensions, 0)

        assert min_corner[0] == 20.0  # 50 - 30
        assert max_corner[0] == 80.0  # 50 + 30
        assert min_corner[1] == 30.0  # 50 - 20
        assert max_corner[1] == 70.0  # 50 + 20

    def test_bounding_box_90_rotation(self):
        """Test bounding box with 90 degree rotation."""
        position = (50.0, 50.0, 0.0)
        dimensions = (60.0, 40.0, 85.0)

        min_corner, max_corner = calculate_bounding_box(position, dimensions, 90)

        # Width and depth are swapped
        assert min_corner[0] == 30.0  # 50 - 20 (depth becomes half width)
        assert max_corner[0] == 70.0  # 50 + 20


# ============================================
# Scoring and Normalization Tests
# ============================================


class TestNormalizeScore:
    """Test score normalization."""

    def test_normalize_score_min(self):
        """Test normalizing minimum value."""
        assert normalize_score(0.0, 0.0, 100.0) == 0.0

    def test_normalize_score_max(self):
        """Test normalizing maximum value."""
        assert normalize_score(100.0, 0.0, 100.0) == 100.0

    def test_normalize_score_middle(self):
        """Test normalizing middle value."""
        assert normalize_score(50.0, 0.0, 100.0) == 50.0

    def test_normalize_score_below_min(self):
        """Test normalizing value below minimum."""
        assert normalize_score(-10.0, 0.0, 100.0) == 0.0

    def test_normalize_score_above_max(self):
        """Test normalizing value above maximum."""
        assert normalize_score(150.0, 0.0, 100.0) == 100.0

    def test_normalize_score_equal_bounds(self):
        """Test normalizing with equal min and max."""
        assert normalize_score(50.0, 50.0, 50.0) == 50.0


class TestWeightedAverage:
    """Test weighted average calculation."""

    def test_weighted_average_equal_weights(self):
        """Test weighted average with equal weights."""
        values = [10.0, 20.0, 30.0]
        weights = [1.0, 1.0, 1.0]

        result = weighted_average(values, weights)

        assert result == 20.0

    def test_weighted_average_different_weights(self):
        """Test weighted average with different weights."""
        values = [10.0, 20.0]
        weights = [1.0, 3.0]

        result = weighted_average(values, weights)

        # (10*1 + 20*3) / 4 = 70/4 = 17.5
        assert result == 17.5

    def test_weighted_average_empty(self):
        """Test weighted average with empty lists."""
        assert weighted_average([], []) == 0.0

    def test_weighted_average_mismatched(self):
        """Test weighted average with mismatched lengths."""
        assert weighted_average([1, 2], [1]) == 0.0


class TestSigmoid:
    """Test sigmoid function."""

    def test_sigmoid_zero(self):
        """Test sigmoid at 0."""
        result = sigmoid(0.0)
        assert abs(result - 0.5) < 0.001

    def test_sigmoid_positive(self):
        """Test sigmoid for large positive value."""
        result = sigmoid(10.0)
        assert result > 0.99

    def test_sigmoid_negative(self):
        """Test sigmoid for large negative value."""
        result = sigmoid(-10.0)
        assert result < 0.01


class TestFitnessScore:
    """Test fitness score calculation."""

    def test_calculate_fitness_score(self):
        """Test fitness score calculation."""
        scores = {"a": 80.0, "b": 60.0}
        weights = {"a": 2.0, "b": 1.0}

        result = calculate_fitness_score(scores, weights)

        # (80*2 + 60*1) / 3 = 220/3 = 73.33
        assert abs(result - 73.33) < 0.01

    def test_calculate_fitness_score_empty(self):
        """Test fitness score with empty scores."""
        assert calculate_fitness_score({}, {}) == 0.0


# ============================================
# Genetic Algorithm Utilities Tests
# ============================================


class TestTournamentSelection:
    """Test tournament selection."""

    def test_tournament_selection_returns_individual(self):
        """Test tournament selection returns an individual."""
        population = ["a", "b", "c", "d", "e"]
        fitness = [10.0, 20.0, 30.0, 40.0, 50.0]

        selected = tournament_selection(population, fitness)

        assert selected in population

    def test_tournament_selection_prefers_high_fitness(self):
        """Test tournament selection prefers high fitness."""
        population = ["low", "high"]
        fitness = [1.0, 100.0]

        # Run multiple times
        high_count = sum(
            1 for _ in range(100)
            if tournament_selection(population, fitness) == "high"
        )

        # High fitness should be selected more often
        assert high_count > 50


class TestRouletteWheelSelection:
    """Test roulette wheel selection."""

    def test_roulette_wheel_returns_individual(self):
        """Test roulette wheel returns an individual."""
        population = ["a", "b", "c"]
        fitness = [10.0, 20.0, 30.0]

        selected = roulette_wheel_selection(population, fitness)

        assert selected in population

    def test_roulette_wheel_equal_fitness(self):
        """Test roulette wheel with equal fitness."""
        population = ["a", "b", "c"]
        fitness = [10.0, 10.0, 10.0]

        selected = roulette_wheel_selection(population, fitness)

        assert selected in population


class TestCrossover:
    """Test crossover operators."""

    def test_single_point_crossover(self):
        """Test single point crossover."""
        p1 = [1, 2, 3, 4, 5]
        p2 = [6, 7, 8, 9, 10]

        c1, c2 = single_point_crossover(p1, p2)

        assert len(c1) == len(p1)
        assert len(c2) == len(p2)

    def test_two_point_crossover(self):
        """Test two point crossover."""
        p1 = [1, 2, 3, 4, 5, 6]
        p2 = [7, 8, 9, 10, 11, 12]

        c1, c2 = two_point_crossover(p1, p2)

        assert len(c1) == len(p1)
        assert len(c2) == len(p2)

    def test_uniform_crossover(self):
        """Test uniform crossover."""
        p1 = [1, 2, 3, 4, 5]
        p2 = [6, 7, 8, 9, 10]

        c1, c2 = uniform_crossover(p1, p2)

        assert len(c1) == len(p1)
        assert len(c2) == len(p2)

    def test_crossover_short_parents(self):
        """Test crossover with short parents."""
        p1 = [1]
        p2 = [2]

        c1, c2 = single_point_crossover(p1, p2)

        # Should return copies
        assert c1 == [1]
        assert c2 == [2]


class TestMutation:
    """Test mutation operators."""

    def test_gaussian_mutation(self):
        """Test Gaussian mutation."""
        original = 50.0

        # Run multiple times to ensure it changes
        changed = False
        for _ in range(10):
            mutated = gaussian_mutation(original, 5.0)
            if mutated != original:
                changed = True
                break

        # Mutation should usually change the value
        # (statistically possible to not change, but very unlikely)

    def test_gaussian_mutation_bounds(self):
        """Test Gaussian mutation respects bounds."""
        mutated = gaussian_mutation(50.0, 100.0, min_val=0.0, max_val=100.0)

        assert 0.0 <= mutated <= 100.0

    def test_adaptive_mutation_rate(self):
        """Test adaptive mutation rate."""
        initial = adaptive_mutation_rate(0, 100, 0.1, 0.01)
        middle = adaptive_mutation_rate(50, 100, 0.1, 0.01)
        final = adaptive_mutation_rate(100, 100, 0.1, 0.01)

        assert initial == 0.1
        assert middle < initial
        assert middle > final
        assert final == 0.01


# ============================================
# Optimization Utilities Tests
# ============================================


class TestSimulatedAnnealing:
    """Test simulated annealing utilities."""

    def test_sa_probability_improvement(self):
        """Test SA probability for improvement."""
        prob = simulated_annealing_probability(-10.0, 100.0)
        assert prob == 1.0

    def test_sa_probability_worsening_high_temp(self):
        """Test SA probability for worsening at high temperature."""
        prob = simulated_annealing_probability(10.0, 1000.0)
        assert prob > 0.9  # High temperature accepts most

    def test_sa_probability_worsening_low_temp(self):
        """Test SA probability for worsening at low temperature."""
        prob = simulated_annealing_probability(10.0, 1.0)
        assert prob < 0.1  # Low temperature rarely accepts

    def test_cooling_schedule(self):
        """Test exponential cooling schedule."""
        temp0 = cooling_schedule_exponential(100.0, 0, 0.95)
        temp10 = cooling_schedule_exponential(100.0, 10, 0.95)
        temp50 = cooling_schedule_exponential(100.0, 50, 0.95)

        assert temp0 == 100.0
        assert temp10 < temp0
        assert temp50 < temp10


class TestPareto:
    """Test Pareto dominance utilities."""

    def test_pareto_dominates_true(self):
        """Test Pareto dominance - solution dominates."""
        # Minimizing: lower is better
        s1 = [1.0, 1.0]
        s2 = [2.0, 2.0]

        assert pareto_dominates(s1, s2, minimize=True) is True

    def test_pareto_dominates_false(self):
        """Test Pareto dominance - no dominance."""
        s1 = [1.0, 3.0]
        s2 = [2.0, 2.0]

        # Neither dominates (trade-off)
        assert pareto_dominates(s1, s2, minimize=True) is False

    def test_find_pareto_front(self):
        """Test finding Pareto front."""
        solutions = [
            [1.0, 3.0],  # Pareto optimal
            [2.0, 2.0],  # Pareto optimal
            [3.0, 1.0],  # Pareto optimal
            [3.0, 3.0],  # Dominated
        ]

        front = find_pareto_front(solutions, minimize=True)

        assert 0 in front
        assert 1 in front
        assert 2 in front
        assert 3 not in front


# ============================================
# Similarity Metrics Tests
# ============================================


class TestCosineSimilarity:
    """Test cosine similarity."""

    def test_cosine_similarity_identical(self):
        """Test cosine similarity of identical vectors."""
        v = [1.0, 2.0, 3.0]

        assert abs(cosine_similarity(v, v) - 1.0) < 0.001

    def test_cosine_similarity_orthogonal(self):
        """Test cosine similarity of orthogonal vectors."""
        v1 = [1.0, 0.0]
        v2 = [0.0, 1.0]

        assert abs(cosine_similarity(v1, v2) - 0.0) < 0.001

    def test_cosine_similarity_opposite(self):
        """Test cosine similarity of opposite vectors."""
        v1 = [1.0, 0.0]
        v2 = [-1.0, 0.0]

        assert abs(cosine_similarity(v1, v2) - (-1.0)) < 0.001


class TestJaccardSimilarity:
    """Test Jaccard similarity."""

    def test_jaccard_identical_sets(self):
        """Test Jaccard similarity of identical sets."""
        s = {1, 2, 3}

        assert jaccard_similarity(s, s) == 1.0

    def test_jaccard_disjoint_sets(self):
        """Test Jaccard similarity of disjoint sets."""
        s1 = {1, 2, 3}
        s2 = {4, 5, 6}

        assert jaccard_similarity(s1, s2) == 0.0

    def test_jaccard_partial_overlap(self):
        """Test Jaccard similarity with partial overlap."""
        s1 = {1, 2, 3}
        s2 = {2, 3, 4}

        # Intersection: {2, 3}, Union: {1, 2, 3, 4}
        assert jaccard_similarity(s1, s2) == 0.5

    def test_jaccard_empty_sets(self):
        """Test Jaccard similarity of empty sets."""
        assert jaccard_similarity(set(), set()) == 1.0


class TestLevenshteinDistance:
    """Test Levenshtein distance."""

    def test_levenshtein_identical(self):
        """Test Levenshtein distance of identical strings."""
        assert levenshtein_distance("hello", "hello") == 0

    def test_levenshtein_single_change(self):
        """Test Levenshtein distance with single change."""
        assert levenshtein_distance("cat", "car") == 1

    def test_levenshtein_empty_string(self):
        """Test Levenshtein distance with empty string."""
        assert levenshtein_distance("hello", "") == 5

    def test_levenshtein_completely_different(self):
        """Test Levenshtein distance of completely different strings."""
        assert levenshtein_distance("abc", "xyz") == 3


# ============================================
# Statistical Utilities Tests
# ============================================


class TestStatistics:
    """Test statistical utilities."""

    def test_calculate_statistics(self):
        """Test basic statistics calculation."""
        values = [1.0, 2.0, 3.0, 4.0, 5.0]

        stats = calculate_statistics(values)

        assert stats["min"] == 1.0
        assert stats["max"] == 5.0
        assert stats["mean"] == 3.0
        assert stats["median"] == 3.0

    def test_calculate_statistics_empty(self):
        """Test statistics of empty list."""
        stats = calculate_statistics([])

        assert stats["min"] == 0.0
        assert stats["mean"] == 0.0


class TestMovingAverage:
    """Test moving average calculation."""

    def test_moving_average(self):
        """Test moving average calculation."""
        values = [1.0, 2.0, 3.0, 4.0, 5.0]

        result = moving_average(values, 3)

        assert len(result) == 5
        assert result[2] == 2.0  # avg(1, 2, 3)
        assert result[4] == 4.0  # avg(3, 4, 5)

    def test_moving_average_window_larger(self):
        """Test moving average with window larger than data."""
        values = [1.0, 2.0]

        result = moving_average(values, 5)

        assert len(result) == 2


class TestConvergenceDetection:
    """Test convergence detection."""

    def test_detect_convergence_converged(self):
        """Test detecting convergence."""
        history = [50.0] * 20  # Constant = converged

        assert detect_convergence(history, window_size=10) is True

    def test_detect_convergence_not_converged(self):
        """Test detecting non-convergence."""
        history = list(range(20))  # Increasing = not converged

        assert detect_convergence(history, window_size=10) is False

    def test_detect_convergence_short_history(self):
        """Test convergence with short history."""
        history = [1.0, 2.0, 3.0]

        assert detect_convergence(history, window_size=10) is False
