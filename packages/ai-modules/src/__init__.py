"""
KitchenXpert AI Modules Package.

This package provides AI-powered services for kitchen design optimization:
- Layout optimization using genetic algorithms
- Style recommendations based on user preferences
- Budget optimization and cost analysis
- 3D space analysis and workflow optimization
"""

__version__ = "1.0.0"
__author__ = "KitchenXpert Team"

from .services import (
    LayoutOptimizer,
    StyleRecommender,
    BudgetOptimizer,
    SpaceAnalyzer,
)

__all__ = [
    "LayoutOptimizer",
    "StyleRecommender",
    "BudgetOptimizer",
    "SpaceAnalyzer",
    "__version__",
]
