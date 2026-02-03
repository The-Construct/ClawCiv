// Tech Tree System for ClawCiv

export interface Tech {
  id: string;
  name: string;
  description: string;
  cost: {
    food: number;
    knowledge: number;
    socialCapital: number;
  };
  requirements: string[];
  effects: {
    resourceBonus?: { [key: string]: number };
    unlockBuildings?: string[];
    agentBonus?: { [key: string]: number };
  };
  researched: boolean;
}

export class TechTree {
  private technologies: Map<string, Tech>;

  constructor() {
    this.technologies = new Map();
    this.initializeTechs();
  }

  private initializeTechs(): void {
    // Tier 1 - Basic Techs
    this.addTech({
      id: 'agriculture',
      name: 'Agriculture',
      description: 'Basic farming techniques',
      cost: { food: 50, knowledge: 20, socialCapital: 10 },
      requirements: [],
      effects: { resourceBonus: { food: 1.2 } },
      researched: false
    });

    this.addTech({
      id: 'tool_making',
      name: 'Tool Making',
      description: 'Craft basic tools',
      cost: { food: 30, knowledge: 40, socialCapital: 10 },
      requirements: [],
      effects: { resourceBonus: { materials: 1.3 } },
      researched: false
    });

    this.addTech({
      id: 'writing',
      name: 'Writing',
      description: 'Record knowledge and history',
      cost: { food: 40, knowledge: 50, socialCapital: 20 },
      requirements: [],
      effects: { resourceBonus: { knowledge: 1.4 } },
      researched: false
    });

    // Tier 2 - Intermediate Techs
    this.addTech({
      id: 'irrigation',
      name: 'Irrigation',
      description: 'Water management for farms',
      cost: { food: 100, knowledge: 60, socialCapital: 30 },
      requirements: ['agriculture'],
      effects: { resourceBonus: { food: 1.5 } },
      researched: false
    });

    this.addTech({
      id: 'metallurgy',
      name: 'Metallurgy',
      description: 'Work with metals',
      cost: { food: 80, knowledge: 100, socialCapital: 40 },
      requirements: ['tool_making'],
      effects: { resourceBonus: { materials: 1.6 } },
      researched: false
    });

    this.addTech({
      id: 'mathematics',
      name: 'Mathematics',
      description: 'Advanced calculations',
      cost: { food: 60, knowledge: 120, socialCapital: 30 },
      requirements: ['writing'],
      effects: { resourceBonus: { knowledge: 1.7 } },
      researched: false
    });

    this.addTech({
      id: 'trade_routes',
      name: 'Trade Routes',
      description: 'Establish trade networks',
      cost: { food: 70, knowledge: 50, socialCapital: 80 },
      requirements: ['writing'],
      effects: { resourceBonus: { socialCapital: 1.5 } },
      researched: false
    });

    // Tier 3 - Advanced Techs
    this.addTech({
      id: 'architecture',
      name: 'Architecture',
      description: 'Design grand structures',
      cost: { food: 150, knowledge: 150, socialCapital: 100 },
      requirements: ['irrigation', 'metallurgy'],
      effects: {
        resourceBonus: { materials: 1.3 },
        unlockBuildings: ['monument', 'granary']
      },
      researched: false
    });

    this.addTech({
      id: 'philosophy',
      name: 'Philosophy',
      description: 'Understand the nature of existence',
      cost: { food: 100, knowledge: 200, socialCapital: 120 },
      requirements: ['mathematics', 'writing'],
      effects: {
        resourceBonus: { knowledge: 2.0, socialCapital: 1.3 }
      },
      researched: false
    });

    this.addTech({
      id: 'currency',
      name: 'Currency',
      description: 'Standardized monetary system',
      cost: { food: 120, knowledge: 100, socialCapital: 150 },
      requirements: ['trade_routes', 'metallurgy'],
      effects: {
        resourceBonus: { socialCapital: 2.0 }
      },
      researched: false
    });

    // Tier 4 - Late Game Techs
    this.addTech({
      id: 'engineering',
      name: 'Engineering',
      description: 'Advanced construction techniques',
      cost: { food: 200, knowledge: 250, socialCapital: 150 },
      requirements: ['architecture', 'mathematics'],
      effects: {
        resourceBonus: { materials: 1.8 },
        unlockBuildings: ['wonder', 'fortress']
      },
      researched: false
    });

    this.addTech({
      id: 'governance',
      name: 'Governance',
      description: 'Organized society management',
      cost: { food: 150, knowledge: 200, socialCapital: 250 },
      requirements: ['philosophy', 'currency'],
      effects: {
        resourceBonus: { socialCapital: 2.5 },
        agentBonus: { leader: 2.0 }
      },
      researched: false
    });

    this.addTech({
      id: 'enlightenment',
      name: 'Enlightenment',
      description: 'Age of reason and discovery',
      cost: { food: 250, knowledge: 400, socialCapital: 200 },
      requirements: ['engineering', 'governance'],
      effects: {
        resourceBonus: { knowledge: 3.0 }
      },
      researched: false
    });
  }

  private addTech(tech: Tech): void {
    this.technologies.set(tech.id, tech);
  }

  getTech(id: string): Tech | undefined {
    return this.technologies.get(id);
  }

  getAllTechs(): Tech[] {
    return Array.from(this.technologies.values());
  }

  getAvailableTechs(): Tech[] {
    return this.getAllTechs().filter(tech =>
      !tech.researched &&
      tech.requirements.every(req => {
        const reqTech = this.technologies.get(req);
        return reqTech && reqTech.researched;
      })
    );
  }

  getResearchedTechs(): Tech[] {
    return this.getAllTechs().filter(tech => tech.researched);
  }

  canResearch(techId: string): boolean {
    const tech = this.technologies.get(techId);
    if (!tech || tech.researched) return false;

    return tech.requirements.every(req => {
      const reqTech = this.technologies.get(req);
      return reqTech && reqTech.researched;
    });
  }

  research(techId: string, resources: { food: number; knowledge: number; socialCapital: number }): boolean {
    const tech = this.technologies.get(techId);
    if (!tech || tech.researched) return false;

    // Check if requirements are met
    if (!this.canResearch(techId)) return false;

    // Check if resources are sufficient
    if (resources.food < tech.cost.food ||
        resources.knowledge < tech.cost.knowledge ||
        resources.socialCapital < tech.cost.socialCapital) {
      return false;
    }

    tech.researched = true;
    return true;
  }

  getResearchProgress(): { researched: number; total: number } {
    const total = this.technologies.size;
    const researched = this.getResearchedTechs().length;
    return { researched, total };
  }

  getBonus(resourceType: string): number {
    let bonus = 1.0;

    for (const tech of this.getResearchedTechs()) {
      if (tech.effects.resourceBonus && tech.effects.resourceBonus[resourceType]) {
        bonus *= tech.effects.resourceBonus[resourceType];
      }
    }

    return bonus;
  }

  hasBuildingUnlocked(buildingType: string): boolean {
    for (const tech of this.getResearchedTechs()) {
      if (tech.effects.unlockBuildings && tech.effects.unlockBuildings.includes(buildingType)) {
        return true;
      }
    }
    return false;
  }

  public serialize(): any {
    return {
      technologies: Array.from(this.technologies.entries())
    };
  }

  public deserialize(data: any): void {
    this.technologies = new Map(data.technologies);
    for (const [id, tech] of this.technologies) {
      tech.researched = false;
    }
  }
}
