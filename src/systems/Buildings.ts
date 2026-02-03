// Building System for ClawCiv

export interface Building {
  id: string;
  type: string;
  name: string;
  tribe: string;
  x: number;
  z: number;
  health: number;
  maxHealth: number;
  level: number;
  constructionProgress: number;
  benefits: {
    food?: number;
    energy?: number;
    materials?: number;
    knowledge?: number;
    socialCapital?: number;
  };
}

export class BuildingSystem {
  private buildings: Map<string, Building> = new Map();

  private readonly BUILDING_TYPES = {
    farm: {
      name: 'Farm',
      cost: { food: 50, materials: 30, knowledge: 0 },
      health: 100,
      benefits: { food: 5 },
      requiredTech: 'agriculture'
    },
    mine: {
      name: 'Mine',
      cost: { food: 30, materials: 50, knowledge: 0 },
      health: 150,
      benefits: { materials: 3 },
      requiredTech: 'tool_making'
    },
    library: {
      name: 'Library',
      cost: { food: 40, materials: 40, knowledge: 20 },
      health: 80,
      benefits: { knowledge: 2 },
      requiredTech: 'writing'
    },
    market: {
      name: 'Market',
      cost: { food: 60, materials: 60, knowledge: 30 },
      health: 100,
      benefits: { socialCapital: 4 },
      requiredTech: 'trade_routes'
    },
    granary: {
      name: 'Granary',
      cost: { food: 100, materials: 80, knowledge: 40 },
      health: 200,
      benefits: { food: 10 },
      requiredTech: 'irrigation'
    },
    workshop: {
      name: 'Workshop',
      cost: { food: 80, materials: 100, knowledge: 50 },
      health: 150,
      benefits: { materials: 6 },
      requiredTech: 'metallurgy'
    },
    university: {
      name: 'University',
      cost: { food: 100, materials: 100, knowledge: 100 },
      health: 120,
      benefits: { knowledge: 8 },
      requiredTech: 'mathematics'
    },
    temple: {
      name: 'Temple',
      cost: { food: 120, materials: 80, knowledge: 60 },
      health: 180,
      benefits: { socialCapital: 8 },
      requiredTech: 'philosophy'
    },
    monument: {
      name: 'Monument',
      cost: { food: 200, materials: 200, knowledge: 150 },
      health: 300,
      benefits: { socialCapital: 15 },
      requiredTech: 'architecture'
    },
    fortress: {
      name: 'Fortress',
      cost: { food: 150, materials: 250, knowledge: 100 },
      health: 500,
      benefits: { socialCapital: 5 },
      requiredTech: 'engineering'
    },
    wonder: {
      name: 'Great Wonder',
      cost: { food: 500, materials: 500, knowledge: 400 },
      health: 1000,
      benefits: { food: 20, knowledge: 20, socialCapital: 20 },
      requiredTech: 'enlightenment'
    }
  };

  canBuild(tribe: string, buildingType: string, resources: { food: number; materials: number; knowledge: number }, researchedTechs: string[]): boolean {
    const type = this.BUILDING_TYPES[buildingType as keyof typeof this.BUILDING_TYPES];
    if (!type) return false;

    // Check if tech is researched
    if (type.requiredTech && !researchedTechs.includes(type.requiredTech)) {
      return false;
    }

    // Check if resources are sufficient
    if (resources.food < type.cost.food ||
        resources.materials < type.cost.materials ||
        resources.knowledge < type.cost.knowledge) {
      return false;
    }

    return true;
  }

  startConstruction(tribe: string, buildingType: string, x: number, z: number): Building {
    const type = this.BUILDING_TYPES[buildingType as keyof typeof this.BUILDING_TYPES];
    if (!type) throw new Error(`Invalid building type: ${buildingType}`);

    const building: Building = {
      id: `building-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: buildingType,
      name: type.name,
      tribe,
      x,
      z,
      health: type.health * 0.1, // Start with 10% health
      maxHealth: type.health,
      level: 1,
      constructionProgress: 0,
      benefits: type.benefits
    };

    this.buildings.set(building.id, building);
    return building;
  }

  getBuildings(): Building[] {
    return Array.from(this.buildings.values());
  }

  getBuildingsByTribe(tribe: string): Building[] {
    return this.getBuildings().filter(b => b.tribe === tribe);
  }

  getBuilding(id: string): Building | undefined {
    return this.buildings.get(id);
  }

  updateBuilding(id: string): boolean {
    const building = this.buildings.get(id);
    if (!building) return false;

    // Construction progress
    if (building.constructionProgress < 100) {
      building.constructionProgress += 10;
      if (building.constructionProgress >= 100) {
        building.constructionProgress = 100;
        building.health = building.maxHealth;
      }
      return true;
    }

    // Passive regeneration
    if (building.health < building.maxHealth) {
      building.health = Math.min(building.maxHealth, building.health + 1);
    }

    return true;
  }

  damageBuilding(id: string, damage: number): boolean {
    const building = this.buildings.get(id);
    if (!building) return false;

    building.health -= damage;

    if (building.health <= 0) {
      this.buildings.delete(id);
      return true; // Destroyed
    }

    return false; // Still standing
  }

  getTribeBenefits(tribe: string): { [key: string]: number } {
    const buildings = this.getBuildingsByTribe(tribe).filter(b => b.constructionProgress >= 100);
    const benefits: { [key: string]: number } = {
      food: 0,
      energy: 0,
      materials: 0,
      knowledge: 0,
      socialCapital: 0
    };

    for (const building of buildings) {
      for (const [resource, amount] of Object.entries(building.benefits)) {
        benefits[resource] = (benefits[resource] || 0) + (amount as number);
      }
    }

    return benefits;
  }
}
