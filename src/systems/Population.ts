// Population/Demographics System for ClawCiv
// Tracks age groups, birth rates, death rates, and population dynamics

export type AgeGroup = 'child' | 'adult' | 'elder' | 'ancient';
export type LifeStage = 'infant' | 'child' | 'teenager' | 'young_adult' | 'adult' | 'middle_aged' | 'elder' | 'ancient';

export interface AgentDemographics {
  agentId: string;
  age: number; // In days
  ageGroup: AgeGroup;
  lifeStage: LifeStage;
  birthDay: number;
  parents: { father?: string; mother?: string };
  children: string[];
  spouse?: string;
  fertility: number; // 0-100
  health: number; // 0-100
  lifespan: number; // Expected lifespan in days
}

export interface PopulationStatistics {
  tribe: string;
  totalPopulation: number;
  ageGroups: {
    children: number; // 0-15
    adults: number; // 16-60
    elders: number; // 61-80
    ancient: number; // 81+
  };
  birthRate: number; // Births per 1000 population
  deathRate: number; // Deaths per 1000 population
  growthRate: number; // Population change percentage
  avgAge: number;
  avgHealth: number;
  avgFertility: number;
}

export interface PopulationEvent {
  id: string;
  type: 'birth' | 'death' | 'marriage' | 'coming_of_age' | 'retirement' | 'milestone';
  agentId: string;
  agentName: string;
  tribe: string;
  day: number;
  description: string;
  icon: string;
  impact?: string;
}

export interface PopulationTrend {
  tribe: string;
  day: number;
  population: number;
  births: number;
  deaths: number;
  avgAge: number;
}

export class PopulationSystem {
  private demographics: Map<string, AgentDemographics> = new Map();
  private events: PopulationEvent[] = [];
  private statistics: Map<string, PopulationStatistics> = new Map();
  private trends: PopulationTrend[] = [];
  private eventIdCounter = 0;
  private birthsToday: Map<string, number> = new Map();
  private deathsToday: Map<string, number> = new Map();

  // Base lifespan configuration
  private readonly BASE_LIFESPAN = 500; // days
  private readonly MATURITY_AGE = 60; // days until adulthood
  private readonly ELDER_AGE = 300; // days until elder status
  private readonly ANCIENT_AGE = 450; // days until ancient status

  constructor() {}

  // Register a new agent (born or created)
  registerAgent(
    agentId: string,
    tribe: string,
    day: number,
    parents?: { father?: string; mother?: string }
  ): AgentDemographics {
    const demographics: AgentDemographics = {
      agentId,
      age: 0,
      ageGroup: 'child',
      lifeStage: 'infant',
      birthDay: day,
      parents: parents || {},
      children: [],
      fertility: 0,
      health: 100,
      lifespan: this.calculateLifespan()
    };

    this.demographics.set(agentId, demographics);

    // Track birth
    if (!this.birthsToday.has(tribe)) {
      this.birthsToday.set(tribe, 0);
    }
    this.birthsToday.set(tribe, this.birthsToday.get(tribe)! + 1);

    // Record birth event
    this.recordEvent({
      id: `event-${this.eventIdCounter++}-${Date.now()}`,
      type: 'birth',
      agentId,
      agentName: 'New Agent',
      tribe,
      day,
      description: `A new ${parents ? 'child' : 'agent'} has been born!`,
      icon: '👶',
      impact: 'Population increased'
    });

    return demographics;
  }

  private calculateLifespan(): number {
    // Lifespan varies between 400-600 days (random factor)
    const base = this.BASE_LIFESPAN;
    const variation = Math.random() * 200 - 100; // -100 to +100
    return Math.floor(base + variation);
  }

  // Update agent age and check for age-based events
  updateAges(currentDay: number, agents: any[]): PopulationEvent[] {
    const newEvents: PopulationEvent[] = [];

    for (const [agentId, demo] of this.demographics) {
      const agent = agents.find(a => a.id === agentId);
      if (!agent || !agent.alive) {
        // Agent died, continue
        continue;
      }

      // Update age
      demo.age = currentDay - demo.birthDay;

      // Determine age group and life stage
      const oldAgeGroup = demo.ageGroup;
      const oldLifeStage = demo.lifeStage;

      demo.ageGroup = this.getAgeGroup(demo.age);
      demo.lifeStage = this.getLifeStage(demo.age);

      // Check for coming of age
      if (oldAgeGroup === 'child' && demo.ageGroup === 'adult') {
        const event: PopulationEvent = {
          id: `event-${this.eventIdCounter++}-${Date.now()}`,
          type: 'coming_of_age',
          agentId,
          agentName: agent.name,
          tribe: agent.tribe,
          day: currentDay,
          description: `${agent.name} has come of age and can now contribute fully to the tribe!`,
          icon: '🎉',
          impact: '+20% productivity'
        };
        this.events.push(event);
        newEvents.push(event);
      }

      // Check for elder status
      if (oldAgeGroup === 'adult' && demo.ageGroup === 'elder') {
        const event: PopulationEvent = {
          id: `event-${this.eventIdCounter++}-${Date.now()}`,
          type: 'retirement',
          agentId,
          agentName: agent.name,
          tribe: agent.tribe,
          day: currentDay,
          description: `${agent.name} has entered their elder years and gained wisdom!`,
          icon: '👴',
          impact: '+10% knowledge production, -10% physical ability'
        };
        this.events.push(event);
        newEvents.push(event);
      }

      // Update fertility based on age
      demo.fertility = this.calculateFertility(demo.age);

      // Check for milestone ages
      if (demo.age % 100 === 0 && demo.age > 0) {
        const event: PopulationEvent = {
          id: `event-${this.eventIdCounter++}-${Date.now()}`,
          type: 'milestone',
          agentId,
          agentName: agent.name,
          tribe: agent.tribe,
          day: currentDay,
          description: `${agent.name} has reached ${Math.floor(demo.age / 10)} decades of life!`,
          icon: '🎂',
          impact: `Agent is now ${Math.floor(demo.age)} days old`
        };
        this.events.push(event);
        newEvents.push(event);
      }

      // Check for natural death
      if (demo.age >= demo.lifespan) {
        // Natural death from old age
        this.deathsToday.set(agent.tribe, (this.deathsToday.get(agent.tribe) || 0) + 1);

        const event: PopulationEvent = {
          id: `event-${this.eventIdCounter++}-${Date.now()}`,
          type: 'death',
          agentId,
          agentName: agent.name,
          tribe: agent.tribe,
          day: currentDay,
          description: `${agent.name} has passed away peacefully at ${Math.floor(demo.age)} days old.`,
          icon: '💀',
          impact: 'Natural death'
        };
        this.events.push(event);
        newEvents.push(event);

        // Mark agent as dead
        agent.alive = false;
      }
    }

    return newEvents;
  }

  private getAgeGroup(age: number): AgeGroup {
    if (age < this.MATURITY_AGE) return 'child';
    if (age < this.ELDER_AGE) return 'adult';
    if (age < this.ANCIENT_AGE) return 'elder';
    return 'ancient';
  }

  private getLifeStage(age: number): LifeStage {
    if (age < 20) return 'infant';
    if (age < 40) return 'child';
    if (age < this.MATURITY_AGE) return 'teenager';
    if (age < 120) return 'young_adult';
    if (age < 240) return 'adult';
    if (age < this.ELDER_AGE) return 'middle_aged';
    if (age < this.ANCIENT_AGE) return 'elder';
    return 'ancient';
  }

  private calculateFertility(age: number): number {
    // Fertility curve: low in childhood, peak in young adulthood, declines with age
    if (age < this.MATURITY_AGE) return 0;
    if (age < 120) return 80; // Peak fertility
    if (age < 240) return 60;
    if (age < 360) return 30;
    if (age < 420) return 10;
    return 0; // Too old to reproduce
  }

  // Check for births (procreation)
  checkBirths(agents: any[], currentDay: number, tribeResources: Map<string, any>): PopulationEvent[] {
    const newEvents: PopulationEvent[] = [];
    const tribes = ['Alpha', 'Beta', 'Gamma'];

    for (const tribe of tribes) {
      // Get tribe resources
      const resources = tribeResources.get(tribe);
      if (!resources) continue;

      const tribeAgents = agents.filter(a => a.tribe === tribe && a.alive);
      const adults = tribeAgents.filter(a => {
        const demo = this.demographics.get(a.id);
        return demo && demo.ageGroup === 'adult' && demo.fertility > 30;
      });

      // Birth chance depends on food and population
      const food = resources.food || 0;
      const population = tribeAgents.length;
      const birthChance = (food / 1000) * (adults.length / population) * 0.02;

      if (Math.random() < birthChance && adults.length >= 2) {
        // Select parents
        const father = adults[Math.floor(Math.random() * adults.length)];
        const mother = adults[Math.floor(Math.random() * adults.length)];

        if (father.id !== mother.id) {
          // Create baby
          const babyId = `agent-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          const baby = this.registerAgent(babyId, tribe, currentDay, {
            father: father.id,
            mother: mother.id
          });

          // Add to parents' children lists
          const fatherDemo = this.demographics.get(father.id);
          const motherDemo = this.demographics.get(mother.id);
          if (fatherDemo) fatherDemo.children.push(babyId);
          if (motherDemo) motherDemo.children.push(babyId);

          // Record birth event
          const event: PopulationEvent = {
            id: `event-${this.eventIdCounter++}-${Date.now()}`,
            type: 'birth',
            agentId: babyId,
            agentName: 'Newborn',
            tribe,
            day: currentDay,
            description: `A child was born to ${father.name} and ${mother.name}!`,
            icon: '👶',
            impact: '+1 population'
          };
          this.events.push(event);
          newEvents.push(event);
        }
      }
    }

    return newEvents;
  }

  // Record a marriage between two agents
  recordMarriage(agent1Id: string, agent2Id: string, day: number, agents: any[]): boolean {
    const demo1 = this.demographics.get(agent1Id);
    const demo2 = this.demographics.get(agent2Id);

    if (!demo1 || !demo2) return false;
    if (demo1.spouse || demo2.spouse) return false; // Already married

    const agent1 = agents.find(a => a.id === agent1Id);
    const agent2 = agents.find(a => a.id === agent2Id);

    if (!agent1 || !agent2) return false;

    demo1.spouse = agent2Id;
    demo2.spouse = agent1Id;

    const event: PopulationEvent = {
      id: `event-${this.eventIdCounter++}-${Date.now()}`,
      type: 'marriage',
      agentId: agent1Id,
      agentName: agent1.name,
      tribe: agent1.tribe,
      day,
      description: `${agent1.name} and ${agent2.name} have joined in union!`,
      icon: '💒',
      impact: '+5 social capital for both'
    };

    this.events.push(event);
    return true;
  }

  // Get demographics for an agent
  getAgentDemographics(agentId: string): AgentDemographics | undefined {
    return this.demographics.get(agentId);
  }

  // Get all demographics
  getAllDemographics(): AgentDemographics[] {
    return Array.from(this.demographics.values());
  }

  // Get population statistics for a tribe
  getPopulationStatistics(tribe: string, agents: any[]): PopulationStatistics {
    const tribeAgents = agents.filter(a => a.tribe === tribe && a.alive);
    const demographics = tribeAgents
      .map(a => this.demographics.get(a.id))
      .filter(d => d !== undefined) as AgentDemographics[];

    const ageGroups = {
      children: 0,
      adults: 0,
      elders: 0,
      ancient: 0
    };

    let totalAge = 0;
    let totalHealth = 0;
    let totalFertility = 0;

    for (const demo of demographics) {
      ageGroups[demo.ageGroup]++;
      totalAge += demo.age;
      totalHealth += demo.health;
      totalFertility += demo.fertility;
    }

    const stats: PopulationStatistics = {
      tribe,
      totalPopulation: tribeAgents.length,
      ageGroups,
      birthRate: this.birthsToday.get(tribe) || 0,
      deathRate: this.deathsToday.get(tribe) || 0,
      growthRate: this.calculateGrowthRate(tribe, agents),
      avgAge: demographics.length > 0 ? totalAge / demographics.length : 0,
      avgHealth: demographics.length > 0 ? totalHealth / demographics.length : 0,
      avgFertility: demographics.length > 0 ? totalFertility / demographics.length : 0
    };

    this.statistics.set(tribe, stats);
    return stats;
  }

  private calculateGrowthRate(tribe: string, agents: any[]): number {
    const births = this.birthsToday.get(tribe) || 0;
    const deaths = this.deathsToday.get(tribe) || 0;
    const population = agents.filter(a => a.tribe === tribe && a.alive).length;

    if (population === 0) return 0;
    return ((births - deaths) / population) * 100;
  }

  // Get all statistics
  getAllStatistics(agents: any[]): Map<string, PopulationStatistics> {
    for (const tribe of ['Alpha', 'Beta', 'Gamma']) {
      this.getPopulationStatistics(tribe, agents);
    }
    return this.statistics;
  }

  // Get recent events
  getRecentEvents(count: number = 20): PopulationEvent[] {
    return this.events.slice(-count);
  }

  // Get events for a tribe
  getEventsByTribe(tribe: string): PopulationEvent[] {
    return this.events.filter(e => e.tribe === tribe);
  }

  // Record a population trend (for historical tracking)
  recordTrend(day: number, agents: any[]): void {
    for (const tribe of ['Alpha', 'Beta', 'Gamma']) {
      const tribeAgents = agents.filter(a => a.tribe === tribe && a.alive);
      const demographics = tribeAgents
        .map(a => this.demographics.get(a.id))
        .filter(d => d !== undefined) as AgentDemographics[];

      const avgAge = demographics.length > 0
        ? demographics.reduce((sum, d) => sum + d.age, 0) / demographics.length
        : 0;

      const trend: PopulationTrend = {
        tribe,
        day,
        population: tribeAgents.length,
        births: this.birthsToday.get(tribe) || 0,
        deaths: this.deathsToday.get(tribe) || 0,
        avgAge
      };

      this.trends.push(trend);
    }
  }

  // Get trends for a tribe
  getTrends(tribe: string, days: number = 30): PopulationTrend[] {
    return this.trends
      .filter(t => t.tribe === tribe)
      .slice(-days);
  }

  // Clean up old data
  cleanup(currentDay: number): void {
    // Remove events older than 100 days
    this.events = this.events.filter(e => currentDay - e.day < 100);

    // Remove trends older than 200 days
    this.trends = this.trends.filter(t => currentDay - t.day < 200);

    // Reset daily counters
    this.birthsToday.clear();
    this.deathsToday.clear();
  }

  // Check if agent is of age to perform certain actions
  canPerformAction(agentId: string, action: 'work' | 'marry' | 'lead' | 'fight'): boolean {
    const demo = this.demographics.get(agentId);
    if (!demo) return false;

    switch (action) {
      case 'work':
        return demo.ageGroup === 'adult' || demo.ageGroup === 'elder';
      case 'marry':
        return demo.ageGroup === 'adult' && demo.fertility > 30;
      case 'lead':
        return (demo.ageGroup === 'adult' || demo.ageGroup === 'elder') && demo.age > 120;
      case 'fight':
        return (demo.ageGroup === 'adult' || demo.lifeStage === 'teenager') && demo.age < this.ELDER_AGE;
      default:
        return false;
    }
  }

  // Get age bonus/malus for different actions
  getAgeModifier(agentId: string, action: string): number {
    const demo = this.demographics.get(agentId);
    if (!demo) return 1.0;

    switch (action) {
      case 'physical':
        if (demo.lifeStage === 'young_adult') return 1.2;
        if (demo.lifeStage === 'adult') return 1.0;
        if (demo.lifeStage === 'middle_aged') return 0.9;
        if (demo.lifeStage === 'elder') return 0.6;
        if (demo.lifeStage === 'ancient') return 0.3;
        return 0.5;

      case 'mental':
        if (demo.lifeStage === 'young_adult') return 0.9;
        if (demo.lifeStage === 'adult') return 1.0;
        if (demo.lifeStage === 'middle_aged') return 1.1;
        if (demo.lifeStage === 'elder') return 1.3;
        if (demo.lifeStage === 'ancient') return 1.5;
        return 0.3;

      case 'learning':
        if (demo.lifeStage === 'infant' || demo.lifeStage === 'child') return 1.5;
        if (demo.lifeStage === 'teenager') return 1.3;
        if (demo.lifeStage === 'young_adult') return 1.0;
        if (demo.lifeStage === 'adult') return 0.8;
        if (demo.lifeStage === 'middle_aged') return 0.6;
        return 0.3;

      default:
        return 1.0;
    }
  }

  public serialize(): any {
    return {
      demographics: Array.from(this.demographics.entries()),
      events: this.events,
      statistics: Array.from(this.statistics.entries()),
      trends: this.trends,
      eventIdCounter: this.eventIdCounter
    };
  }

  public deserialize(data: any): void {
    this.demographics = new Map(data.demographics || []);
    this.events = data.events || [];
    this.statistics = new Map(data.statistics || []);
    this.trends = data.trends || [];
    this.eventIdCounter = data.eventIdCounter || 0;
  }
}
