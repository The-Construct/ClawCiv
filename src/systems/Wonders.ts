// World Wonder/Monument System for ClawCiv
// Massive construction projects that provide permanent, powerful bonuses

export type WonderStatus = 'planning' | 'under_construction' | 'completed' | 'abandoned' | 'destroyed';
export type WonderCategory = 'ancient' | 'economic' | 'military' | 'cultural' | 'religious' | 'scientific';

export interface WonderBonus {
  type: 'resource_multiplier' | 'special_ability' | 'world_effect' | 'tribal_bonus' | 'passive_income';
  description: string;
  value?: any;
}

export interface WonderRequirement {
  type: 'resource' | 'technology' | 'population' | 'building' | 'wonder' | 'day';
  description: string;
  check: (gameState: any) => boolean;
}

export interface WonderStage {
  name: string;
  description: string;
  progressRequired: number;
  resourcesRequired: {
    food: number;
    energy: number;
    materials: number;
    knowledge: number;
    socialCapital: number;
  };
  bonuses: WonderBonus[];
}

export interface Wonder {
  id: string;
  name: string;
  category: WonderCategory;
  status: WonderStatus;
  icon: string;
  description: string;
  lore: string;

  // Location
  tribe: string; // Primary builder
  location: { x: number; y: number };

  // Construction
  dayStarted: number;
  dayCompleted: number;
  constructionProgress: number; // 0-100
  stages: WonderStage[];
  currentStage: number;
  contributors: Map<string, number>; // Tribe -> contribution

  // Requirements
  requirements: WonderRequirement[];

  // Benefits
  bonuses: WonderBonus[];
  passiveIncome: {
    food?: number;
    energy?: number;
    materials?: number;
    knowledge?: number;
    socialCapital?: number;
  };

  // Statistics
  totalInvestment: {
    food: number;
    energy: number;
    materials: number;
    knowledge: number;
    socialCapital: number;
  };
  builders: number; // Number of agents who contributed
  visitors: number; // Tourist visits

  // Damage
  damage: number; // 0-100
  canRepaired: boolean;
}

export class WonderSystem {
  private wonders: Map<string, Wonder> = new Map();
  private wonderIdCounter = 0;
  private availableWonders: Wonder[] = [];

  constructor() {
    this.initializeAvailableWonders();
  }

  private initializeAvailableWonders(): void {
    // This sets up the pool of wonders that can be built
    // Only one of each unique wonder can exist in the world
  }

  // Get available wonders that haven't been built yet
  getAvailableWonders(): Wonder[] {
    const builtNames = new Set(
      Array.from(this.wonders.values())
        .filter(w => w.status !== 'abandoned' && w.status !== 'destroyed')
        .map(w => w.name)
    );

    return this.availableWonders.filter(w => !builtNames.has(w.name));
  }

  // Begin construction of a wonder
  startWonder(
    tribe: string,
    wonderName: string,
    location: { x: number; y: number }
  ): Wonder | null {
    // Check if wonder is available
    const available = this.getAvailableWonders();
    const wonderTemplate = available.find(w => w.name === wonderName);
    if (!wonderTemplate) return null;

    // Check if requirements are met
    for (const req of wonderTemplate.requirements) {
      if (!req.check({ tribe, wonders: this.wonders })) {
        return null;
      }
    }

    const wonder: Wonder = {
      id: `wonder-${this.wonderIdCounter++}-${Date.now()}`,
      name: wonderTemplate.name,
      category: wonderTemplate.category,
      status: 'under_construction',
      icon: wonderTemplate.icon,
      description: wonderTemplate.description,
      lore: wonderTemplate.lore,
      tribe,
      location,
      dayStarted: Date.now(),
      dayCompleted: 0,
      constructionProgress: 0,
      stages: wonderTemplate.stages,
      currentStage: 0,
      contributors: new Map(),
      requirements: wonderTemplate.requirements,
      bonuses: wonderTemplate.bonuses,
      passiveIncome: wonderTemplate.passiveIncome,
      totalInvestment: {
        food: 0,
        energy: 0,
        materials: 0,
        knowledge: 0,
        socialCapital: 0
      },
      builders: 0,
      visitors: 0,
      damage: 0,
      canRepaired: true
    };

    this.wonders.set(wonder.id, wonder);
    return wonder;
  }

  // Contribute resources to wonder construction
  contributeToWonder(
    wonderId: string,
    tribe: string,
    resources: { food: number; energy: number; materials: number; knowledge: number; socialCapital: number }
  ): { progress: number; stageComplete: boolean; wonderComplete: boolean } | null {
    const wonder = this.wonders.get(wonderId);
    if (!wonder || wonder.status !== 'under_construction') return null;

    const currentStage = wonder.stages[wonder.currentStage];
    if (!currentStage) {
      return { progress: 0, stageComplete: false, wonderComplete: false };
    }

    // Check if resources meet stage requirements
    const req = currentStage.resourcesRequired;
    if (resources.food < req.food ||
        resources.energy < req.energy ||
        resources.materials < req.materials ||
        resources.knowledge < req.knowledge ||
        resources.socialCapital < req.socialCapital) {
      return null;
    }

    // Add contribution
    const currentContribution = wonder.contributors.get(tribe) || 0;
    wonder.contributors.set(tribe, currentContribution + 1);
    wonder.builders++;

    // Track investment
    wonder.totalInvestment.food += req.food;
    wonder.totalInvestment.energy += req.energy;
    wonder.totalInvestment.materials += req.materials;
    wonder.totalInvestment.knowledge += req.knowledge;
    wonder.totalInvestment.socialCapital += req.socialCapital;

    // Calculate progress (each stage is equal portion)
    const progressPerStage = 100 / wonder.stages.length;
    const progressGain = progressPerStage;
    wonder.constructionProgress = Math.min(100, wonder.constructionProgress + progressGain);

    // Check if stage complete
    const stageIndex = Math.floor(wonder.constructionProgress / progressPerStage);
    const stageComplete = stageIndex > wonder.currentStage && stageIndex < wonder.stages.length;

    if (stageComplete) {
      wonder.currentStage = stageIndex;
      // Apply stage bonuses
      const completedStage = wonder.stages[stageIndex - 1];
      if (completedStage && completedStage.bonuses) {
        // Would apply bonuses here
      }
    }

    // Check if wonder complete
    const wonderComplete = wonder.constructionProgress >= 100;
    if (wonderComplete) {
      wonder.status = 'completed';
      wonder.dayCompleted = Date.now();
    }

    return {
      progress: wonder.constructionProgress,
      stageComplete,
      wonderComplete
    };
  }

  // Get all wonders
  getAllWonders(): Wonder[] {
    return Array.from(this.wonders.values());
  }

  // Get wonders by status
  getWondersByStatus(status: WonderStatus): Wonder[] {
    return Array.from(this.wonders.values()).filter(w => w.status === status);
  }

  // Get wonders by tribe
  getWondersByTribe(tribe: string): Wonder[] {
    return Array.from(this.wonders.values()).filter(w => w.tribe === tribe);
  }

  // Get completed wonders
  getCompletedWonders(): Wonder[] {
    return Array.from(this.wonders.values()).filter(w => w.status === 'completed');
  }

  // Get wonder by ID
  getWonder(wonderId: string): Wonder | undefined {
    return this.wonders.get(wonderId);
  }

  // Apply wonder bonuses to game state
  applyWonderBonuses(gameState: any): {
    resourceMultipliers: { [resource: string]: number };
    specialAbilities: string[];
    passiveIncome: { [resource: string]: number };
  } {
    const result = {
      resourceMultipliers: {} as { [resource: string]: number },
      specialAbilities: [] as string[],
      passiveIncome: {} as { [resource: string]: number }
    };

    const completedWonders = this.getCompletedWonders();

    for (const wonder of completedWonders) {
      // Apply passive income
      if (wonder.passiveIncome) {
        for (const [resource, amount] of Object.entries(wonder.passiveIncome)) {
          if (typeof amount === 'number') {
            result.passiveIncome[resource] = (result.passiveIncome[resource] || 0) + amount;
          }
        }
      }

      // Apply bonuses
      for (const bonus of wonder.bonuses) {
        if (bonus.type === 'special_ability') {
          result.specialAbilities.push(bonus.description);
        }
        if (bonus.type === 'resource_multiplier' && bonus.value) {
          const resource = bonus.value.resource;
          const multiplier = bonus.value.multiplier;
          if (resource && multiplier) {
            result.resourceMultipliers[resource] =
              (result.resourceMultipliers[resource] || 1) * multiplier;
          }
        }
      }
    }

    return result;
  }

  // Damage a wonder (from war, disaster, etc.)
  damageWonder(wonderId: string, damage: number): boolean {
    const wonder = this.wonders.get(wonderId);
    if (!wonder || wonder.status !== 'completed') return false;

    wonder.damage = Math.min(100, wonder.damage + damage);

    if (wonder.damage >= 100) {
      wonder.status = 'destroyed';
      return true;
    }

    return false;
  }

  // Repair a wonder
  repairWonder(wonderId: string, repairAmount: number): boolean {
    const wonder = this.wonders.get(wonderId);
    if (!wonder || !wonder.canRepaired) return false;

    wonder.damage = Math.max(0, wonder.damage - repairAmount);

    if (wonder.damage === 0) {
      wonder.status = 'completed';
    }

    return true;
  }

  // Abandon wonder construction
  abandonWonder(wonderId: string): boolean {
    const wonder = this.wonders.get(wonderId);
    if (!wonder || wonder.status !== 'under_construction') return false;

    wonder.status = 'abandoned';
    return true;
  }

  // Visit a wonder (tourism)
  visitWonder(wonderId: string): number {
    const wonder = this.wonders.get(wonderId);
    if (!wonder || wonder.status !== 'completed') return 0;

    wonder.visitors++;

    // Generate social capital from visitors
    return 10;
  }

  // Get wonder construction info
  getWonderInfo(wonderId: string): {
    progress: number;
    currentStage: number;
    totalStages: number;
    stageName: string;
    stageProgress: number;
    resourcesNeeded: any;
  } | null {
    const wonder = this.wonders.get(wonderId);
    if (!wonder) return null;

    const currentStage = wonder.stages[wonder.currentStage];
    const progressPerStage = 100 / wonder.stages.length;
    const stageProgress = (wonder.constructionProgress % progressPerStage) / progressPerStage * 100;

    return {
      progress: wonder.constructionProgress,
      currentStage: wonder.currentStage,
      totalStages: wonder.stages.length,
      stageName: currentStage?.name || '',
      stageProgress,
      resourcesNeeded: currentStage?.resourcesRequired || {}
    };
  }

  // Update wonders (daily)
  updateWonders(currentDay: number): { events: string[] } {
    const events: string[] = [];

    for (const wonder of this.wonders.values()) {
      // Passive income for completed wonders
      if (wonder.status === 'completed') {
        // Would apply passive income to tribes
      }

      // Check for abandonment of long-stalled construction
      if (wonder.status === 'under_construction') {
        const daysSinceStart = currentDay - wonder.dayStarted;
        if (daysSinceStart > 365 && wonder.builders === 0) {
          wonder.status = 'abandoned';
          events.push(`🏛️ Construction of ${wonder.name} has been abandoned due to inactivity!`);
        }
      }
    }

    return { events };
  }

  // Generate predefined wonder templates
  private static generateWonderTemplates(): Wonder[] {
    return [
      {
        id: 'great_pyramid',
        name: 'Great Pyramid of Giza',
        category: 'ancient',
        status: 'planning' as WonderStatus,
        icon: '🔺',
        description: 'A monumental tomb that demonstrates the power and engineering prowess of civilization',
        lore: 'Built as an eternal monument to the divine pharaohs, the Great Pyramid has stood for millennia.',
        tribe: '',
        location: { x: 0, y: 0 },
        dayStarted: 0,
        dayCompleted: 0,
        constructionProgress: 0,
        stages: [
          {
            name: 'Foundation',
            description: 'Lay the massive stone foundation',
            progressRequired: 25,
            resourcesRequired: { food: 5000, energy: 3000, materials: 8000, knowledge: 500, socialCapital: 1000 },
            bonuses: []
          },
          {
            name: 'Core Structure',
            description: 'Build the inner chambers and passages',
            progressRequired: 50,
            resourcesRequired: { food: 7000, energy: 5000, materials: 12000, knowledge: 1000, socialCapital: 1500 },
            bonuses: []
          },
          {
            name: 'Casing Stones',
            description: 'Place the polished limestone casing',
            progressRequired: 75,
            resourcesRequired: { food: 10000, energy: 7000, materials: 15000, knowledge: 2000, socialCapital: 2000 },
            bonuses: []
          },
          {
            name: 'Capstone',
            description: 'Place the golden capstone at the summit',
            progressRequired: 100,
            resourcesRequired: { food: 15000, energy: 10000, materials: 20000, knowledge: 5000, socialCapital: 5000 },
            bonuses: [{
              type: 'special_ability',
              description: '+50% social cohesion for all tribes, +20% materials production'
            }]
          }
        ],
        currentStage: 0,
        contributors: new Map(),
        requirements: [],
        bonuses: [{
          type: 'world_effect',
          description: '+20% materials production, +50% tourism income'
        }],
        passiveIncome: {
          socialCapital: 50
        },
        totalInvestment: { food: 0, energy: 0, materials: 0, knowledge: 0, socialCapital: 0 },
        builders: 0,
        visitors: 0,
        damage: 0,
        canRepaired: true
      },
      {
        id: 'colossus',
        name: 'Colossus of Rhodes',
        category: 'military',
        status: 'planning' as WonderStatus,
        icon: '🗿',
        description: 'A giant bronze statue of the sun god Helios guarding the harbor',
        lore: 'One of the Seven Wonders of the Ancient World, standing guard over the harbor.',
        tribe: '',
        location: { x: 0, y: 0 },
        dayStarted: 0,
        dayCompleted: 0,
        constructionProgress: 0,
        stages: [
          {
            name: 'Pedestal',
            description: 'Create the massive stone base',
            progressRequired: 33,
            resourcesRequired: { food: 3000, energy: 2000, materials: 6000, knowledge: 500, socialCapital: 800 },
            bonuses: []
          },
          {
            name: 'Bronze Casting',
            description: 'Cast the bronze plates and framework',
            progressRequired: 66,
            resourcesRequired: { food: 6000, energy: 8000, materials: 10000, knowledge: 2000, socialCapital: 1500 },
            bonuses: []
          },
          {
            name: 'Assembly',
            description: 'Assemble the giant statue',
            progressRequired: 100,
            resourcesRequired: { food: 10000, energy: 12000, materials: 15000, knowledge: 3000, socialCapital: 2500 },
            bonuses: [{
              type: 'special_ability',
              description: '+30% combat power for home tribe, deterrence against naval invasions'
            }]
          }
        ],
        currentStage: 0,
        contributors: new Map(),
        requirements: [],
        bonuses: [{
          type: 'world_effect',
          description: '+30% combat power for home tribe, naval protection'
        }],
        passiveIncome: {
          socialCapital: 30
        },
        totalInvestment: { food: 0, energy: 0, materials: 0, knowledge: 0, socialCapital: 0 },
        builders: 0,
        visitors: 0,
        damage: 0,
        canRepaired: true
      },
      {
        id: 'great_library',
        name: 'Great Library of Alexandria',
        category: 'scientific',
        status: 'planning' as WonderStatus,
        icon: '📚',
        description: 'A repository of all knowledge containing scrolls from every known civilization',
        lore: 'The ancient worlds largest collection of knowledge, housing works from countless scholars.',
        tribe: '',
        location: { x: 0, y: 0 },
        dayStarted: 0,
        dayCompleted: 0,
        constructionProgress: 0,
        stages: [
          {
            name: 'Main Hall',
            description: 'Build the central reading room',
            progressRequired: 25,
            resourcesRequired: { food: 2000, energy: 2000, materials: 4000, knowledge: 1000, socialCapital: 500 },
            bonuses: []
          },
          {
            name: 'Scroll Collection',
            description: 'Acquire scrolls from across the known world',
            progressRequired: 50,
            resourcesRequired: { food: 3000, energy: 3000, materials: 5000, knowledge: 5000, socialCapital: 1000 },
            bonuses: []
          },
          {
            name: 'Scriptorium',
            description: 'Build the manuscript copying workshops',
            progressRequired: 75,
            resourcesRequired: { food: 4000, energy: 4000, materials: 6000, knowledge: 8000, socialCapital: 1500 },
            bonuses: []
          },
          {
            name: 'Wing Expansion',
            description: 'Add specialized wings for different fields of study',
            progressRequired: 100,
            resourcesRequired: { food: 6000, energy: 6000, materials: 8000, knowledge: 15000, socialCapital: 3000 },
            bonuses: [{
              type: 'special_ability',
              description: '+100% research speed, unlock random technologies'
            }]
          }
        ],
        currentStage: 0,
        contributors: new Map(),
        requirements: [],
        bonuses: [{
          type: 'world_effect',
          description: '+100% research speed, accelerated technology discovery'
        }],
        passiveIncome: {
          knowledge: 100
        },
        totalInvestment: { food: 0, energy: 0, materials: 0, knowledge: 0, socialCapital: 0 },
        builders: 0,
        visitors: 0,
        damage: 0,
        canRepaired: true
      },
      {
        id: 'hanging_gardens',
        name: 'Hanging Gardens of Babylon',
        category: 'cultural',
        status: 'planning' as WonderStatus,
        icon: '🌳',
        description: 'Terraced gardens with exotic plants from distant lands',
        lore: 'A lush oasis in the desert, said to have been built by a king for his homesick queen.',
        tribe: '',
        location: { x: 0, y: 0 },
        dayStarted: 0,
        dayCompleted: 0,
        constructionProgress: 0,
        stages: [
          {
            name: 'Terraces',
            description: 'Build the stone terraces',
            progressRequired: 33,
            resourcesRequired: { food: 4000, energy: 3000, materials: 7000, knowledge: 500, socialCapital: 1000 },
            bonuses: []
          },
          {
            name: 'Irrigation',
            description: 'Install the complex watering system',
            progressRequired: 66,
            resourcesRequired: { food: 6000, energy: 5000, materials: 8000, knowledge: 1500, socialCapital: 1500 },
            bonuses: []
          },
          {
            name: 'Exotic Flora',
            description: 'Plant rare trees and flowers from distant lands',
            progressRequired: 100,
            resourcesRequired: { food: 10000, energy: 8000, materials: 6000, knowledge: 2000, socialCapital: 3000 },
            bonuses: [{
              type: 'special_ability',
              description: '+40% food production, +50% social capital, tourism attraction'
            }]
          }
        ],
        currentStage: 0,
        contributors: new Map(),
        requirements: [],
        bonuses: [{
          type: 'world_effect',
          description: '+40% food production, +50% social capital'
        }],
        passiveIncome: {
          food: 50,
          socialCapital: 40
        },
        totalInvestment: { food: 0, energy: 0, materials: 0, knowledge: 0, socialCapital: 0 },
        builders: 0,
        visitors: 0,
        damage: 0,
        canRepaired: true
      }
    ];
  }

  // Get wonder builder rankings
  getBuilderRankings(): { wonderId: string; wonderName: string; tribe: string; contribution: number }[] {
    const rankings: { wonderId: string; wonderName: string; tribe: string; contribution: number }[] = [];

    for (const wonder of this.wonders.values()) {
      for (const [tribe, count] of wonder.contributors) {
        rankings.push({
          wonderId: wonder.id,
          wonderName: wonder.name,
          tribe,
          contribution: count
        });
      }
    }

    rankings.sort((a, b) => b.contribution - a.contribution);
    return rankings.slice(0, 10);
  }

  public serialize(): any {
    return {
      wonders: Array.from(this.wonders.entries()),
      wonderIdCounter: this.wonderIdCounter
    };
  }

  public deserialize(data: any): void {
    this.wonders = new Map(data.wonders || []);
    this.wonderIdCounter = data.wonderIdCounter || 0;

    // Convert contributors arrays back to Maps
    for (const [id, wonder] of this.wonders) {
      if (Array.isArray(wonder.contributors)) {
        wonder.contributors = new Map(wonder.contributors);
      }
    }
  }
}
