/**
 * Abandonment Detector Service
 *
 * Analyzes user behavior during kitchen design sessions to detect potential
 * design abandonment. Returns risk scores and intervention suggestions.
 *
 * Risk Factors (weighted scoring):
 * 1. Long idle periods (>3 min without action): +20 risk
 * 2. High undo rate (>40% of actions are undo): +25 risk
 * 3. Rapid option switching (>5 material/style changes in 1 min): +15 risk
 * 4. Deletion without replacement (net object count decreasing): +20 risk
 * 5. No save in 10+ min of activity: +10 risk
 * 6. Frequent panel switching (opening/closing panels rapidly): +10 risk
 * 7. Empty canvas after 5+ min: +30 risk (critical)
 * 8. Session > 30 min with < 5 objects: +15 risk
 *
 * Interventions:
 * - Low (0-30): None
 * - Medium (30-50): Help tip
 * - High (50-70): AI suggestion
 * - Critical (70+): Design expert offer
 */

import { createModuleLogger } from '../../utils/logger';

const logger = createModuleLogger('abandonment-detector');

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DesignEvent {
  type:
    | 'page_view'
    | 'object_add'
    | 'object_remove'
    | 'object_move'
    | 'undo'
    | 'view_change'
    | 'idle'
    | 'panel_open'
    | 'panel_close'
    | 'export'
    | 'save';
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface AbandonmentRisk {
  /** Risk score from 0 (no risk) to 100 (very likely to abandon). */
  riskScore: number;
  /** Categorized risk level. */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Individual risk factors that were evaluated. */
  factors: RiskFactor[];
  /** Suggested intervention type. */
  suggestedIntervention: 'none' | 'help_tip' | 'ai_suggestion' | 'design_expert' | 'simplify_ui';
  /** Total time in session (ms). */
  timeInSession: number;
  /** Total number of actions (excluding idle). */
  actionsCount: number;
  /** Ratio of undo actions to total actions. */
  undoRate: number;
}

export interface RiskFactor {
  /** Name of the risk factor. */
  factor: string;
  /** Weight (contribution to risk score if detected). */
  weight: number;
  /** Whether this factor was detected in the session. */
  detected: boolean;
  /** Human-readable description. */
  description: string;
}

export interface InterventionMessage {
  /** How the intervention should be displayed. */
  type: 'toast' | 'modal' | 'chat_message';
  /** Title of the intervention. */
  title: string;
  /** Body text of the intervention. */
  message: string;
  /** Optional action button. */
  action?: {
    label: string;
    /** Handler function name to invoke on the frontend. */
    handler: string;
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Idle threshold in milliseconds (3 minutes). */
const IDLE_THRESHOLD_MS = 3 * 60 * 1000;

/** Undo rate threshold (40%). */
const HIGH_UNDO_RATE = 0.4;

/** Rapid switching: more than 5 changes in 60 seconds. */
const RAPID_SWITCH_COUNT = 5;
const RAPID_SWITCH_WINDOW_MS = 60 * 1000;

/** No save threshold in milliseconds (10 minutes). */
const NO_SAVE_THRESHOLD_MS = 10 * 60 * 1000;

/** Rapid panel switching: more than 6 open/close in 30 seconds. */
const RAPID_PANEL_COUNT = 6;
const RAPID_PANEL_WINDOW_MS = 30 * 1000;

/** Empty canvas threshold (5 minutes). */
const EMPTY_CANVAS_THRESHOLD_MS = 5 * 60 * 1000;

/** Long session threshold (30 minutes). */
const LONG_SESSION_THRESHOLD_MS = 30 * 60 * 1000;

/** Minimum objects expected in a long session. */
const MIN_OBJECTS_FOR_LONG_SESSION = 5;

// ─── Service ────────────────────────────────────────────────────────────────

export class AbandonmentDetectorService {
  /**
   * Analyze user behavior to detect potential design abandonment.
   * Evaluates a series of design events against known risk factors.
   *
   * @param events - Chronologically ordered design events from the session
   * @returns Risk assessment with score, factors, and intervention suggestion
   */
  analyzeSession(events: DesignEvent[]): AbandonmentRisk {
    if (events.length === 0) {
      return this.createEmptyResult();
    }

    // Sort events by timestamp (defensive)
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
    const sessionStart = sorted[0]!.timestamp;
    const sessionEnd = sorted[sorted.length - 1]!.timestamp;
    const timeInSession = sessionEnd - sessionStart;

    // Count events by type
    const actionEvents = sorted.filter((e) => e.type !== 'idle');
    const actionsCount = actionEvents.length;
    const undoCount = sorted.filter((e) => e.type === 'undo').length;
    const undoRate = actionsCount > 0 ? undoCount / actionsCount : 0;

    // Evaluate each risk factor
    const factors: RiskFactor[] = [];
    let totalRisk = 0;

    // Factor 1: Long idle periods
    const idleFactor = this.checkLongIdle(sorted);
    factors.push(idleFactor);
    if (idleFactor.detected) totalRisk += idleFactor.weight;

    // Factor 2: High undo rate
    const undoFactor = this.checkHighUndoRate(undoRate, actionsCount);
    factors.push(undoFactor);
    if (undoFactor.detected) totalRisk += undoFactor.weight;

    // Factor 3: Rapid option switching
    const switchFactor = this.checkRapidSwitching(sorted);
    factors.push(switchFactor);
    if (switchFactor.detected) totalRisk += switchFactor.weight;

    // Factor 4: Deletion without replacement
    const deletionFactor = this.checkDeletionWithoutReplacement(sorted);
    factors.push(deletionFactor);
    if (deletionFactor.detected) totalRisk += deletionFactor.weight;

    // Factor 5: No save in 10+ min
    const noSaveFactor = this.checkNoSave(sorted, timeInSession);
    factors.push(noSaveFactor);
    if (noSaveFactor.detected) totalRisk += noSaveFactor.weight;

    // Factor 6: Frequent panel switching
    const panelFactor = this.checkFrequentPanelSwitching(sorted);
    factors.push(panelFactor);
    if (panelFactor.detected) totalRisk += panelFactor.weight;

    // Factor 7: Empty canvas after 5+ min
    const emptyFactor = this.checkEmptyCanvas(sorted, timeInSession);
    factors.push(emptyFactor);
    if (emptyFactor.detected) totalRisk += emptyFactor.weight;

    // Factor 8: Long session with few objects
    const longSessionFactor = this.checkLongSessionFewObjects(sorted, timeInSession);
    factors.push(longSessionFactor);
    if (longSessionFactor.detected) totalRisk += longSessionFactor.weight;

    // Clamp risk score
    const riskScore = Math.min(100, Math.max(0, totalRisk));

    // Determine risk level and intervention
    const riskLevel = this.getRiskLevel(riskScore);
    const suggestedIntervention = this.getInterventionType(riskScore, factors);

    logger.debug(`[Abandonment] Session analyzed: score=${riskScore}, level=${riskLevel}, ` +
      `factors=${factors.filter(f => f.detected).length}/${factors.length}`);

    return {
      riskScore,
      riskLevel,
      factors,
      suggestedIntervention,
      timeInSession,
      actionsCount,
      undoRate: Math.round(undoRate * 100) / 100,
    };
  }

  /**
   * Get a personalized intervention message based on risk factors.
   *
   * @param risk - The abandonment risk assessment
   * @returns An intervention message to show the user
   */
  getIntervention(risk: AbandonmentRisk): InterventionMessage {
    switch (risk.suggestedIntervention) {
      case 'help_tip':
        return this.generateHelpTip(risk);

      case 'ai_suggestion':
        return this.generateAISuggestion(risk);

      case 'design_expert':
        return this.generateDesignExpertOffer(risk);

      case 'simplify_ui':
        return {
          type: 'toast',
          title: 'Tip: Simplified Mode',
          message: 'Feeling overwhelmed? Try our simplified mode for a guided kitchen design experience.',
          action: {
            label: 'Switch to Simplified Mode',
            handler: 'enableSimplifiedMode',
          },
        };

      case 'none':
      default:
        return {
          type: 'toast',
          title: '',
          message: '',
        };
    }
  }

  // ─── Risk Factor Checks ───────────────────────────────────────────────────

  /**
   * Factor 1: Long idle periods (>3 min without action).
   */
  private checkLongIdle(events: DesignEvent[]): RiskFactor {
    let maxIdleGap = 0;
    for (let i = 1; i < events.length; i++) {
      const gap = events[i]!.timestamp - events[i - 1]!.timestamp;
      if (gap > maxIdleGap) maxIdleGap = gap;
    }

    return {
      factor: 'long_idle',
      weight: 20,
      detected: maxIdleGap >= IDLE_THRESHOLD_MS,
      description: maxIdleGap >= IDLE_THRESHOLD_MS
        ? `User was idle for ${Math.round(maxIdleGap / 60000)} minutes`
        : 'No extended idle periods detected',
    };
  }

  /**
   * Factor 2: High undo rate (>40% of actions are undo).
   */
  private checkHighUndoRate(undoRate: number, actionsCount: number): RiskFactor {
    // Only meaningful if there are enough actions
    const detected = actionsCount >= 5 && undoRate > HIGH_UNDO_RATE;

    return {
      factor: 'high_undo_rate',
      weight: 25,
      detected,
      description: detected
        ? `${Math.round(undoRate * 100)}% of actions were undone (threshold: ${HIGH_UNDO_RATE * 100}%)`
        : `Undo rate of ${Math.round(undoRate * 100)}% is within normal range`,
    };
  }

  /**
   * Factor 3: Rapid option switching (>5 material/style changes in 1 min).
   */
  private checkRapidSwitching(events: DesignEvent[]): RiskFactor {
    // Look for view_change or modify events with material/style data
    const switchEvents = events.filter(
      (e) =>
        e.type === 'view_change' ||
        (e.type === 'object_move' && e.data?.material) ||
        (e.data?.property === 'material' || e.data?.property === 'style')
    );

    let maxSwitchesInWindow = 0;
    for (let i = 0; i < switchEvents.length; i++) {
      const windowStart = switchEvents[i]!.timestamp;
      let count = 0;
      for (let j = i; j < switchEvents.length; j++) {
        if (switchEvents[j]!.timestamp - windowStart <= RAPID_SWITCH_WINDOW_MS) {
          count++;
        } else {
          break;
        }
      }
      if (count > maxSwitchesInWindow) maxSwitchesInWindow = count;
    }

    return {
      factor: 'rapid_switching',
      weight: 15,
      detected: maxSwitchesInWindow >= RAPID_SWITCH_COUNT,
      description: maxSwitchesInWindow >= RAPID_SWITCH_COUNT
        ? `${maxSwitchesInWindow} option changes in under 1 minute`
        : 'No excessive option switching detected',
    };
  }

  /**
   * Factor 4: Deletion without replacement (net object count decreasing).
   */
  private checkDeletionWithoutReplacement(events: DesignEvent[]): RiskFactor {
    let currentCount = 0;
    let peakCount = 0;

    for (const event of events) {
      if (event.type === 'object_add') {
        currentCount++;
        if (currentCount > peakCount) peakCount = currentCount;
      } else if (event.type === 'object_remove') {
        currentCount = Math.max(0, currentCount - 1);
      }
    }

    // Detected if the final count is significantly lower than the peak
    const detected = peakCount >= 3 && currentCount < peakCount * 0.5;

    return {
      factor: 'deletion_without_replacement',
      weight: 20,
      detected,
      description: detected
        ? `Object count dropped from peak of ${peakCount} to ${currentCount}`
        : `Current object count (${currentCount}) is stable`,
    };
  }

  /**
   * Factor 5: No save in 10+ min of activity.
   */
  private checkNoSave(events: DesignEvent[], timeInSession: number): RiskFactor {
    if (timeInSession < NO_SAVE_THRESHOLD_MS) {
      return {
        factor: 'no_save',
        weight: 10,
        detected: false,
        description: 'Session is too short to trigger this factor',
      };
    }

    const lastSave = events
      .filter((e) => e.type === 'save')
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    const sessionEnd = events[events.length - 1]!.timestamp;
    const timeSinceLastSave = lastSave
      ? sessionEnd - lastSave.timestamp
      : timeInSession;

    const detected = timeSinceLastSave >= NO_SAVE_THRESHOLD_MS;

    return {
      factor: 'no_save',
      weight: 10,
      detected,
      description: detected
        ? `No save for ${Math.round(timeSinceLastSave / 60000)} minutes`
        : 'Design was saved recently',
    };
  }

  /**
   * Factor 6: Frequent panel switching (>6 open/close in 30 seconds).
   */
  private checkFrequentPanelSwitching(events: DesignEvent[]): RiskFactor {
    const panelEvents = events.filter(
      (e) => e.type === 'panel_open' || e.type === 'panel_close'
    );

    let maxPanelSwitches = 0;
    for (let i = 0; i < panelEvents.length; i++) {
      const windowStart = panelEvents[i]!.timestamp;
      let count = 0;
      for (let j = i; j < panelEvents.length; j++) {
        if (panelEvents[j]!.timestamp - windowStart <= RAPID_PANEL_WINDOW_MS) {
          count++;
        } else {
          break;
        }
      }
      if (count > maxPanelSwitches) maxPanelSwitches = count;
    }

    return {
      factor: 'frequent_panel_switching',
      weight: 10,
      detected: maxPanelSwitches >= RAPID_PANEL_COUNT,
      description: maxPanelSwitches >= RAPID_PANEL_COUNT
        ? `${maxPanelSwitches} panel toggles in 30 seconds`
        : 'Panel usage is normal',
    };
  }

  /**
   * Factor 7: Empty canvas after 5+ min.
   */
  private checkEmptyCanvas(events: DesignEvent[], timeInSession: number): RiskFactor {
    if (timeInSession < EMPTY_CANVAS_THRESHOLD_MS) {
      return {
        factor: 'empty_canvas',
        weight: 30,
        detected: false,
        description: 'Session too short for this factor',
      };
    }

    // Check if there are any objects on the canvas
    let objectCount = 0;
    for (const event of events) {
      if (event.type === 'object_add') objectCount++;
      if (event.type === 'object_remove') objectCount = Math.max(0, objectCount - 1);
    }

    const detected = objectCount === 0;

    return {
      factor: 'empty_canvas',
      weight: 30,
      detected,
      description: detected
        ? `Canvas is empty after ${Math.round(timeInSession / 60000)} minutes`
        : `Canvas has ${objectCount} objects`,
    };
  }

  /**
   * Factor 8: Session > 30 min with < 5 objects.
   */
  private checkLongSessionFewObjects(events: DesignEvent[], timeInSession: number): RiskFactor {
    if (timeInSession < LONG_SESSION_THRESHOLD_MS) {
      return {
        factor: 'long_session_few_objects',
        weight: 15,
        detected: false,
        description: 'Session is under 30 minutes',
      };
    }

    let objectCount = 0;
    for (const event of events) {
      if (event.type === 'object_add') objectCount++;
      if (event.type === 'object_remove') objectCount = Math.max(0, objectCount - 1);
    }

    const detected = objectCount < MIN_OBJECTS_FOR_LONG_SESSION;

    return {
      factor: 'long_session_few_objects',
      weight: 15,
      detected,
      description: detected
        ? `Only ${objectCount} objects placed in ${Math.round(timeInSession / 60000)} minute session`
        : `${objectCount} objects placed - good progress`,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Determine risk level from score.
   */
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  /**
   * Determine intervention type based on risk score and factors.
   */
  private getInterventionType(
    score: number,
    factors: RiskFactor[]
  ): AbandonmentRisk['suggestedIntervention'] {
    if (score < 30) return 'none';

    // Special case: frequent panel switching suggests UI complexity
    const panelFactor = factors.find((f) => f.factor === 'frequent_panel_switching');
    if (panelFactor?.detected && score < 50) return 'simplify_ui';

    if (score >= 70) return 'design_expert';
    if (score >= 50) return 'ai_suggestion';
    return 'help_tip';
  }

  /**
   * Generate a help tip intervention.
   */
  private generateHelpTip(risk: AbandonmentRisk): InterventionMessage {
    // Customize based on detected factors
    const detectedFactors = risk.factors.filter((f) => f.detected);

    if (detectedFactors.some((f) => f.factor === 'high_undo_rate')) {
      return {
        type: 'toast',
        title: 'Need help with your design?',
        message: 'It looks like you\'re experimenting with different options. Try our AI assistant for layout suggestions that match your room.',
        action: {
          label: 'Get AI help',
          handler: 'openAIChat',
        },
      };
    }

    if (detectedFactors.some((f) => f.factor === 'empty_canvas')) {
      return {
        type: 'toast',
        title: 'Getting started?',
        message: 'Not sure where to begin? Our quick-start templates let you start from a pre-made layout and customize from there.',
        action: {
          label: 'View templates',
          handler: 'openTemplates',
        },
      };
    }

    return {
      type: 'toast',
      title: 'Need help?',
      message: 'Our AI assistant can suggest layouts, help you choose materials, and answer design questions.',
      action: {
        label: 'Open assistant',
        handler: 'openAIChat',
      },
    };
  }

  /**
   * Generate an AI suggestion intervention.
   */
  private generateAISuggestion(risk: AbandonmentRisk): InterventionMessage {
    const detectedFactors = risk.factors.filter((f) => f.detected);

    if (detectedFactors.some((f) => f.factor === 'deletion_without_replacement')) {
      return {
        type: 'modal',
        title: 'Let AI help you redesign',
        message: 'It seems like you\'re rethinking your layout. Based on your room dimensions, here are 3 quick-start layouts that might inspire you. Each one is optimized for your space.',
        action: {
          label: 'See AI layouts',
          handler: 'generateAILayouts',
        },
      };
    }

    if (detectedFactors.some((f) => f.factor === 'rapid_switching')) {
      return {
        type: 'modal',
        title: 'Overwhelmed by choices?',
        message: 'There are many options to choose from! Our AI can narrow it down based on your style preferences and budget. Let it suggest a curated selection.',
        action: {
          label: 'Get personalized suggestions',
          handler: 'openStyleQuiz',
        },
      };
    }

    return {
      type: 'modal',
      title: 'AI Design Suggestions',
      message: 'Based on your room, here are 3 quick-start layouts. Each is optimized for workflow, storage, and style.',
      action: {
        label: 'View suggestions',
        handler: 'generateAILayouts',
      },
    };
  }

  /**
   * Generate a design expert offer intervention.
   */
  private generateDesignExpertOffer(_risk: AbandonmentRisk): InterventionMessage {
    return {
      type: 'modal',
      title: 'Chat with a Kitchen Design Expert',
      message: 'Designing a kitchen can be complex. Would you like to connect with one of our professional kitchen designers? They can help you make the right choices for your space, needs, and budget. First consultation is free!',
      action: {
        label: 'Chat with an expert',
        handler: 'connectDesignExpert',
      },
    };
  }

  /**
   * Create an empty risk result (for empty event arrays).
   */
  private createEmptyResult(): AbandonmentRisk {
    return {
      riskScore: 0,
      riskLevel: 'low',
      factors: [],
      suggestedIntervention: 'none',
      timeInSession: 0,
      actionsCount: 0,
      undoRate: 0,
    };
  }
}
