"""
Budget optimization service for KitchenXpert.
Optimizes kitchen configurations within budget constraints.
"""

from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
import uuid
import copy

from ..models.kitchen import (
    KitchenConfiguration,
    CatalogProduct,
    PlacedItem,
    UserPreferences,
    PricingSummary,
    ProductDimensions,
    MeasurementUnit,
)
from ..models.recommendations import (
    BudgetCategory,
    BudgetAllocation,
    ProductAlternative,
    BudgetOptimizationRequest,
    BudgetSavingOpportunity,
    BudgetOptimizationResult,
)
from ..utils.algorithms import (
    normalize_score,
    weighted_average,
    find_pareto_front,
)


@dataclass
class BudgetItem:
    """An item with budget information."""
    product: CatalogProduct
    category: BudgetCategory
    is_fixed: bool = False
    priority: int = 5


class BudgetOptimizer:
    """
    Budget optimization engine for kitchen configurations.

    Uses constraint-based optimization to maximize value within budget.
    """

    # Default budget allocation percentages
    DEFAULT_ALLOCATIONS: Dict[BudgetCategory, float] = {
        BudgetCategory.CABINETS: 0.35,
        BudgetCategory.APPLIANCES: 0.30,
        BudgetCategory.COUNTERTOPS: 0.15,
        BudgetCategory.FLOORING: 0.08,
        BudgetCategory.LIGHTING: 0.05,
        BudgetCategory.PLUMBING: 0.04,
        BudgetCategory.INSTALLATION: 0.03,
        BudgetCategory.CONTINGENCY: 0.05,
    }

    # Quality tiers with price multipliers
    QUALITY_TIERS = {
        "economy": 0.6,
        "standard": 1.0,
        "premium": 1.5,
        "luxury": 2.5,
    }

    # Category to product mapping
    CATEGORY_MAPPING = {
        "cabinet": BudgetCategory.CABINETS,
        "base_cabinet": BudgetCategory.CABINETS,
        "wall_cabinet": BudgetCategory.CABINETS,
        "tall_cabinet": BudgetCategory.CABINETS,
        "sink_base": BudgetCategory.CABINETS,
        "appliance": BudgetCategory.APPLIANCES,
        "refrigerator": BudgetCategory.APPLIANCES,
        "cooktop": BudgetCategory.APPLIANCES,
        "oven": BudgetCategory.APPLIANCES,
        "dishwasher": BudgetCategory.APPLIANCES,
        "range_hood": BudgetCategory.APPLIANCES,
        "microwave": BudgetCategory.APPLIANCES,
        "countertop": BudgetCategory.COUNTERTOPS,
        "worktop": BudgetCategory.COUNTERTOPS,
        "flooring": BudgetCategory.FLOORING,
        "lighting": BudgetCategory.LIGHTING,
        "sink": BudgetCategory.PLUMBING,
        "faucet": BudgetCategory.PLUMBING,
    }

    def __init__(self):
        """Initialize the budget optimizer."""
        self._alternatives_db = self._build_alternatives_database()

    def _build_alternatives_database(self) -> Dict[str, List[CatalogProduct]]:
        """Build a database of product alternatives at different price points."""
        alternatives: Dict[str, List[CatalogProduct]] = {}

        # Base cabinet alternatives
        alternatives["base_cabinet"] = [
            CatalogProduct(
                id="bc-economy-60", provider_id="economy", provider_product_id="BC-E-60",
                name="Economy Base Cabinet 60cm", type="cabinet", category="base_cabinet",
                dimensions=ProductDimensions(width=60, height=85, depth=60, unit=MeasurementUnit.CM),
                price=120, currency="EUR", in_stock=True,
            ),
            CatalogProduct(
                id="bc-standard-60", provider_id="standard", provider_product_id="BC-S-60",
                name="Standard Base Cabinet 60cm", type="cabinet", category="base_cabinet",
                dimensions=ProductDimensions(width=60, height=85, depth=60, unit=MeasurementUnit.CM),
                price=200, currency="EUR", in_stock=True,
            ),
            CatalogProduct(
                id="bc-premium-60", provider_id="premium", provider_product_id="BC-P-60",
                name="Premium Base Cabinet 60cm", type="cabinet", category="base_cabinet",
                dimensions=ProductDimensions(width=60, height=85, depth=60, unit=MeasurementUnit.CM),
                price=350, currency="EUR", in_stock=True,
            ),
        ]

        # Wall cabinet alternatives
        alternatives["wall_cabinet"] = [
            CatalogProduct(
                id="wc-economy-60", provider_id="economy", provider_product_id="WC-E-60",
                name="Economy Wall Cabinet 60cm", type="cabinet", category="wall_cabinet",
                dimensions=ProductDimensions(width=60, height=70, depth=35, unit=MeasurementUnit.CM),
                price=80, currency="EUR", in_stock=True,
            ),
            CatalogProduct(
                id="wc-standard-60", provider_id="standard", provider_product_id="WC-S-60",
                name="Standard Wall Cabinet 60cm", type="cabinet", category="wall_cabinet",
                dimensions=ProductDimensions(width=60, height=70, depth=35, unit=MeasurementUnit.CM),
                price=150, currency="EUR", in_stock=True,
            ),
            CatalogProduct(
                id="wc-premium-60", provider_id="premium", provider_product_id="WC-P-60",
                name="Premium Wall Cabinet 60cm", type="cabinet", category="wall_cabinet",
                dimensions=ProductDimensions(width=60, height=70, depth=35, unit=MeasurementUnit.CM),
                price=280, currency="EUR", in_stock=True,
            ),
        ]

        # Refrigerator alternatives
        alternatives["refrigerator"] = [
            CatalogProduct(
                id="ref-economy", provider_id="economy", provider_product_id="REF-E",
                name="Economy Refrigerator", type="appliance", category="refrigerator",
                dimensions=ProductDimensions(width=60, height=175, depth=65, unit=MeasurementUnit.CM),
                price=450, currency="EUR", in_stock=True,
            ),
            CatalogProduct(
                id="ref-standard", provider_id="standard", provider_product_id="REF-S",
                name="Standard Refrigerator", type="appliance", category="refrigerator",
                dimensions=ProductDimensions(width=60, height=180, depth=65, unit=MeasurementUnit.CM),
                price=800, currency="EUR", in_stock=True,
            ),
            CatalogProduct(
                id="ref-premium", provider_id="premium", provider_product_id="REF-P",
                name="Premium Smart Refrigerator", type="appliance", category="refrigerator",
                dimensions=ProductDimensions(width=90, height=180, depth=70, unit=MeasurementUnit.CM),
                price=1500, currency="EUR", in_stock=True,
            ),
        ]

        # Cooktop alternatives
        alternatives["cooktop"] = [
            CatalogProduct(
                id="ct-economy", provider_id="economy", provider_product_id="CT-E",
                name="Economy Gas Cooktop", type="appliance", category="cooktop",
                dimensions=ProductDimensions(width=60, height=5, depth=52, unit=MeasurementUnit.CM),
                price=200, currency="EUR", in_stock=True,
            ),
            CatalogProduct(
                id="ct-standard", provider_id="standard", provider_product_id="CT-S",
                name="Standard Induction Cooktop", type="appliance", category="cooktop",
                dimensions=ProductDimensions(width=60, height=5, depth=52, unit=MeasurementUnit.CM),
                price=500, currency="EUR", in_stock=True,
            ),
            CatalogProduct(
                id="ct-premium", provider_id="premium", provider_product_id="CT-P",
                name="Premium Induction with Downdraft", type="appliance", category="cooktop",
                dimensions=ProductDimensions(width=80, height=5, depth=52, unit=MeasurementUnit.CM),
                price=1200, currency="EUR", in_stock=True,
            ),
        ]

        # Oven alternatives
        alternatives["oven"] = [
            CatalogProduct(
                id="ov-economy", provider_id="economy", provider_product_id="OV-E",
                name="Economy Built-in Oven", type="appliance", category="oven",
                dimensions=ProductDimensions(width=60, height=60, depth=55, unit=MeasurementUnit.CM),
                price=300, currency="EUR", in_stock=True,
            ),
            CatalogProduct(
                id="ov-standard", provider_id="standard", provider_product_id="OV-S",
                name="Standard Convection Oven", type="appliance", category="oven",
                dimensions=ProductDimensions(width=60, height=60, depth=55, unit=MeasurementUnit.CM),
                price=600, currency="EUR", in_stock=True,
            ),
            CatalogProduct(
                id="ov-premium", provider_id="premium", provider_product_id="OV-P",
                name="Premium Steam Oven", type="appliance", category="oven",
                dimensions=ProductDimensions(width=60, height=60, depth=55, unit=MeasurementUnit.CM),
                price=1800, currency="EUR", in_stock=True,
            ),
        ]

        # Dishwasher alternatives
        alternatives["dishwasher"] = [
            CatalogProduct(
                id="dw-economy", provider_id="economy", provider_product_id="DW-E",
                name="Economy Dishwasher", type="appliance", category="dishwasher",
                dimensions=ProductDimensions(width=60, height=82, depth=55, unit=MeasurementUnit.CM),
                price=300, currency="EUR", in_stock=True,
            ),
            CatalogProduct(
                id="dw-standard", provider_id="standard", provider_product_id="DW-S",
                name="Standard Dishwasher", type="appliance", category="dishwasher",
                dimensions=ProductDimensions(width=60, height=82, depth=55, unit=MeasurementUnit.CM),
                price=500, currency="EUR", in_stock=True,
            ),
            CatalogProduct(
                id="dw-premium", provider_id="premium", provider_product_id="DW-P",
                name="Premium Quiet Dishwasher", type="appliance", category="dishwasher",
                dimensions=ProductDimensions(width=60, height=82, depth=55, unit=MeasurementUnit.CM),
                price=900, currency="EUR", in_stock=True,
            ),
        ]

        return alternatives

    def optimize(self, request: BudgetOptimizationRequest) -> BudgetOptimizationResult:
        """
        Optimize kitchen budget allocation and suggest alternatives.

        Args:
            request: Budget optimization request

        Returns:
            Budget optimization result
        """
        total_budget = request.total_budget
        priorities = request.priorities
        fixed_items = set(request.fixed_items)

        # Calculate optimal allocations
        allocations = self._calculate_allocations(total_budget, priorities)

        # Analyze current configuration if provided
        if request.current_configuration:
            return self._optimize_existing_configuration(
                request.current_configuration,
                total_budget,
                allocations,
                fixed_items,
                request.optimization_goal,
            )
        else:
            return self._create_budget_plan(
                total_budget,
                allocations,
                request.preferences,
            )

    def _calculate_allocations(
        self,
        total_budget: float,
        priorities: Dict[BudgetCategory, int]
    ) -> List[BudgetAllocation]:
        """Calculate budget allocations based on priorities."""
        allocations: List[BudgetAllocation] = []

        # Adjust default allocations based on priorities
        adjusted_percentages: Dict[BudgetCategory, float] = {}
        total_priority = sum(priorities.values()) if priorities else 50

        for category, default_pct in self.DEFAULT_ALLOCATIONS.items():
            priority = priorities.get(category, 5)

            # Adjust based on priority (5 is neutral)
            priority_factor = priority / 5.0
            adjusted_pct = default_pct * priority_factor

            adjusted_percentages[category] = adjusted_pct

        # Normalize to 100%
        total_pct = sum(adjusted_percentages.values())
        for category in adjusted_percentages:
            adjusted_percentages[category] /= total_pct

        # Create allocations
        for category, pct in adjusted_percentages.items():
            allocations.append(BudgetAllocation(
                category=category,
                allocated_amount=total_budget * pct,
                percentage=pct * 100,
                priority=priorities.get(category, 5),
                flexibility=0.15 if category not in [BudgetCategory.CONTINGENCY] else 0.0,
            ))

        return allocations

    def _optimize_existing_configuration(
        self,
        configuration: KitchenConfiguration,
        total_budget: float,
        allocations: List[BudgetAllocation],
        fixed_items: set,
        optimization_goal: str,
    ) -> BudgetOptimizationResult:
        """Optimize an existing configuration."""
        original_total = configuration.pricing.total
        items = configuration.items

        # Categorize items
        categorized_items = self._categorize_items(items)

        # Calculate current spending by category
        current_spending: Dict[BudgetCategory, float] = {}
        for category in BudgetCategory:
            current_spending[category] = sum(
                item.product.price for item in categorized_items.get(category, [])
            )

        # Find alternatives
        alternatives: List[ProductAlternative] = []
        optimized_items: List[PlacedItem] = []

        for item in items:
            if item.id in fixed_items:
                optimized_items.append(item)
                continue

            category = self._get_item_category(item.product)
            allocation = next((a for a in allocations if a.category == category), None)

            if allocation and current_spending.get(category, 0) > allocation.allocated_amount:
                # Over budget - find cheaper alternative
                alternative = self._find_cheaper_alternative(item.product)
                if alternative:
                    savings = item.product.price - alternative.price
                    quality_impact = self._estimate_quality_impact(item.product, alternative)

                    alternatives.append(ProductAlternative(
                        original_product=item.product,
                        alternative_product=alternative,
                        savings=savings,
                        quality_impact=quality_impact,
                        reason=f"Reduces {category.value} spending to fit budget allocation",
                    ))

                    # Use alternative in optimized configuration
                    new_item = copy.deepcopy(item)
                    new_item.product = alternative
                    optimized_items.append(new_item)
                else:
                    optimized_items.append(item)
            else:
                optimized_items.append(item)

        # Calculate savings
        optimized_total = sum(item.product.price for item in optimized_items)
        total_savings = original_total - optimized_total

        # Find additional saving opportunities
        saving_opportunities = self._find_saving_opportunities(
            categorized_items, allocations, current_spending
        )

        # Create optimized configuration
        optimized_config = self._create_optimized_configuration(
            configuration, optimized_items
        )

        # Generate recommendations
        recommendations = self._generate_budget_recommendations(
            original_total, total_budget, alternatives, saving_opportunities
        )

        return BudgetOptimizationResult(
            success=True,
            original_total=original_total,
            optimized_total=optimized_total,
            total_savings=total_savings,
            savings_percentage=(total_savings / original_total * 100) if original_total > 0 else 0,
            allocations=allocations,
            alternatives=alternatives,
            saving_opportunities=saving_opportunities,
            optimized_configuration=optimized_config,
            recommendations=recommendations,
            errors=[],
        )

    def _create_budget_plan(
        self,
        total_budget: float,
        allocations: List[BudgetAllocation],
        preferences: Optional[UserPreferences],
    ) -> BudgetOptimizationResult:
        """Create a budget plan without existing configuration."""
        # Generate recommendations based on allocations
        recommendations: List[str] = []

        for allocation in allocations:
            if allocation.category == BudgetCategory.CABINETS:
                recommendations.append(
                    f"Allocate ${allocation.allocated_amount:.0f} ({allocation.percentage:.0f}%) for cabinets"
                )
            elif allocation.category == BudgetCategory.APPLIANCES:
                tier = self._recommend_appliance_tier(allocation.allocated_amount)
                recommendations.append(
                    f"With ${allocation.allocated_amount:.0f} for appliances, consider {tier} tier products"
                )
            elif allocation.category == BudgetCategory.COUNTERTOPS:
                recommendations.append(
                    f"Budget ${allocation.allocated_amount:.0f} allows for mid-range countertop materials"
                )

        recommendations.append(
            f"Reserve ${next((a.allocated_amount for a in allocations if a.category == BudgetCategory.CONTINGENCY), total_budget * 0.05):.0f} as contingency for unexpected costs"
        )

        return BudgetOptimizationResult(
            success=True,
            original_total=0,
            optimized_total=total_budget,
            total_savings=0,
            savings_percentage=0,
            allocations=allocations,
            alternatives=[],
            saving_opportunities=[],
            optimized_configuration=None,
            recommendations=recommendations,
            errors=[],
        )

    def _categorize_items(
        self,
        items: List[PlacedItem]
    ) -> Dict[BudgetCategory, List[PlacedItem]]:
        """Categorize items by budget category."""
        categorized: Dict[BudgetCategory, List[PlacedItem]] = {
            category: [] for category in BudgetCategory
        }

        for item in items:
            category = self._get_item_category(item.product)
            categorized[category].append(item)

        return categorized

    def _get_item_category(self, product: CatalogProduct) -> BudgetCategory:
        """Get budget category for a product."""
        # Check category mapping
        product_category = product.category.lower()
        for key, budget_cat in self.CATEGORY_MAPPING.items():
            if key in product_category:
                return budget_cat

        # Check type
        product_type = product.type.lower()
        for key, budget_cat in self.CATEGORY_MAPPING.items():
            if key in product_type:
                return budget_cat

        return BudgetCategory.CABINETS  # Default

    def _find_cheaper_alternative(
        self,
        product: CatalogProduct
    ) -> Optional[CatalogProduct]:
        """Find a cheaper alternative for a product."""
        category = product.category.lower()

        alternatives = self._alternatives_db.get(category, [])

        # Find cheaper alternative with similar dimensions
        for alt in sorted(alternatives, key=lambda x: x.price):
            if alt.price < product.price:
                # Check dimensions compatibility
                if self._dimensions_compatible(product.dimensions, alt.dimensions):
                    return alt

        return None

    def _find_premium_alternative(
        self,
        product: CatalogProduct
    ) -> Optional[CatalogProduct]:
        """Find a premium alternative for a product."""
        category = product.category.lower()

        alternatives = self._alternatives_db.get(category, [])

        # Find more expensive alternative
        for alt in sorted(alternatives, key=lambda x: x.price, reverse=True):
            if alt.price > product.price:
                if self._dimensions_compatible(product.dimensions, alt.dimensions):
                    return alt

        return None

    def _dimensions_compatible(
        self,
        dim1: ProductDimensions,
        dim2: ProductDimensions
    ) -> bool:
        """Check if two products have compatible dimensions."""
        # Allow 20% tolerance
        tolerance = 0.2

        width_ok = abs(dim1.width - dim2.width) / dim1.width <= tolerance
        height_ok = abs(dim1.height - dim2.height) / dim1.height <= tolerance
        depth_ok = abs(dim1.depth - dim2.depth) / dim1.depth <= tolerance

        return width_ok and height_ok and depth_ok

    def _estimate_quality_impact(
        self,
        original: CatalogProduct,
        alternative: CatalogProduct
    ) -> float:
        """Estimate quality impact of switching products."""
        price_ratio = alternative.price / original.price

        if price_ratio >= 1.0:
            # Upgrade - positive impact
            return min(30, (price_ratio - 1.0) * 50)
        else:
            # Downgrade - negative impact
            return max(-50, (price_ratio - 1.0) * 60)

    def _find_saving_opportunities(
        self,
        categorized_items: Dict[BudgetCategory, List[PlacedItem]],
        allocations: List[BudgetAllocation],
        current_spending: Dict[BudgetCategory, float],
    ) -> List[BudgetSavingOpportunity]:
        """Find potential saving opportunities."""
        opportunities: List[BudgetSavingOpportunity] = []

        for allocation in allocations:
            category = allocation.category
            current = current_spending.get(category, 0)

            if current > allocation.allocated_amount * 1.1:  # 10% over allocation
                # Over budget - find savings
                potential_savings = current - allocation.allocated_amount
                suggestions: List[str] = []

                if category == BudgetCategory.CABINETS:
                    suggestions = [
                        "Consider standard finish instead of premium",
                        "Reduce number of pull-out organizers",
                        "Use open shelving in some areas",
                    ]
                elif category == BudgetCategory.APPLIANCES:
                    suggestions = [
                        "Choose energy-efficient models for long-term savings",
                        "Consider slightly smaller refrigerator",
                        "Bundle appliances from same brand for discounts",
                    ]
                elif category == BudgetCategory.COUNTERTOPS:
                    suggestions = [
                        "Consider engineered quartz over natural stone",
                        "Use laminate for less visible areas",
                        "Reduce edge profile complexity",
                    ]

                opportunities.append(BudgetSavingOpportunity(
                    category=category,
                    current_spend=current,
                    potential_savings=potential_savings,
                    suggestions=suggestions,
                    impact_level="medium" if potential_savings < current * 0.2 else "high",
                ))

        return opportunities

    def _create_optimized_configuration(
        self,
        original: KitchenConfiguration,
        optimized_items: List[PlacedItem],
    ) -> KitchenConfiguration:
        """Create optimized configuration from items."""
        # Recalculate pricing
        cabinet_cost = sum(
            item.product.price for item in optimized_items
            if "cabinet" in item.product.category.lower()
        )
        appliance_cost = sum(
            item.product.price for item in optimized_items
            if item.product.type.lower() == "appliance"
        )
        worktop_cost = sum(
            item.product.price for item in optimized_items
            if "worktop" in item.product.category.lower() or "countertop" in item.product.category.lower()
        )

        total_cost = sum(item.product.price for item in optimized_items)

        # Group items
        cabinets = [i for i in optimized_items if "cabinet" in i.product.category.lower()]
        appliances = [i for i in optimized_items if i.product.type.lower() == "appliance"]
        worktops = [i for i in optimized_items if "worktop" in i.product.category.lower()]

        return KitchenConfiguration(
            id=str(uuid.uuid4()),
            name=f"Budget Optimized - {original.name}",
            shape=original.shape,
            style=original.style,
            room=original.room,
            items=optimized_items,
            cabinets=cabinets,
            appliances=appliances,
            worktops=worktops,
            pricing=PricingSummary(
                cabinets=cabinet_cost,
                appliances=appliance_cost,
                worktops=worktop_cost,
                fittings=original.pricing.fittings,
                total=total_cost,
                currency=original.pricing.currency,
                by_provider={},
            ),
            score=original.score,
            validation=original.validation,
            metadata={
                **original.metadata,
                "budget_optimized": True,
            },
        )

    def _recommend_appliance_tier(self, budget: float) -> str:
        """Recommend appliance tier based on budget."""
        # Assuming budget is for typical set of appliances
        if budget < 2000:
            return "economy"
        elif budget < 4000:
            return "standard"
        elif budget < 8000:
            return "premium"
        else:
            return "luxury"

    def _generate_budget_recommendations(
        self,
        original_total: float,
        target_budget: float,
        alternatives: List[ProductAlternative],
        opportunities: List[BudgetSavingOpportunity],
    ) -> List[str]:
        """Generate budget recommendations."""
        recommendations: List[str] = []

        if original_total > target_budget:
            over_budget = original_total - target_budget
            recommendations.append(
                f"Current configuration is ${over_budget:.0f} over budget."
            )

            if alternatives:
                total_alt_savings = sum(a.savings for a in alternatives)
                recommendations.append(
                    f"Suggested alternatives can save up to ${total_alt_savings:.0f}."
                )

            if opportunities:
                for opp in opportunities[:2]:  # Top 2 opportunities
                    recommendations.append(
                        f"Consider {opp.category.value}: potential savings of ${opp.potential_savings:.0f}"
                    )
        elif original_total < target_budget * 0.8:
            under_budget = target_budget - original_total
            recommendations.append(
                f"You have ${under_budget:.0f} available for upgrades."
            )
            recommendations.append(
                "Consider upgrading appliances or adding premium finishes."
            )
        else:
            recommendations.append(
                "Budget is well-utilized. Consider the contingency fund for unexpected costs."
            )

        return recommendations
