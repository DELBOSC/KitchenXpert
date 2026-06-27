/**
 * AI Chat Tool-Use Definitions for Scene Modification
 *
 * Defines the tools available to the AI chat assistant for modifying
 * the 3D kitchen scene, querying analytics, and suggesting products.
 */

export const KITCHEN_CHAT_TOOLS = [
  {
    name: 'move_object',
    description: 'Move a kitchen object (cabinet, appliance, etc.) to a new position',
    input_schema: {
      type: 'object' as const,
      properties: {
        objectName: { type: 'string' as const, description: 'Name or type of the object to move' },
        direction: {
          type: 'string' as const,
          enum: ['left', 'right', 'forward', 'backward'],
          description: 'Direction to move',
        },
        distance: { type: 'number' as const, description: 'Distance in centimeters' },
      },
      required: ['objectName', 'direction', 'distance'],
    },
  },
  {
    name: 'add_cabinet',
    description: 'Add a new cabinet to the kitchen design',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string' as const,
          enum: ['base', 'wall', 'tall', 'island'],
          description: 'Cabinet type',
        },
        width: {
          type: 'number' as const,
          description: 'Width in centimeters (30, 40, 45, 50, 60, 80, 90, 100, 120)',
        },
        position: {
          type: 'string' as const,
          enum: ['left_wall', 'right_wall', 'back_wall', 'island'],
          description: 'Where to place the cabinet',
        },
        style: {
          type: 'string' as const,
          description: 'Cabinet style (modern, shaker, slab, etc.)',
        },
      },
      required: ['type', 'width'],
    },
  },
  {
    name: 'remove_object',
    description: 'Remove an object from the kitchen design',
    input_schema: {
      type: 'object' as const,
      properties: {
        objectName: {
          type: 'string' as const,
          description: 'Name or type of the object to remove',
        },
      },
      required: ['objectName'],
    },
  },
  {
    name: 'change_material',
    description: 'Change the material/color of a kitchen element',
    input_schema: {
      type: 'object' as const,
      properties: {
        objectName: { type: 'string' as const, description: 'Name or type of the object' },
        material: {
          type: 'string' as const,
          description:
            'New material (oak, walnut, white-lacquer, marble, granite, quartz, stainless-steel)',
        },
      },
      required: ['objectName', 'material'],
    },
  },
  {
    name: 'get_work_triangle',
    description: 'Analyze the current work triangle (sink-cooktop-fridge distances)',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_accessibility_score',
    description: 'Check the kitchen accessibility compliance score',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'calculate_displacement_cost',
    description: 'Calculate the plumbing/electrical displacement cost for moving an item',
    input_schema: {
      type: 'object' as const,
      properties: {
        itemType: {
          type: 'string' as const,
          description: 'Type of item (sink, dishwasher, cooktop, oven, fridge, hood)',
        },
        newPosition: { type: 'string' as const, description: 'Description of new position' },
      },
      required: ['itemType'],
    },
  },
  {
    name: 'get_budget_summary',
    description: 'Get the current budget breakdown and total cost',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'change_layout',
    description: 'Switch the kitchen layout type',
    input_schema: {
      type: 'object' as const,
      properties: {
        layout: {
          type: 'string' as const,
          enum: ['I', 'L', 'U', 'G', 'island', 'peninsula'],
          description: 'New layout type',
        },
      },
      required: ['layout'],
    },
  },
  {
    name: 'add_appliance',
    description: 'Add an appliance to the kitchen',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string' as const,
          enum: ['cooktop', 'oven', 'fridge', 'dishwasher', 'hood', 'microwave', 'washing_machine'],
          description: 'Appliance type',
        },
        brand: { type: 'string' as const, description: 'Preferred brand (optional)' },
        width: { type: 'number' as const, description: 'Width in cm (optional)' },
      },
      required: ['type'],
    },
  },
  {
    name: 'switch_view',
    description: 'Switch the camera to a different view',
    input_schema: {
      type: 'object' as const,
      properties: {
        view: {
          type: 'string' as const,
          enum: ['top', 'front', 'right', 'left', 'back', 'perspective', '3d'],
          description: 'Camera view',
        },
      },
      required: ['view'],
    },
  },
  {
    name: 'suggest_products',
    description: 'Suggest products from the catalog based on criteria',
    input_schema: {
      type: 'object' as const,
      properties: {
        category: { type: 'string' as const, description: 'Product category' },
        style: { type: 'string' as const, description: 'Desired style' },
        maxPrice: { type: 'number' as const, description: 'Maximum price in EUR' },
      },
      required: ['category'],
    },
  },
] as const;

export type KitchenToolName = (typeof KITCHEN_CHAT_TOOLS)[number]['name'];
