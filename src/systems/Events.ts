// Random Event System for ClawCiv
// Adds unpredictability and excitement to the simulation

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  type: 'disaster' | 'discovery' | 'blessing' | 'conflict';
  icon: string;
  weight: number; // Higher = more likely to occur
  effects: {
    tribe?: string; // Empty = affects all tribes equally
    food?: number;
    energy?: number;
    materials?: number;
    knowledge?: number;
    socialCapital?: number;
    agentDamage?: number; // Percentage of agents affected
  };
  duration?: number; // 0 = instant, >0 = ongoing effect
  canOccur: (gameState: any) => boolean;
}

export class EventSystem {
  private events: GameEvent[] = [];
  private activeEvents: Map<string, GameEvent & { remainingTicks: number }> = new Map();
  private lastEventDay = 0;
  private readonly EVENT_COOLDOWN = 10; // Minimum days between events

  constructor() {
    this.initializeEvents();
  }

  private initializeEvents(): void {
    // Disasters
    this.addEvent({
      id: 'drought',
      name: 'Great Drought',
      description: 'A terrible drought plagues the land. Food production is halved!',
      type: 'disaster',
      icon: '☀️',
      weight: 15,
      effects: { food: -50 },
      duration: 5,
      canOccur: (state) => state.day >= 20
    });

    this.addEvent({
      id: 'plague',
      name: 'Mysterious Plague',
      description: 'A plague spreads through the tribes, weakening many agents.',
      type: 'disaster',
      icon: '☠️',
      weight: 10,
      effects: { energy: -30, agentDamage: 15 },
      duration: 0,
      canOccur: (state) => state.day >= 30
    });

    this.addEvent({
      id: 'earthquake',
      name: 'Great Earthquake',
      description: 'An earthquake shakes the land! Buildings are damaged.',
      type: 'disaster',
      icon: '🌋',
      weight: 8,
      effects: { materials: -40 },
      duration: 0,
      canOccur: (state) => state.day >= 15
    });

    this.addEvent({
      id: 'storm',
      name: 'Great Storm',
      description: 'A massive storm batters all tribes. Energy reserves are depleted.',
      type: 'disaster',
      icon: '⛈️',
      weight: 12,
      effects: { energy: -20 },
      duration: 3,
      canOccur: (state) => state.day >= 10
    });

    // Discoveries
    this.addEvent({
      id: 'ancient_ruins',
      name: 'Ancient Ruins Discovered',
      description: 'Explorers find ancient ruins filled with knowledge!',
      type: 'discovery',
      icon: '🏛️',
      weight: 10,
      effects: { knowledge: 100 },
      duration: 0,
      canOccur: (state) => state.day >= 25
    });

    this.addEvent({
      id: 'fertile_land',
      name: 'Fertile Land Found',
      description: 'New farming land discovered! Food production increases.',
      type: 'discovery',
      icon: '🌾',
      weight: 12,
      effects: { food: 80 },
      duration: 0,
      canOccur: (state) => state.day >= 15
    });

    this.addEvent({
      id: 'rich_deposit',
      name: 'Rich Mineral Deposit',
      description: 'A massive mineral deposit is found!',
      type: 'discovery',
      icon: '💎',
      weight: 11,
      effects: { materials: 100 },
      duration: 0,
      canOccur: (state) => state.day >= 20
    });

    this.addEvent({
      id: 'alien_artifact',
      name: 'Alien Artifact',
      description: 'A mysterious artifact of unknown origin is discovered!',
      type: 'discovery',
      icon: '🔮',
      weight: 5,
      effects: { knowledge: 150, socialCapital: 50 },
      duration: 0,
      canOccur: (state) => state.day >= 40
    });

    // Blessings
    this.addEvent({
      id: 'bountiful_harvest',
      name: 'Bountiful Harvest',
      description: 'The harvest is exceptionally good this season!',
      type: 'blessing',
      icon: '🌻',
      weight: 15,
      effects: { food: 60 },
      duration: 0,
      canOccur: (state) => state.day >= 10
    });

    this.addEvent({
      id: 'enlightenment',
      name: 'Age of Enlightenment',
      description: 'A wave of creativity and discovery sweeps through the tribes!',
      type: 'blessing',
      icon: '💡',
      weight: 8,
      effects: { knowledge: 80, socialCapital: 30 },
      duration: 0,
      canOccur: (state) => state.day >= 35
    });

    this.addEvent({
      id: 'peace_treaty',
      name: 'Grand Peace Treaty',
      description: 'The tribes come together in a moment of unity.',
      type: 'blessing',
      icon: '☮️',
      weight: 7,
      effects: { socialCapital: 100 },
      duration: 0,
      canOccur: (state) => state.day >= 30
    });

    this.addEvent({
      id: 'merchant_caravan',
      name: 'Merchant Caravan Arrival',
      description: 'Foreign merchants bring exotic goods and wealth!',
      type: 'blessing',
      icon: '🎪',
      weight: 10,
      effects: { materials: 50, socialCapital: 40 },
      duration: 0,
      canOccur: (state) => state.day >= 20
    });

    // Conflicts
    this.addEvent({
      id: 'territory_dispute',
      name: 'Territory Dispute',
      description: 'Tensions rise as tribes dispute border lands!',
      type: 'conflict',
      icon: '⚔️',
      weight: 12,
      effects: { socialCapital: -30 },
      duration: 0,
      canOccur: (state) => state.day >= 25
    });

    this.addEvent({
      id: 'resource_shortage',
      name: 'Resource Shortage',
      description: 'Critical materials become scarce across all tribes.',
      type: 'conflict',
      icon: '📉',
      weight: 10,
      effects: { materials: -30, food: -20 },
      duration: 4,
      canOccur: (state) => state.day >= 20
    });

    this.addEvent({
      id: 'raid',
      name: 'Marauder Raid',
      description: 'Unknown raiders attack tribal settlements!',
      type: 'conflict',
      icon: '🗡️',
      weight: 8,
      effects: { food: -40, materials: -20 },
      duration: 0,
      canOccur: (state) => state.day >= 15
    });
  }

  private addEvent(event: GameEvent): void {
    this.events.push(event);
  }

  // Check if an event should occur this turn
  checkForEvent(gameState: any): GameEvent | null {
    const daysSinceLastEvent = gameState.day - this.lastEventDay;

    // Need to wait for cooldown
    if (daysSinceLastEvent < this.EVENT_COOLDOWN) {
      return null;
    }

    // 10% chance of event each eligible day
    if (Math.random() > 0.10) {
      return null;
    }

    // Filter events that can occur
    const availableEvents = this.events.filter(e => e.canOccur(gameState));

    if (availableEvents.length === 0) {
      return null;
    }

    // Weighted random selection
    const totalWeight = availableEvents.reduce((sum, e) => sum + e.weight, 0);
    let random = Math.random() * totalWeight;

    for (const event of availableEvents) {
      random -= event.weight;
      if (random <= 0) {
        this.lastEventDay = gameState.day;

        // Add to active events if it has a duration
        if (event.duration && event.duration > 0) {
          this.activeEvents.set(event.id, { ...event, remainingTicks: event.duration });
        }

        return event;
      }
    }

    return null;
  }

  // Apply event effects to agents
  applyEventEffects(event: GameEvent, agents: any[]): { affectedAgents: string[]; casualties: string[] } {
    const affectedAgents: string[] = [];
    const casualties: string[] = [];

    for (const agent of agents) {
      if (!agent.alive) continue;

      // Check if this event affects the agent's tribe
      if (event.effects.tribe && agent.tribe !== event.effects.tribe) continue;

      // Apply resource effects
      if (event.effects.food) agent.resources.food += event.effects.food;
      if (event.effects.energy) agent.resources.energy += event.effects.energy;
      if (event.effects.materials) agent.resources.materials += event.effects.materials;
      if (event.effects.knowledge) agent.resources.knowledge += event.effects.knowledge || 0;
      if (event.effects.socialCapital) agent.resources.socialCapital += event.effects.socialCapital;

      // Apply agent damage (casualties)
      if (event.effects.agentDamage && Math.random() * 100 < event.effects.agentDamage) {
        agent.resources.food = 0; // Kill by starvation
        casualties.push(agent.id);
      } else {
        affectedAgents.push(agent.id);
      }

      // Clamp resources
      agent.resources.food = Math.max(0, agent.resources.food);
      agent.resources.energy = Math.max(0, agent.resources.energy);
      agent.resources.materials = Math.max(0, agent.resources.materials);
    }

    return { affectedAgents, casualties };
  }

  // Update active events (called each tick)
  updateActiveEvents(): GameEvent[] {
    const expiredEvents: GameEvent[] = [];

    for (const [id, event] of this.activeEvents) {
      event.remainingTicks--;

      if (event.remainingTicks <= 0) {
        this.activeEvents.delete(id);
        expiredEvents.push(event);
      }
    }

    return expiredEvents;
  }

  getActiveEvents(): (GameEvent & { remainingTicks: number })[] {
    return Array.from(this.activeEvents.values());
  }

  getAllEvents(): GameEvent[] {
    return this.events;
  }

  getEventHistory(): GameEvent[] {
    // Could be expanded to track past events
    return [];
  }

  public serialize(): any {
    return {
      activeEvents: Array.from(this.activeEvents.entries()),
      lastEventDay: this.lastEventDay
    };
  }

  public deserialize(data: any): void {
    this.activeEvents = new Map(data.activeEvents || []);
    this.lastEventDay = data.lastEventDay || 0;
  }
}
