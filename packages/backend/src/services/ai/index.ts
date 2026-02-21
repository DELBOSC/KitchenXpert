export { AnthropicService } from './anthropic.service';
export { SYSTEM_PROMPTS, PROMPT_VERSIONS } from './prompt-templates';
export { KITCHEN_CHAT_TOOLS } from './chat-tools';
export type { KitchenToolName } from './chat-tools';
export { DesignGeneratorService } from './design-generator.service';
export { QuestionnaireAdvisorService } from './questionnaire-advisor.service';
export { AICatalogSearchService } from './catalog-search.service';
export { ProjectAssistantService } from './project-assistant.service';
export { ProductRecommendationService } from './recommendation.service';
export { AdminInsightsService } from './admin-insights.service';
export { ProductEnrichmentService } from './product-enrichment.service';
export { CompatibilityGeneratorService } from './compatibility-generator.service';
export { ProductMatcherService } from './product-matcher.service';
export { CrossCategoryRecommenderService } from './cross-category-recommender.service';
export type { CategoryRecommendations, PopularPairing, SelectedProduct } from './cross-category-recommender.service';
export { StyleTransferService } from './style-transfer.service';
export type { StyleExtraction } from './style-transfer.service';
export { PhotoRoomScannerService } from './photo-room-scanner.service';
export type { RoomScanResult, FloorPlanData } from './photo-room-scanner.service';
export { RenovationService } from './renovation.service';
export type { ExistingKitchenAnalysis, ComparisonData, CreateRenovationDto } from './renovation.service';
export { WorkflowSimulationService } from './workflow-simulation.service';
export type {
  SimulationResult,
  SimulationStep,
  Bottleneck,
  OptimizationResult,
  OptimizationSuggestion,
  ScenarioDefinition,
  Position3D,
} from './workflow-simulation.service';
