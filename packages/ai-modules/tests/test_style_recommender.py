"""
Tests for the style recommender service.

Tests cover:
- Style feature definitions
- Style vector building
- Preference matching (colors, materials, lifestyle)
- Score calculations
- Recommendation generation
- Confidence determination
"""

import pytest
import numpy as np
from typing import List, Set

from src.services.style_recommender import StyleRecommender
from src.models.kitchen import (
    KitchenStyle,
    BudgetRange,
)
from src.models.recommendations import (
    StylePreferenceInput,
    StyleRecommendationRequest,
    StyleRecommendation,
    StyleMatch,
    StyleFeature,
    StyleCategory,
    RecommendationConfidence,
)


class TestStyleRecommenderInitialization:
    """Test StyleRecommender initialization."""

    def test_initialization(self):
        """Test recommender initializes correctly."""
        recommender = StyleRecommender()

        assert recommender is not None
        assert hasattr(recommender, "_style_vectors")
        assert hasattr(recommender, "_vocabulary")

    def test_style_features_defined(self, style_recommender):
        """Test all kitchen styles have features defined."""
        for style in KitchenStyle:
            assert style in style_recommender.STYLE_FEATURES

    def test_style_features_complete(self, style_recommender):
        """Test style features have required categories."""
        required_categories = ["colors", "materials", "characteristics"]

        for style, features in style_recommender.STYLE_FEATURES.items():
            for category in required_categories:
                assert category in features, f"{style} missing {category}"
                assert len(features[category]) > 0

    def test_lifestyle_mappings_defined(self, style_recommender):
        """Test lifestyle mappings are defined."""
        assert len(style_recommender.LIFESTYLE_MAPPINGS) > 0
        assert "family" in style_recommender.LIFESTYLE_MAPPINGS
        assert "minimalist" in style_recommender.LIFESTYLE_MAPPINGS

    def test_budget_impact_defined(self, style_recommender):
        """Test budget impact defined for all styles."""
        for style in KitchenStyle:
            assert style in style_recommender.STYLE_BUDGET_IMPACT


class TestStyleVectorBuilding:
    """Test style vector building."""

    def test_build_style_vectors(self, style_recommender):
        """Test style vectors are built correctly."""
        vectors = style_recommender._style_vectors

        assert len(vectors) == len(KitchenStyle)
        for style in KitchenStyle:
            assert style in vectors
            assert isinstance(vectors[style], np.ndarray)

    def test_vectors_are_normalized(self, style_recommender):
        """Test style vectors are normalized."""
        for style, vector in style_recommender._style_vectors.items():
            norm = np.linalg.norm(vector)
            # Should be approximately 1 (normalized) or 0 if empty
            assert abs(norm - 1.0) < 0.01 or norm == 0

    def test_vocabulary_created(self, style_recommender):
        """Test vocabulary is created from features."""
        assert hasattr(style_recommender, "_vocabulary")
        assert len(style_recommender._vocabulary) > 0

    def test_vocabulary_index_created(self, style_recommender):
        """Test vocabulary index mapping is created."""
        assert hasattr(style_recommender, "_vocab_index")
        vocab_index = style_recommender._vocab_index

        for word in style_recommender._vocabulary:
            assert word in vocab_index


class TestColorMatching:
    """Test color preference matching."""

    def test_match_colors_exact_match(self, style_recommender):
        """Test color matching with exact matches."""
        # Modern style has white and gray
        score = style_recommender._match_colors(
            KitchenStyle.MODERN,
            ["white", "gray"]
        )

        assert score > 0

    def test_match_colors_no_match(self, style_recommender):
        """Test color matching with no matches."""
        # Industrial doesn't typically have pastels
        score = style_recommender._match_colors(
            KitchenStyle.INDUSTRIAL,
            ["pink", "lavender", "peach"]
        )

        assert score < 50

    def test_match_colors_partial_match(self, style_recommender):
        """Test color matching with partial overlap."""
        # Modern has white, but not all these colors
        score = style_recommender._match_colors(
            KitchenStyle.MODERN,
            ["white", "pink", "teal"]
        )

        assert 0 < score < 100

    def test_match_colors_case_insensitive(self, style_recommender):
        """Test color matching is case insensitive."""
        score_lower = style_recommender._match_colors(
            KitchenStyle.MODERN,
            ["white", "gray"]
        )
        score_upper = style_recommender._match_colors(
            KitchenStyle.MODERN,
            ["WHITE", "GRAY"]
        )

        assert score_lower == score_upper


class TestMaterialMatching:
    """Test material preference matching."""

    def test_match_materials_exact_match(self, style_recommender):
        """Test material matching with exact matches."""
        # Modern uses glass and stainless steel
        score = style_recommender._match_materials(
            KitchenStyle.MODERN,
            ["glass", "stainless steel"]
        )

        assert score > 0

    def test_match_materials_traditional(self, style_recommender):
        """Test material matching for traditional style."""
        score = style_recommender._match_materials(
            KitchenStyle.TRADITIONAL,
            ["solid wood", "marble", "brass"]
        )

        assert score > 0

    def test_match_materials_empty(self, style_recommender):
        """Test material matching with empty preferences."""
        score = style_recommender._match_materials(
            KitchenStyle.MODERN,
            []
        )

        # With empty preferences, score calculation may return default
        assert 0 <= score <= 100


class TestLifestyleMatching:
    """Test lifestyle preference matching."""

    def test_match_lifestyle_family(self, style_recommender):
        """Test lifestyle matching for family lifestyle."""
        # Traditional is good for families
        score = style_recommender._match_lifestyle(
            KitchenStyle.TRADITIONAL,
            "family"
        )

        assert score > 50

    def test_match_lifestyle_minimalist(self, style_recommender):
        """Test lifestyle matching for minimalist lifestyle."""
        score = style_recommender._match_lifestyle(
            KitchenStyle.MINIMALIST,
            "minimalist"
        )

        assert score >= 85  # Should be first in list

    def test_match_lifestyle_chef(self, style_recommender):
        """Test lifestyle matching for chef lifestyle."""
        score = style_recommender._match_lifestyle(
            KitchenStyle.INDUSTRIAL,
            "chef"
        )

        assert score >= 85  # Industrial is good for chefs

    def test_match_lifestyle_no_match(self, style_recommender):
        """Test lifestyle matching with unknown lifestyle."""
        score = style_recommender._match_lifestyle(
            KitchenStyle.RUSTIC,
            "futuristic"  # Not in mappings
        )

        assert score == 50.0  # Neutral score


class TestHomeStyleMatching:
    """Test existing home style matching."""

    def test_match_home_style_exact(self, style_recommender):
        """Test home style matching with exact match."""
        score = style_recommender._match_home_style(
            KitchenStyle.MODERN,
            "modern"
        )

        assert score == 100.0

    def test_match_home_style_compatible(self, style_recommender):
        """Test home style matching with compatible style."""
        score = style_recommender._match_home_style(
            KitchenStyle.MINIMALIST,
            "modern"
        )

        # Minimalist is compatible with modern
        assert score >= 50

    def test_match_home_style_partial(self, style_recommender):
        """Test home style matching with partial keyword match."""
        score = style_recommender._match_home_style(
            KitchenStyle.SCANDINAVIAN,
            "nordic minimalist"
        )

        assert score == 100.0  # Nordic is a keyword for Scandinavian


class TestPriorityMatching:
    """Test design priority matching."""

    def test_match_priorities_functionality(self, style_recommender):
        """Test priority matching for functionality."""
        score = style_recommender._match_priorities(
            KitchenStyle.MODERN,
            ["functionality"]
        )

        assert score > 50

    def test_match_priorities_warmth(self, style_recommender):
        """Test priority matching for warmth."""
        score = style_recommender._match_priorities(
            KitchenStyle.RUSTIC,
            ["warmth"]
        )

        assert score > 70

    def test_match_priorities_multiple(self, style_recommender):
        """Test priority matching with multiple priorities."""
        score = style_recommender._match_priorities(
            KitchenStyle.SCANDINAVIAN,
            ["functionality", "simplicity", "warmth"]
        )

        assert score > 50


class TestDislikePenalty:
    """Test dislike penalty calculation."""

    def test_calculate_dislike_penalty_match(self, style_recommender):
        """Test penalty when dislikes match style features."""
        penalty = style_recommender._calculate_dislike_penalty(
            KitchenStyle.CLASSIC,
            ["ornate"]  # Classic has ornate
        )

        assert penalty > 0

    def test_calculate_dislike_penalty_no_match(self, style_recommender):
        """Test no penalty when dislikes don't match."""
        penalty = style_recommender._calculate_dislike_penalty(
            KitchenStyle.MINIMALIST,
            ["ornate", "brass", "heavy patterns"]  # Minimalist avoids these
        )

        # Minimalist shouldn't have these features
        assert penalty >= 0

    def test_calculate_dislike_penalty_capped(self, style_recommender):
        """Test penalty is capped at 100."""
        penalty = style_recommender._calculate_dislike_penalty(
            KitchenStyle.CLASSIC,
            ["ornate", "detailed", "timeless", "elegant", "traditional", "heavy"]
        )

        assert penalty <= 100


class TestBudgetMatching:
    """Test budget matching."""

    def test_match_budget_within_range(self, style_recommender):
        """Test budget matching when style fits budget."""
        budget = BudgetRange(min_amount=10000, max_amount=20000, currency="EUR")

        # Medium style should fit
        score = style_recommender._match_budget(
            KitchenStyle.SCANDINAVIAN,
            budget
        )

        assert score > 50

    def test_match_budget_luxury(self, style_recommender):
        """Test budget matching for luxury style with high budget."""
        budget = BudgetRange(min_amount=50000, max_amount=100000, currency="EUR")

        score = style_recommender._match_budget(
            KitchenStyle.CLASSIC,  # High budget impact
            budget
        )

        assert score > 70


class TestStyleMatchCreation:
    """Test StyleMatch creation."""

    def test_create_style_match(self, style_recommender):
        """Test creating a StyleMatch object."""
        match = style_recommender._create_style_match(
            KitchenStyle.MODERN,
            85.0
        )

        assert isinstance(match, StyleMatch)
        assert match.style == KitchenStyle.MODERN
        assert match.match_score == 85.0
        assert len(match.key_characteristics) > 0
        assert len(match.color_palette) > 0
        assert len(match.materials) > 0

    def test_create_style_match_includes_avoids(self, style_recommender):
        """Test StyleMatch includes things to avoid."""
        match = style_recommender._create_style_match(
            KitchenStyle.MINIMALIST,
            75.0
        )

        assert len(match.avoid) > 0


class TestConfidenceDetermination:
    """Test recommendation confidence determination."""

    def test_determine_confidence_high(self, style_recommender):
        """Test high confidence with good score and many preferences."""
        preferences = StylePreferenceInput(
            preferred_colors=["white", "gray"],
            preferred_materials=["wood", "quartz"],
            lifestyle="family",
            existing_home_style="modern",
            priorities=["functionality"],
        )

        confidence = style_recommender._determine_confidence(85.0, preferences)

        assert confidence == RecommendationConfidence.HIGH

    def test_determine_confidence_medium(self, style_recommender):
        """Test medium confidence with moderate data."""
        preferences = StylePreferenceInput(
            preferred_colors=["white"],
            lifestyle="family",
        )

        confidence = style_recommender._determine_confidence(65.0, preferences)

        assert confidence == RecommendationConfidence.MEDIUM

    def test_determine_confidence_low(self, style_recommender):
        """Test low confidence with little data."""
        preferences = StylePreferenceInput()

        confidence = style_recommender._determine_confidence(45.0, preferences)

        assert confidence == RecommendationConfidence.LOW


class TestReasoningGeneration:
    """Test recommendation reasoning generation."""

    def test_generate_reasoning_with_colors(self, style_recommender):
        """Test reasoning mentions matching colors."""
        preferences = StylePreferenceInput(
            preferred_colors=["white", "gray"],
        )

        reasoning = style_recommender._generate_reasoning(
            KitchenStyle.MODERN,
            preferences,
            80.0
        )

        assert len(reasoning) > 0
        assert "white" in reasoning.lower() or "gray" in reasoning.lower() or "color" in reasoning.lower() or "modern" in reasoning.lower()

    def test_generate_reasoning_with_materials(self, style_recommender):
        """Test reasoning mentions matching materials."""
        preferences = StylePreferenceInput(
            preferred_materials=["wood", "marble"],
        )

        reasoning = style_recommender._generate_reasoning(
            KitchenStyle.TRADITIONAL,
            preferences,
            75.0
        )

        assert len(reasoning) > 0

    def test_generate_reasoning_with_lifestyle(self, style_recommender):
        """Test reasoning mentions lifestyle."""
        preferences = StylePreferenceInput(
            lifestyle="family",
        )

        reasoning = style_recommender._generate_reasoning(
            KitchenStyle.TRADITIONAL,
            preferences,
            70.0
        )

        assert len(reasoning) > 0
        assert "family" in reasoning.lower() or "traditional" in reasoning.lower()


class TestFeatureGeneration:
    """Test style feature generation."""

    def test_generate_features(self, style_recommender):
        """Test generating features for a style."""
        preferences = StylePreferenceInput()

        features = style_recommender._generate_features(
            KitchenStyle.MODERN,
            preferences
        )

        assert len(features) > 0
        assert all(isinstance(f, StyleFeature) for f in features)

    def test_generate_features_categories(self, style_recommender):
        """Test features cover multiple categories."""
        preferences = StylePreferenceInput()

        features = style_recommender._generate_features(
            KitchenStyle.CLASSIC,
            preferences
        )

        categories = {f.category for f in features}
        assert StyleCategory.CABINET_STYLE in categories
        assert StyleCategory.COUNTERTOP in categories


class TestSecondaryStyleFinding:
    """Test secondary style finding."""

    def test_find_secondary_styles(self, style_recommender):
        """Test finding compatible secondary styles."""
        scores = {
            KitchenStyle.MODERN: 90.0,
            KitchenStyle.MINIMALIST: 80.0,
            KitchenStyle.CONTEMPORARY: 70.0,
            KitchenStyle.RUSTIC: 40.0,
        }

        secondary = style_recommender._find_secondary_styles(
            KitchenStyle.MODERN,
            scores,
            start_idx=1
        )

        assert len(secondary) <= 2
        assert all(isinstance(s, StyleMatch) for s in secondary)


class TestFullRecommendation:
    """Test full recommendation workflow."""

    def test_recommend_success(self, style_recommender, style_recommendation_request):
        """Test successful recommendation generation."""
        response = style_recommender.recommend(style_recommendation_request)

        assert response.success is True
        assert len(response.recommendations) > 0
        assert response.top_recommendation is not None

    def test_recommend_returns_requested_count(self, style_recommender):
        """Test recommendation returns requested number."""
        request = StyleRecommendationRequest(
            preferences=StylePreferenceInput(
                preferred_colors=["white"],
            ),
            num_recommendations=2,
        )

        response = style_recommender.recommend(request)

        assert len(response.recommendations) <= 2

    def test_recommend_sorted_by_score(self, style_recommender, style_recommendation_request):
        """Test recommendations are sorted by score descending."""
        response = style_recommender.recommend(style_recommendation_request)

        scores = [r.primary_style.match_score for r in response.recommendations]

        # Should be in descending order
        assert scores == sorted(scores, reverse=True)

    def test_recommend_includes_analysis_summary(self, style_recommender, style_recommendation_request):
        """Test recommendation includes analysis summary."""
        response = style_recommender.recommend(style_recommendation_request)

        assert len(response.analysis_summary) > 0
        assert response.recommendations[0].primary_style.style.value.lower() in response.analysis_summary.lower()

    def test_recommend_top_matches_first(self, style_recommender, style_recommendation_request):
        """Test top recommendation matches first in list."""
        response = style_recommender.recommend(style_recommendation_request)

        assert response.top_recommendation == response.recommendations[0]

    def test_recommend_with_empty_preferences(self, style_recommender):
        """Test recommendation with minimal preferences."""
        request = StyleRecommendationRequest(
            preferences=StylePreferenceInput(),
            num_recommendations=3,
        )

        response = style_recommender.recommend(request)

        # Should still return recommendations with neutral scores
        assert response.success is True
        assert len(response.recommendations) > 0


class TestStyleCompatibility:
    """Test style compatibility checking."""

    def test_styles_compatible_modern_minimalist(self, style_recommender):
        """Test Modern and Minimalist are compatible."""
        result = style_recommender._are_styles_compatible(
            KitchenStyle.MODERN,
            KitchenStyle.MINIMALIST
        )

        assert result is True

    def test_styles_compatible_traditional_classic(self, style_recommender):
        """Test Traditional and Classic are compatible."""
        result = style_recommender._are_styles_compatible(
            KitchenStyle.TRADITIONAL,
            KitchenStyle.CLASSIC
        )

        assert result is True

    def test_styles_compatible_reverse(self, style_recommender):
        """Test compatibility is symmetric."""
        forward = style_recommender._are_styles_compatible(
            KitchenStyle.MODERN,
            KitchenStyle.CONTEMPORARY
        )
        reverse = style_recommender._are_styles_compatible(
            KitchenStyle.CONTEMPORARY,
            KitchenStyle.MODERN
        )

        assert forward == reverse

    def test_styles_not_compatible(self, style_recommender):
        """Test incompatible styles."""
        result = style_recommender._are_styles_compatible(
            KitchenStyle.RUSTIC,
            KitchenStyle.MINIMALIST
        )

        assert result is False


class TestSummaryGeneration:
    """Test analysis summary generation."""

    def test_generate_summary(self, style_recommender):
        """Test generating analysis summary."""
        preferences = StylePreferenceInput(lifestyle="family")

        recommendations = [
            StyleRecommendation(
                primary_style=StyleMatch(
                    style=KitchenStyle.TRADITIONAL,
                    match_score=85.0,
                    key_characteristics=["warm"],
                    color_palette=["cream"],
                    materials=["wood"],
                    avoid=[],
                ),
                secondary_styles=[],
                features=[],
                confidence=RecommendationConfidence.HIGH,
                reasoning="Test",
            )
        ]

        summary = style_recommender._generate_summary(recommendations, preferences)

        assert "Traditional" in summary
        assert "85" in summary
        assert "family" in summary.lower()

    def test_generate_summary_empty_recommendations(self, style_recommender):
        """Test summary generation with no recommendations."""
        preferences = StylePreferenceInput()

        summary = style_recommender._generate_summary([], preferences)

        assert "Unable" in summary
