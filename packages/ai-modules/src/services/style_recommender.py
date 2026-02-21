"""
ML-based style recommendation service for KitchenXpert.
Analyzes user preferences to recommend kitchen styles.
"""

from typing import List, Dict, Optional, Tuple, Set
import numpy as np
from collections import defaultdict

from ..models.kitchen import (
    KitchenStyle,
    BudgetRange,
    RoomConfiguration,
)
from ..models.recommendations import (
    RecommendationConfidence,
    StyleCategory,
    StyleFeature,
    StyleMatch,
    StylePreferenceInput,
    StyleRecommendationRequest,
    StyleRecommendation,
    StyleRecommendationResponse,
)
from ..utils.algorithms import (
    cosine_similarity,
    jaccard_similarity,
    normalize_score,
    weighted_average,
)


class StyleRecommender:
    """
    ML-based style recommendation engine.

    Uses feature extraction and similarity matching to recommend
    kitchen styles based on user preferences.
    """

    # Style definitions with characteristic features
    STYLE_FEATURES: Dict[KitchenStyle, Dict[str, List[str]]] = {
        KitchenStyle.MODERN: {
            "colors": ["white", "gray", "black", "navy", "charcoal"],
            "materials": ["lacquer", "glass", "stainless steel", "acrylic", "quartz"],
            "characteristics": ["clean lines", "handleless", "minimalist", "sleek", "high-gloss"],
            "cabinet_styles": ["flat-panel", "slab", "high-gloss", "handleless"],
            "hardware": ["integrated", "push-to-open", "linear pulls", "hidden"],
            "countertops": ["quartz", "engineered stone", "concrete", "stainless steel"],
            "lighting": ["recessed", "under-cabinet LED", "pendant", "track"],
        },
        KitchenStyle.CLASSIC: {
            "colors": ["white", "cream", "navy", "forest green", "burgundy"],
            "materials": ["wood", "marble", "brass", "ceramic", "granite"],
            "characteristics": ["ornate", "detailed", "timeless", "elegant", "traditional"],
            "cabinet_styles": ["raised-panel", "beadboard", "inset", "detailed molding"],
            "hardware": ["brass", "antique bronze", "cup pulls", "decorative knobs"],
            "countertops": ["marble", "granite", "butcher block", "soapstone"],
            "lighting": ["chandeliers", "pendant", "sconces", "under-cabinet"],
        },
        KitchenStyle.SCANDINAVIAN: {
            "colors": ["white", "light gray", "pale blue", "natural wood", "soft green"],
            "materials": ["light wood", "plywood", "white lacquer", "natural stone"],
            "characteristics": ["airy", "functional", "natural", "cozy", "hygge"],
            "cabinet_styles": ["flat-panel", "shaker", "natural wood", "two-tone"],
            "hardware": ["wooden", "leather", "simple metal", "minimalist"],
            "countertops": ["wood", "white laminate", "light granite", "white quartz"],
            "lighting": ["pendant", "natural light", "simple fixtures", "warm LED"],
        },
        KitchenStyle.INDUSTRIAL: {
            "colors": ["black", "gray", "exposed brick", "metal", "concrete gray"],
            "materials": ["metal", "concrete", "reclaimed wood", "steel", "iron"],
            "characteristics": ["raw", "urban", "exposed", "utilitarian", "edgy"],
            "cabinet_styles": ["metal", "open shelving", "reclaimed wood", "minimal"],
            "hardware": ["pipe", "industrial metal", "black iron", "exposed hinges"],
            "countertops": ["concrete", "stainless steel", "butcher block", "zinc"],
            "lighting": ["Edison bulbs", "metal pendants", "exposed", "cage lights"],
        },
        KitchenStyle.RUSTIC: {
            "colors": ["warm brown", "cream", "terracotta", "sage", "mustard"],
            "materials": ["natural wood", "stone", "copper", "ceramic", "terracotta"],
            "characteristics": ["warm", "cozy", "natural", "handcrafted", "inviting"],
            "cabinet_styles": ["distressed", "natural wood", "open shelving", "farmhouse"],
            "hardware": ["wrought iron", "ceramic", "copper", "antique"],
            "countertops": ["butcher block", "natural stone", "tile", "copper"],
            "lighting": ["lanterns", "wrought iron", "candle-style", "warm"],
        },
        KitchenStyle.MINIMALIST: {
            "colors": ["white", "black", "gray", "off-white"],
            "materials": ["lacquer", "concrete", "glass", "stainless"],
            "characteristics": ["simple", "uncluttered", "essential", "clean", "zen"],
            "cabinet_styles": ["handleless", "flat-panel", "integrated", "concealed"],
            "hardware": ["hidden", "push-to-open", "integrated", "none"],
            "countertops": ["solid surface", "quartz", "concrete", "white"],
            "lighting": ["recessed", "hidden", "linear", "minimal"],
        },
        KitchenStyle.TRADITIONAL: {
            "colors": ["white", "cream", "warm wood", "blue", "green"],
            "materials": ["solid wood", "marble", "ceramic", "brass"],
            "characteristics": ["comfortable", "familiar", "welcoming", "detailed"],
            "cabinet_styles": ["raised-panel", "shaker", "glass-front", "crown molding"],
            "hardware": ["brass", "nickel", "ceramic knobs", "cup pulls"],
            "countertops": ["granite", "marble", "butcher block", "tile"],
            "lighting": ["chandeliers", "pendant", "under-cabinet", "sconces"],
        },
        KitchenStyle.CONTEMPORARY: {
            "colors": ["neutral", "bold accent", "monochrome", "mixed"],
            "materials": ["mixed media", "glass", "metal", "wood veneer"],
            "characteristics": ["current", "trendy", "mixed", "sophisticated"],
            "cabinet_styles": ["flat-panel", "mixed finishes", "floating", "asymmetric"],
            "hardware": ["varied", "statement", "geometric", "contrast"],
            "countertops": ["waterfall edge", "mixed materials", "bold patterns"],
            "lighting": ["statement pendants", "sculptural", "mixed", "smart"],
        },
    }

    # Lifestyle to style mapping
    LIFESTYLE_MAPPINGS: Dict[str, List[KitchenStyle]] = {
        "family": [KitchenStyle.TRADITIONAL, KitchenStyle.CLASSIC, KitchenStyle.SCANDINAVIAN],
        "entertaining": [KitchenStyle.CONTEMPORARY, KitchenStyle.MODERN, KitchenStyle.CLASSIC],
        "minimalist": [KitchenStyle.MINIMALIST, KitchenStyle.MODERN, KitchenStyle.SCANDINAVIAN],
        "chef": [KitchenStyle.INDUSTRIAL, KitchenStyle.MODERN, KitchenStyle.CONTEMPORARY],
        "cozy": [KitchenStyle.RUSTIC, KitchenStyle.SCANDINAVIAN, KitchenStyle.TRADITIONAL],
        "urban": [KitchenStyle.INDUSTRIAL, KitchenStyle.MODERN, KitchenStyle.CONTEMPORARY],
        "country": [KitchenStyle.RUSTIC, KitchenStyle.TRADITIONAL, KitchenStyle.CLASSIC],
        "eco-friendly": [KitchenStyle.SCANDINAVIAN, KitchenStyle.RUSTIC, KitchenStyle.MINIMALIST],
    }

    # Budget impact by style
    STYLE_BUDGET_IMPACT: Dict[KitchenStyle, str] = {
        KitchenStyle.MODERN: "medium-high",
        KitchenStyle.CLASSIC: "high",
        KitchenStyle.SCANDINAVIAN: "medium",
        KitchenStyle.INDUSTRIAL: "medium",
        KitchenStyle.RUSTIC: "medium",
        KitchenStyle.MINIMALIST: "medium-high",
        KitchenStyle.TRADITIONAL: "medium-high",
        KitchenStyle.CONTEMPORARY: "high",
    }

    def __init__(self):
        """Initialize the style recommender."""
        self._style_vectors = self._build_style_vectors()

    def _build_style_vectors(self) -> Dict[KitchenStyle, np.ndarray]:
        """Build feature vectors for each style."""
        # Create a vocabulary from all features
        vocabulary: Set[str] = set()
        for features in self.STYLE_FEATURES.values():
            for category_features in features.values():
                vocabulary.update(f.lower() for f in category_features)

        vocab_list = sorted(vocabulary)
        vocab_index = {word: idx for idx, word in enumerate(vocab_list)}

        # Build vectors
        vectors: Dict[KitchenStyle, np.ndarray] = {}
        for style, features in self.STYLE_FEATURES.items():
            vector = np.zeros(len(vocab_list))
            for category_features in features.values():
                for feature in category_features:
                    if feature.lower() in vocab_index:
                        vector[vocab_index[feature.lower()]] = 1.0
            # Normalize
            norm = np.linalg.norm(vector)
            if norm > 0:
                vector = vector / norm
            vectors[style] = vector

        self._vocabulary = vocab_list
        self._vocab_index = vocab_index
        return vectors

    def recommend(self, request: StyleRecommendationRequest) -> StyleRecommendationResponse:
        """
        Generate style recommendations based on user preferences.

        Args:
            request: Style recommendation request

        Returns:
            Style recommendation response
        """
        preferences = request.preferences

        # Calculate scores for each style
        style_scores: Dict[KitchenStyle, float] = {}

        for style in KitchenStyle:
            score = self._calculate_style_score(style, preferences, request.budget)
            style_scores[style] = score

        # Sort styles by score
        sorted_styles = sorted(
            style_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )

        # Generate recommendations
        recommendations: List[StyleRecommendation] = []
        num_recs = min(request.num_recommendations, len(sorted_styles))

        for i in range(num_recs):
            style, score = sorted_styles[i]

            # Create style match
            primary_match = self._create_style_match(style, score)

            # Find compatible secondary styles
            secondary_styles = self._find_secondary_styles(style, style_scores, i + 1)

            # Generate features
            features = self._generate_features(style, preferences)

            # Determine confidence
            confidence = self._determine_confidence(score, preferences)

            # Generate reasoning
            reasoning = self._generate_reasoning(style, preferences, score)

            recommendation = StyleRecommendation(
                primary_style=primary_match,
                secondary_styles=secondary_styles,
                features=features,
                confidence=confidence,
                reasoning=reasoning,
                estimated_budget_impact=self.STYLE_BUDGET_IMPACT.get(style, "medium"),
            )
            recommendations.append(recommendation)

        # Generate summary
        summary = self._generate_summary(recommendations, preferences)

        return StyleRecommendationResponse(
            success=True,
            recommendations=recommendations,
            top_recommendation=recommendations[0] if recommendations else None,
            analysis_summary=summary,
            errors=[],
        )

    def _calculate_style_score(
        self,
        style: KitchenStyle,
        preferences: StylePreferenceInput,
        budget: Optional[BudgetRange]
    ) -> float:
        """Calculate match score for a style based on preferences."""
        scores: List[float] = []
        weights: List[float] = []

        # Color preference matching
        if preferences.preferred_colors:
            color_score = self._match_colors(style, preferences.preferred_colors)
            scores.append(color_score)
            weights.append(0.25)

        # Material preference matching
        if preferences.preferred_materials:
            material_score = self._match_materials(style, preferences.preferred_materials)
            scores.append(material_score)
            weights.append(0.25)

        # Lifestyle matching
        if preferences.lifestyle:
            lifestyle_score = self._match_lifestyle(style, preferences.lifestyle)
            scores.append(lifestyle_score)
            weights.append(0.20)

        # Existing home style matching
        if preferences.existing_home_style:
            home_score = self._match_home_style(style, preferences.existing_home_style)
            scores.append(home_score)
            weights.append(0.15)

        # Priority matching
        if preferences.priorities:
            priority_score = self._match_priorities(style, preferences.priorities)
            scores.append(priority_score)
            weights.append(0.10)

        # Dislike penalty
        if preferences.dislikes:
            dislike_penalty = self._calculate_dislike_penalty(style, preferences.dislikes)
            scores.append(max(0, 100 - dislike_penalty))
            weights.append(0.15)

        # Budget consideration
        if budget:
            budget_score = self._match_budget(style, budget)
            scores.append(budget_score)
            weights.append(0.10)

        if not scores:
            return 50.0  # Default neutral score

        return weighted_average(scores, weights)

    def _match_colors(self, style: KitchenStyle, preferred_colors: List[str]) -> float:
        """Match user color preferences to style."""
        style_colors = set(c.lower() for c in self.STYLE_FEATURES.get(style, {}).get("colors", []))
        user_colors = set(c.lower() for c in preferred_colors)

        if not style_colors:
            return 50.0

        similarity = jaccard_similarity(style_colors, user_colors)
        return similarity * 100

    def _match_materials(self, style: KitchenStyle, preferred_materials: List[str]) -> float:
        """Match user material preferences to style."""
        style_materials = set(m.lower() for m in self.STYLE_FEATURES.get(style, {}).get("materials", []))
        user_materials = set(m.lower() for m in preferred_materials)

        if not style_materials:
            return 50.0

        similarity = jaccard_similarity(style_materials, user_materials)
        return similarity * 100

    def _match_lifestyle(self, style: KitchenStyle, lifestyle: str) -> float:
        """Match lifestyle to appropriate styles."""
        lifestyle_lower = lifestyle.lower()

        for keyword, styles in self.LIFESTYLE_MAPPINGS.items():
            if keyword in lifestyle_lower:
                if style in styles:
                    # Higher score for better match position
                    position = styles.index(style)
                    return 100 - (position * 15)

        return 50.0  # Neutral if no match

    def _match_home_style(self, style: KitchenStyle, home_style: str) -> float:
        """Match existing home style to kitchen style."""
        home_style_lower = home_style.lower()

        # Direct matches
        style_keywords = {
            KitchenStyle.MODERN: ["modern", "contemporary", "mid-century"],
            KitchenStyle.CLASSIC: ["classic", "colonial", "georgian", "victorian"],
            KitchenStyle.SCANDINAVIAN: ["scandinavian", "nordic", "minimalist", "hygge"],
            KitchenStyle.INDUSTRIAL: ["industrial", "loft", "urban", "warehouse"],
            KitchenStyle.RUSTIC: ["rustic", "farmhouse", "cottage", "country"],
            KitchenStyle.MINIMALIST: ["minimalist", "zen", "simple", "modern"],
            KitchenStyle.TRADITIONAL: ["traditional", "craftsman", "colonial"],
            KitchenStyle.CONTEMPORARY: ["contemporary", "modern", "eclectic"],
        }

        for target_style, keywords in style_keywords.items():
            if any(keyword in home_style_lower for keyword in keywords):
                if target_style == style:
                    return 100.0
                # Check for complementary styles
                if self._are_styles_compatible(style, target_style):
                    return 75.0

        return 50.0

    def _are_styles_compatible(self, style1: KitchenStyle, style2: KitchenStyle) -> bool:
        """Check if two styles are compatible."""
        compatible_pairs = [
            (KitchenStyle.MODERN, KitchenStyle.MINIMALIST),
            (KitchenStyle.MODERN, KitchenStyle.CONTEMPORARY),
            (KitchenStyle.SCANDINAVIAN, KitchenStyle.MINIMALIST),
            (KitchenStyle.TRADITIONAL, KitchenStyle.CLASSIC),
            (KitchenStyle.RUSTIC, KitchenStyle.TRADITIONAL),
            (KitchenStyle.INDUSTRIAL, KitchenStyle.CONTEMPORARY),
        ]

        return (
            (style1, style2) in compatible_pairs or
            (style2, style1) in compatible_pairs
        )

    def _match_priorities(self, style: KitchenStyle, priorities: List[str]) -> float:
        """Match design priorities to style characteristics."""
        priority_style_map = {
            "functionality": [KitchenStyle.MODERN, KitchenStyle.SCANDINAVIAN, KitchenStyle.MINIMALIST],
            "aesthetics": [KitchenStyle.CLASSIC, KitchenStyle.CONTEMPORARY, KitchenStyle.MODERN],
            "durability": [KitchenStyle.TRADITIONAL, KitchenStyle.INDUSTRIAL, KitchenStyle.RUSTIC],
            "warmth": [KitchenStyle.RUSTIC, KitchenStyle.SCANDINAVIAN, KitchenStyle.TRADITIONAL],
            "elegance": [KitchenStyle.CLASSIC, KitchenStyle.CONTEMPORARY, KitchenStyle.MODERN],
            "simplicity": [KitchenStyle.MINIMALIST, KitchenStyle.SCANDINAVIAN, KitchenStyle.MODERN],
            "character": [KitchenStyle.RUSTIC, KitchenStyle.INDUSTRIAL, KitchenStyle.CLASSIC],
        }

        score = 50.0
        matches = 0

        for priority in priorities:
            priority_lower = priority.lower()
            for keyword, styles in priority_style_map.items():
                if keyword in priority_lower:
                    if style in styles:
                        position = styles.index(style)
                        score += (30 - position * 10)
                        matches += 1
                    break

        if matches > 0:
            return min(100, score)
        return 50.0

    def _calculate_dislike_penalty(self, style: KitchenStyle, dislikes: List[str]) -> float:
        """Calculate penalty based on user dislikes."""
        penalty = 0.0
        style_features = self.STYLE_FEATURES.get(style, {})

        all_features = []
        for features in style_features.values():
            all_features.extend(f.lower() for f in features)

        for dislike in dislikes:
            dislike_lower = dislike.lower()
            for feature in all_features:
                if dislike_lower in feature or feature in dislike_lower:
                    penalty += 20.0
                    break

        return min(100, penalty)

    def _match_budget(self, style: KitchenStyle, budget: BudgetRange) -> float:
        """Match style to budget constraints."""
        budget_impact = self.STYLE_BUDGET_IMPACT.get(style, "medium")

        # Estimate average cost per square meter for each style
        cost_estimates = {
            "low": 500,
            "medium": 800,
            "medium-high": 1100,
            "high": 1500,
        }

        estimated_cost = cost_estimates.get(budget_impact, 800)
        avg_kitchen_size = 15  # Square meters

        total_estimate = estimated_cost * avg_kitchen_size

        # Check if budget fits
        if budget.min_amount <= total_estimate <= budget.max_amount:
            return 100.0
        elif total_estimate < budget.min_amount:
            # Under budget - might want to upgrade
            return 80.0
        else:
            # Over budget
            excess_ratio = total_estimate / budget.max_amount
            return max(0, 100 - (excess_ratio - 1) * 50)

    def _create_style_match(self, style: KitchenStyle, score: float) -> StyleMatch:
        """Create a StyleMatch object for a style."""
        features = self.STYLE_FEATURES.get(style, {})

        return StyleMatch(
            style=style,
            match_score=score,
            key_characteristics=features.get("characteristics", [])[:5],
            color_palette=features.get("colors", [])[:5],
            materials=features.get("materials", [])[:5],
            avoid=self._get_style_avoids(style),
        )

    def _get_style_avoids(self, style: KitchenStyle) -> List[str]:
        """Get things to avoid for a style."""
        avoids = {
            KitchenStyle.MODERN: ["ornate details", "heavy patterns", "traditional molding"],
            KitchenStyle.CLASSIC: ["minimalist hardware", "industrial materials", "flat panels"],
            KitchenStyle.SCANDINAVIAN: ["dark heavy woods", "ornate details", "cluttered spaces"],
            KitchenStyle.INDUSTRIAL: ["delicate finishes", "soft pastels", "ornate molding"],
            KitchenStyle.RUSTIC: ["high-gloss finishes", "chrome", "ultra-modern elements"],
            KitchenStyle.MINIMALIST: ["decorative elements", "patterns", "visible storage"],
            KitchenStyle.TRADITIONAL: ["ultra-modern materials", "industrial elements", "stark minimalism"],
            KitchenStyle.CONTEMPORARY: ["dated patterns", "matching everything", "overdone themes"],
        }
        return avoids.get(style, [])

    def _find_secondary_styles(
        self,
        primary: KitchenStyle,
        scores: Dict[KitchenStyle, float],
        start_idx: int
    ) -> List[StyleMatch]:
        """Find compatible secondary styles."""
        secondary: List[StyleMatch] = []

        sorted_styles = sorted(scores.items(), key=lambda x: x[1], reverse=True)

        for style, score in sorted_styles[start_idx:]:
            if self._are_styles_compatible(primary, style) or score > 60:
                secondary.append(self._create_style_match(style, score))
                if len(secondary) >= 2:
                    break

        return secondary

    def _generate_features(
        self,
        style: KitchenStyle,
        preferences: StylePreferenceInput
    ) -> List[StyleFeature]:
        """Generate specific style features for recommendation."""
        features: List[StyleFeature] = []
        style_data = self.STYLE_FEATURES.get(style, {})

        # Cabinet style feature
        if style_data.get("cabinet_styles"):
            features.append(StyleFeature(
                category=StyleCategory.CABINET_STYLE,
                name=f"{style.value.title()} Cabinets",
                description=f"Cabinet styles that define the {style.value} aesthetic",
                examples=style_data["cabinet_styles"][:3],
                compatibility_score=90.0,
                price_range=self.STYLE_BUDGET_IMPACT.get(style, "medium"),
            ))

        # Hardware feature
        if style_data.get("hardware"):
            features.append(StyleFeature(
                category=StyleCategory.HARDWARE,
                name=f"{style.value.title()} Hardware",
                description=f"Hardware selections for {style.value} style",
                examples=style_data["hardware"][:3],
                compatibility_score=85.0,
                price_range="varies",
            ))

        # Countertop feature
        if style_data.get("countertops"):
            features.append(StyleFeature(
                category=StyleCategory.COUNTERTOP,
                name=f"{style.value.title()} Countertops",
                description=f"Countertop materials for {style.value} kitchens",
                examples=style_data["countertops"][:3],
                compatibility_score=88.0,
                price_range=self.STYLE_BUDGET_IMPACT.get(style, "medium"),
            ))

        # Lighting feature
        if style_data.get("lighting"):
            features.append(StyleFeature(
                category=StyleCategory.LIGHTING,
                name=f"{style.value.title()} Lighting",
                description=f"Lighting options for {style.value} aesthetics",
                examples=style_data["lighting"][:3],
                compatibility_score=82.0,
                price_range="varies",
            ))

        # Color palette feature
        if style_data.get("colors"):
            features.append(StyleFeature(
                category=StyleCategory.COLOR_PALETTE,
                name=f"{style.value.title()} Color Palette",
                description=f"Color palette defining {style.value} style",
                examples=style_data["colors"][:4],
                compatibility_score=95.0,
                price_range="N/A",
            ))

        return features

    def _determine_confidence(
        self,
        score: float,
        preferences: StylePreferenceInput
    ) -> RecommendationConfidence:
        """Determine confidence level of recommendation."""
        # More preference data = higher confidence
        preference_count = sum([
            len(preferences.preferred_colors) > 0,
            len(preferences.preferred_materials) > 0,
            preferences.lifestyle is not None,
            preferences.existing_home_style is not None,
            len(preferences.priorities) > 0,
        ])

        if score >= 80 and preference_count >= 3:
            return RecommendationConfidence.HIGH
        elif score >= 60 or preference_count >= 2:
            return RecommendationConfidence.MEDIUM
        else:
            return RecommendationConfidence.LOW

    def _generate_reasoning(
        self,
        style: KitchenStyle,
        preferences: StylePreferenceInput,
        score: float
    ) -> str:
        """Generate explanation for the recommendation."""
        reasons: List[str] = []

        style_data = self.STYLE_FEATURES.get(style, {})

        # Color match reasoning
        if preferences.preferred_colors:
            matching_colors = set(c.lower() for c in preferences.preferred_colors) & set(
                c.lower() for c in style_data.get("colors", [])
            )
            if matching_colors:
                reasons.append(
                    f"Your color preferences ({', '.join(matching_colors)}) align well with {style.value} style"
                )

        # Material match reasoning
        if preferences.preferred_materials:
            matching_materials = set(m.lower() for m in preferences.preferred_materials) & set(
                m.lower() for m in style_data.get("materials", [])
            )
            if matching_materials:
                reasons.append(
                    f"Your material preferences ({', '.join(matching_materials)}) are characteristic of {style.value} design"
                )

        # Lifestyle reasoning
        if preferences.lifestyle:
            for keyword, styles in self.LIFESTYLE_MAPPINGS.items():
                if keyword in preferences.lifestyle.lower() and style in styles:
                    reasons.append(
                        f"The {style.value} style complements your {keyword} lifestyle"
                    )
                    break

        # Default reasoning if no specific matches
        if not reasons:
            characteristics = style_data.get("characteristics", ["clean", "timeless"])[:2]
            reasons.append(
                f"The {style.value} style offers {' and '.join(characteristics)} aesthetics that may suit your space"
            )

        return ". ".join(reasons) + "."

    def _generate_summary(
        self,
        recommendations: List[StyleRecommendation],
        preferences: StylePreferenceInput
    ) -> str:
        """Generate an analysis summary."""
        if not recommendations:
            return "Unable to generate recommendations based on provided preferences."

        top_style = recommendations[0].primary_style.style

        summary_parts = [
            f"Based on your preferences, {top_style.value.title()} style emerges as the top recommendation",
            f"with a {recommendations[0].primary_style.match_score:.0f}% match score.",
        ]

        if len(recommendations) > 1:
            alternatives = [r.primary_style.style.value.title() for r in recommendations[1:]]
            summary_parts.append(
                f"Alternative styles to consider include {' and '.join(alternatives)}."
            )

        if preferences.lifestyle:
            summary_parts.append(
                f"Your {preferences.lifestyle} lifestyle was considered in these recommendations."
            )

        return " ".join(summary_parts)
