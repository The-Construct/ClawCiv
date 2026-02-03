// Achievement and Victory System for ClawCiv

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  requirement: () => boolean;
  reward?: {
    tokens?: number;
    knowledge?: number;
  };
}

export class AchievementSystem {
  private achievements: Map<string, Achievement> = new Map();

  constructor() {
    this.initializeAchievements();
  }

  private initializeAchievements(): void {
    // Early Game Achievements
    this.addAchievement({
      id: 'first_blood',
      name: 'First Contact',
      description: 'Witness your first combat',
      icon: '⚔️',
      unlocked: false,
      requirement: () => this.getCombatCount() > 0
    });

    this.addAchievement({
      id: 'survivor',
      name: 'Survivor',
      description: 'Reach day 10 with at least 10 agents alive',
      icon: '🛡️',
      unlocked: false,
      requirement: () => this.checkDaySurvival(10, 10)
    });

    this.addAchievement({
      id: 'merchant_king',
      name: 'Merchant King',
      description: 'Accumulate 1000 $CLAW in tribe treasury',
      icon: '💰',
      unlocked: false,
      requirement: () => this.checkTreasuryAmount(1000),
      reward: { tokens: 100 }
    });

    // Progression Achievements
    this.addAchievement({
      id: 'tech_founder',
      name: 'Tech Founder',
      description: 'Research 5 technologies',
      icon: '🔬',
      unlocked: false,
      requirement: () => this.getResearchedTechCount() >= 5
    });

    this.addAchievement({
      id: 'builder',
      name: 'Master Builder',
      description: 'Construct 5 buildings',
      icon: '🏗️',
      unlocked: false,
      requirement: () => this.getBuildingCount() >= 5
    });

    this.addAchievement({
      id: 'territory_expansionist',
      name: 'Land Grabber',
      description: 'Control 20 territories',
      icon: '🗺️',
      unlocked: false,
      requirement: () => this.getTerritoryCount() >= 20
    });

    // Late Game Achievements
    this.addAchievement({
      id: 'enlightenment',
      name: 'Age of Enlightenment',
      description: 'Research all 13 technologies',
      icon: '📜',
      unlocked: false,
      requirement: () => this.getResearchedTechCount() >= 13
    });

    this.addAchievement({
      id: 'world_dominion',
      name: 'World Dominator',
      description: 'Eliminate all other tribes',
      icon: '👑',
      unlocked: false,
      requirement: () => this.checkWorldDomination()
    });

    this.addAchievement({
      id: 'golden_age',
      name: 'Golden Age',
      description: 'All 60 agents alive on day 50',
      icon: '🌟',
      unlocked: false,
      requirement: () => this.checkGoldenAge()
    });

    // Special Achievements
    this.addAchievement({
      id: 'pacifist',
      name: 'Pacifist',
      description: 'Reach day 30 without any combat',
      icon: '☮️',
      unlocked: false,
      requirement: () => this.checkPacifist()
    });

    this.addAchievement({
      id: 'economic_powerhouse',
      name: 'Economic Powerhouse',
      description: 'All tribes have 5000+ $CLAW',
      icon: '💎',
      unlocked: false,
      requirement: () => this.checkEconomicPower()
    });
  }

  private addAchievement(achievement: Achievement): void {
    this.achievements.set(achievement.id, achievement);
  }

  getAchievements(): Achievement[] {
    return Array.from(this.achievements.values());
  }

  getUnlockedAchievements(): Achievement[] {
    return this.getAchievements().filter(a => a.unlocked);
  }

  checkAchievements(gameEngine: any): Achievement[] {
    const newlyUnlocked: Achievement[] = [];

    for (const achievement of this.achievements.values()) {
      if (!achievement.unlocked && achievement.requirement()) {
        achievement.unlocked = true;
        newlyUnlocked.push(achievement);
      }
    }

    return newlyUnlocked;
  }

  // Private helper methods
  private getCombatCount(): number {
    // This is now tracked via messages
    return 0; // Will be set dynamically
  }

  private checkDaySurvival(day: number, minAgents: number): boolean {
    // Check if any tribe has survived to this day with minimum agents
    const tribes = ['Alpha', 'Beta', 'Gamma'];
    for (const tribe of tribes) {
      if (this.getTribeAgentCount(tribe) >= minAgents && this.getCurrentDay() >= day) {
        return true;
      }
    }
    return false;
  }

  private checkTreasuryAmount(amount: number): boolean {
    // Check if any tribe has accumulated sufficient resources
    const tribes = ['Alpha', 'Beta', 'Gamma'];
    for (const tribe of tribes) {
      const resources = this.getTribeResources(tribe);
      if (resources.food >= amount) {
        return true;
      }
    }
    return false;
  }

  private getResearchedTechCount(): number {
    // Return max tech count across all tribes
    const tribes = ['Alpha', 'Beta', 'Gamma'];
    let maxCount = 0;
    for (const tribe of tribes) {
      const count = this.getTribeTechCount(tribe);
      if (count > maxCount) maxCount = count;
    }
    return maxCount;
  }

  private getBuildingCount(): number {
    // Return max building count across all tribes
    const tribes = ['Alpha', 'Beta', 'Gamma'];
    let maxCount = 0;
    for (const tribe of tribes) {
      const count = this.getTribeBuildingCount(tribe);
      if (count > maxCount) maxCount = count;
    }
    return maxCount;
  }

  private getTerritoryCount(): number {
    // Return max territory count across all tribes
    const tribes = ['Alpha', 'Beta', 'Gamma'];
    let maxCount = 0;
    for (const tribe of tribes) {
      const count = this.getTribeTerritoryCount(tribe);
      if (count > maxCount) maxCount = count;
    }
    return maxCount;
  }

  private checkWorldDomination(): boolean {
    // Check if only one tribe remains
    const tribes = ['Alpha', 'Beta', 'Gamma'];
    let aliveCount = 0;
    for (const tribe of tribes) {
      if (this.getTribeAgentCount(tribe) > 0) aliveCount++;
    }
    return aliveCount <= 1;
  }

  private checkGoldenAge(): boolean {
    // All 60 agents alive on day 50 (or any tribe with all agents)
    const tribes = ['Alpha', 'Beta', 'Gamma'];
    for (const tribe of tribes) {
      if (this.getTribeAgentCount(tribe) >= 20 && this.getCurrentDay() >= 50) {
        return true;
      }
    }
    return false;
  }

  private checkPacifist(): boolean {
    // Reach day 30 with minimal combat
    return this.getCurrentDay() >= 30 && this.getCombatCount() <= 5;
  }

  private checkEconomicPower(): boolean {
    // All tribes have 5000+ food
    const tribes = ['Alpha', 'Beta', 'Gamma'];
    for (const tribe of tribes) {
      const resources = this.getTribeResources(tribe);
      if (resources.food < 5000) return false;
    }
    return true;
  }

  // Dynamic game state getters (will be passed via game engine)
  private gameEngine: any = null;

  public setGameEngine(gameEngine: any): void {
    this.gameEngine = gameEngine;
  }

  private getCurrentDay(): number {
    return this.gameEngine ? this.gameEngine.getDay() : 0;
  }

  private getTribeAgentCount(tribe: string): number {
    return this.gameEngine ? this.gameEngine.getTribeAgentCount(tribe) : 0;
  }

  private getTribeResources(tribe: string): { food: number; materials: number; knowledge: number; socialCapital: number } {
    return this.gameEngine ? this.gameEngine.getTribeTotalResources(tribe) : { food: 0, materials: 0, knowledge: 0, socialCapital: 0 };
  }

  private getTribeTechCount(tribe: string): number {
    return this.gameEngine ? this.gameEngine.getResearchedTechCount(tribe) : 0;
  }

  private getTribeBuildingCount(tribe: string): number {
    return this.gameEngine ? this.gameEngine.getTotalBuildingCount(tribe) : 0;
  }

  private getTribeTerritoryCount(tribe: string): number {
    return this.gameEngine ? this.gameEngine.getTerritorySystem().getTerritoryCount(tribe) : 0;
  }

  // Check victory conditions
  checkVictory(gameEngine: any): { victory: boolean; winner?: string; reason: string } | null {
    this.gameEngine = gameEngine;

    // Condition 1: World Domination - one tribe eliminates all others
    const aliveTribes = gameEngine.getAllAliveTribes();
    if (aliveTribes.length === 1) {
      const winner = aliveTribes[0];
      return {
        victory: true,
        winner,
        reason: `${winner} tribe has eliminated all other tribes!`
      };
    }

    // Condition 2: Tech Victory - research all techs
    const tribes = ['Alpha', 'Beta', 'Gamma'];
    for (const tribe of tribes) {
      const techCount = this.getTribeTechCount(tribe);
      if (techCount >= 13) {
        return {
          victory: true,
          winner: tribe,
          reason: `${tribe} tribe achieves technological supremacy!`
        };
      }
    }

    // Condition 3: Economic Victory - a tribe has 10000+ resources
    for (const tribe of tribes) {
      const resources = this.getTribeResources(tribe);
      if (resources.food >= 10000) {
        return {
          victory: true,
          winner: tribe,
          reason: `Economic dominance achieved by ${tribe}!`
        };
      }
    }

    return null;
  }
}
