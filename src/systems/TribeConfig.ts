// Tribe Differentiation System for ClawCiv
// Each tribe has unique traits, culture, advantages, and tendencies

export interface TribeConfig {
  id: string;
  name: string;
  color: string;
  description: string;
  culturalTrait: string;
  startingBonus: {
    food?: number;
    energy?: number;
    materials?: number;
    knowledge?: number;
    socialCapital?: number;
  };
  skillAffinity: {
    [skill: string]: number; // Multiplier for skill effectiveness (0.5 to 2.0)
  };
  resourceModifiers: {
    food: number;    // Production multiplier
    energy: number;
    materials: number;
    knowledge: number;
    socialCapital: number;
  };
  combatModifier: number;      // Combat effectiveness
  tradeModifier: number;        // Trade bonus
  researchModifier: number;     // Research speed
  buildingModifier: number;     // Construction speed/cost
  diplomacyModifier: number;    // Relationship change speed
  specialAbility: {
    name: string;
    description: string;
    icon: string;
    cooldown: number; // In days
    lastUsed: number;
    effect: (tribe: string, agents: any[], gameState: any) => void;
  };
  tendencies: {
    aggression: number;      // 0-100, likelihood to initiate conflict
    cooperation: number;     // 0-100, likelihood to form alliances
    exploration: number;     // 0-100, likelihood to explore new territories
    innovation: number;      // 0-100, likelihood to research tech
    trade: number;           // 0-100, likelihood to engage in trade
  };
  weaknesses: {
    [key: string]: string;   // Description of tribal weaknesses
  };
}

export class TribeConfigSystem {
  private tribes: Map<string, TribeConfig> = new Map();

  constructor() {
    this.initializeTribes();
  }

  private initializeTribes(): void {
    // ALPHA TRIBE - The Warriors
    this.tribes.set('Alpha', {
      id: 'Alpha',
      name: 'Alpha',
      color: '#ef4444', // Red
      description: 'Martial society focused on strength and conquest',
      culturalTrait: 'Honor Bound - Warriors who value strength above all',
      startingBonus: {
        food: 120,
        energy: 120,
        materials: 80,
        knowledge: 30,
        socialCapital: 40
      },
      skillAffinity: {
        combat: 1.5,      // +50% combat effectiveness
        building: 0.8,    // -20% building speed
        research: 0.7,    // -30% research speed
        trade: 0.9,       // -10% trade effectiveness
        farming: 1.0,
        mining: 1.2,       // +20% materials
        diplomacy: 0.7,    // -30% diplomatic effectiveness
        crafting: 1.1,
        leadership: 1.3    // +30% leadership
      },
      resourceModifiers: {
        food: 1.0,
        energy: 1.2,       // +20% energy production
        materials: 1.2,    // +20% materials
        knowledge: 0.7,    // -30% knowledge
        socialCapital: 0.8 // -20% social capital
      },
      combatModifier: 1.3,     // +30% combat power
      tradeModifier: 0.9,      // -10% trade income
      researchModifier: 0.7,   // -30% research speed
      buildingModifier: 0.9,   // -10% building speed
      diplomacyModifier: 0.8,  // Relationships change slower
      specialAbility: {
        name: 'Battle Cry',
        description: 'All Alpha agents gain +50% combat effectiveness for 5 days',
        icon: '⚔️',
        cooldown: 20,
        lastUsed: -100,
        effect: (tribe, agents, gameState) => {
          // Would apply temporary buff
          console.log('Battle Cry activated for Alpha tribe!');
        }
      },
      tendencies: {
        aggression: 75,      // Highly aggressive
        cooperation: 40,     // Less cooperative
        exploration: 60,     // Moderate exploration
        innovation: 45,      // Below average innovation
        trade: 50           // Average trade interest
      },
      weaknesses: {
        research: 'Slow to adapt and innovate',
        diplomacy: 'Struggles with peaceful negotiations',
        social: 'Lower social cohesion'
      }
    });

    // BETA TRIBE - The Merchants
    this.tribes.set('Beta', {
      id: 'Beta',
      name: 'Beta',
      color: '#22c55e', // Green
      description: 'Commercial society focused on trade and wealth',
      culturalTrait: 'Profit Seekers - Commerce is the highest virtue',
      startingBonus: {
        food: 80,
        energy: 80,
        materials: 60,
        knowledge: 50,
        socialCapital: 120
      },
      skillAffinity: {
        combat: 0.7,      // -30% combat effectiveness
        building: 1.0,
        research: 1.0,
        trade: 1.5,       // +50% trade effectiveness
        farming: 0.9,
        mining: 0.8,
        diplomacy: 1.4,    // +40% diplomatic effectiveness
        crafting: 1.2,    // +20% crafting
        leadership: 0.9
      },
      resourceModifiers: {
        food: 0.9,
        energy: 0.9,
        materials: 0.9,
        knowledge: 1.1,
        socialCapital: 1.4  // +40% social capital
      },
      combatModifier: 0.7,     // -30% combat power
      tradeModifier: 1.5,      // +50% trade income
      researchModifier: 1.0,
      buildingModifier: 1.0,
      diplomacyModifier: 1.3,   // +30% relationship changes
      specialAbility: {
        name: 'Trade Boom',
        description: 'All Beta agents earn +100% trade income for 5 days',
        icon: '💰',
        cooldown: 20,
        lastUsed: -100,
        effect: (tribe, agents, gameState) => {
          console.log('Trade Boom activated for Beta tribe!');
        }
      },
      tendencies: {
        aggression: 30,      // Low aggression
        cooperation: 80,     // Highly cooperative
        exploration: 70,     // High exploration (trade routes)
        innovation: 60,      // Above average innovation
        trade: 95            // Very high trade interest
      },
      weaknesses: {
        combat: 'Weak in direct confrontation',
        production: 'Lower resource production',
        conquest: 'Not expansionist'
      }
    });

    // GAMMA TRIBE - The Scholars
    this.tribes.set('Gamma', {
      id: 'Gamma',
      name: 'Gamma',
      color: '#fbbf24', // Yellow/Gold
      description: 'Intellectual society focused on knowledge and innovation',
      culturalTrait: 'Seekers of Truth - Knowledge is the path to power',
      startingBonus: {
        food: 70,
        energy: 70,
        materials: 50,
        knowledge: 150,
        socialCapital: 70
      },
      skillAffinity: {
        combat: 0.8,
        building: 1.1,      // +10% building speed
        research: 1.6,     // +60% research effectiveness
        trade: 1.1,
        farming: 0.8,
        mining: 0.9,
        diplomacy: 1.2,     // +20% diplomatic effectiveness
        crafting: 1.3,     // +30% crafting
        leadership: 1.0
      },
      resourceModifiers: {
        food: 0.85,
        energy: 0.85,
        materials: 0.9,
        knowledge: 1.6,     // +60% knowledge production
        socialCapital: 1.1
      },
      combatModifier: 0.85,
      tradeModifier: 1.1,
      researchModifier: 1.6,  // +60% research speed
      buildingModifier: 1.1,
      diplomacyModifier: 1.2,
      specialAbility: {
        name: 'Enlightenment',
        description: 'Research speed doubled for 5 days',
        icon: '💡',
        cooldown: 20,
        lastUsed: -100,
        effect: (tribe, agents, gameState) => {
          console.log('Enlightenment activated for Gamma tribe!');
        }
      },
      tendencies: {
        aggression: 35,      // Low aggression
        cooperation: 70,     // Cooperative
        exploration: 85,     // Very high exploration (seek knowledge)
        innovation: 90,      // Very high innovation
        trade: 60            // Above average trade
      },
      weaknesses: {
        military: 'Weaker military',
        production: 'Lower basic resource output',
        earlyGame: 'Slow start, strong late game'
      }
    });
  }

  getTribeConfig(tribeId: string): TribeConfig | undefined {
    return this.tribes.get(tribeId);
  }

  getAllTribes(): TribeConfig[] {
    return Array.from(this.tribes.values());
  }

  // Get skill modifier for an agent based on tribe
  getSkillModifier(tribeId: string, skill: string): number {
    const config = this.tribes.get(tribeId);
    if (!config) return 1.0;
    return config.skillAffinity[skill] || 1.0;
  }

  // Get resource production modifier for a tribe
  getResourceModifier(tribeId: string, resource: 'food' | 'energy' | 'materials' | 'knowledge' | 'socialCapital'): number {
    const config = this.tribes.get(tribeId);
    if (!config) return 1.0;
    return config.resourceModifiers[resource] || 1.0;
  }

  // Get combat modifier for tribe
  getCombatModifier(tribeId: string): number {
    const config = this.tribes.get(tribeId);
    return config ? config.combatModifier : 1.0;
  }

  // Get trade modifier for tribe
  getTradeModifier(tribeId: string): number {
    const config = this.tribes.get(tribeId);
    return config ? config.tradeModifier : 1.0;
  }

  // Get research modifier for tribe
  getResearchModifier(tribeId: string): number {
    const config = this.tribes.get(tribeId);
    return config ? config.researchModifier : 1.0;
  }

  // Check if tribe can use special ability
  canUseSpecialAbility(tribeId: string, currentDay: number): boolean {
    const config = this.tribes.get(tribeId);
    if (!config) return false;
    return (currentDay - config.specialAbility.lastUsed) >= config.specialAbility.cooldown;
  }

  // Use special ability
  useSpecialAbility(tribeId: string, currentDay: number, agents: any[], gameState: any): boolean {
    const config = this.tribes.get(tribeId);
    if (!config) return false;

    if (!this.canUseSpecialAbility(tribeId, currentDay)) {
      return false;
    }

    config.specialAbility.lastUsed = currentDay;
    config.specialAbility.effect(tribeId, agents, gameState);
    return true;
  }

  // Get tribe tendency value
  getTendency(tribeId: string, tendency: keyof TribeConfig['tendencies']): number {
    const config = this.tribes.get(tribeId);
    if (!config) return 50; // Default to middle
    return config.tendencies[tendency] || 50;
  }

  // Determine tribe behavior based on tendencies
  shouldInitiateConflict(tribeId: string): boolean {
    const aggression = this.getTendency(tribeId, 'aggression');
    return Math.random() * 100 < aggression;
  }

  shouldFormAlliance(tribeId: string): boolean {
    const cooperation = this.getTendency(tribeId, 'cooperation');
    return Math.random() * 100 < cooperation;
  }

  shouldExplore(tribeId: string): boolean {
    const exploration = this.getTendency(tribeId, 'exploration');
    return Math.random() * 100 < exploration;
  }

  shouldResearch(tribeId: string): boolean {
    const innovation = this.getTendency(tribeId, 'innovation');
    return Math.random() * 100 < innovation;
  }

  shouldTrade(tribeId: string): boolean {
    const trade = this.getTendency(tribeId, 'trade');
    return Math.random() * 100 < trade;
  }

  public serialize(): any {
    return {
      tribes: Array.from(this.tribes.entries())
    };
  }

  public deserialize(data: any): void {
    if (data.tribes) {
      this.tribes = new Map(data.tribes);
    }
  }
}
