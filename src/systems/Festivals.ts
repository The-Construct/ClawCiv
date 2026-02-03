// Festival/Celebration System for ClawCiv
// Tribes can host festivals for temporary bonuses and social cohesion

export type FestivalType = 'harvest' | 'religious' | 'cultural' | 'military' | 'trade' | 'grand';
export type FestivalStatus = 'planning' | 'ongoing' | 'completed' | 'failed' | 'cancelled';

export interface FestivalBonus {
  type: 'resource_multiplier' | 'social_cohesion' | 'diplomacy_boost' | 'experience_boost' | 'happiness' | 'legacy';
  resource?: 'food' | 'energy' | 'materials' | 'knowledge' | 'socialCapital';
  value: number;
  duration: number; // Days the bonus lasts
  description: string;
}

export interface FestivalEvent {
  type: 'discovery' | 'romance' | 'conflict' | 'trade_deal' | 'alliance_proposal' | 'achievement';
  description: string;
  participants: string[]; // Agent IDs
  effects: any;
}

export interface Festival {
  id: string;
  name: string;
  type: FestivalType;
  hostTribe: string;
  coHostTribes: string[]; // For grand festivals
  status: FestivalStatus;
  icon: string;
  description: string;
  dayPlanned: number;
  dayStarted: number;
  dayEnded: number;
  duration: number; // Days
  attendees: Map<string, number>; // Tribe -> count
  budget: {
    food: number;
    energy: number;
    materials: number;
    knowledge: number;
    socialCapital: number;
  };
  bonuses: FestivalBonus[];
  events: FestivalEvent[];
  success: number; // 0-100, calculated at end
  popularity: number; // 0-100, attendee satisfaction
  legacyBonus?: FestivalBonus; // Long-term bonus from successful festival
}

export class FestivalSystem {
  private festivals: Map<string, Festival> = new Map();
  private activeFestivalIds: Set<string> = new Set();
  private festivalIdCounter = 0;
  private cooldowns: Map<string, number> = new Map(); // Tribe -> last festival day

  constructor() {}

  // Plan a new festival
  planFestival(
    tribe: string,
    type: FestivalType,
    plannedDay: number,
    coHostTribes: string[] = []
  ): Festival | null {
    // Check cooldown (can't have festivals too frequently)
    const lastFestivalDay = this.cooldowns.get(tribe) || 0;
    const daysSinceLastFestival = plannedDay - lastFestivalDay;
    if (daysSinceLastFestival < 30) {
      return null; // Need at least 30 days between festivals
    }

    // Check if tribe has enough resources to budget
    const budget = this.getFestivalBudget(type);
    if (!this.canAffordFestival(tribe, budget)) {
      return null;
    }

    const festival = this.createFestival(tribe, type, plannedDay, coHostTribes);
    this.festivals.set(festival.id, festival);
    return festival;
  }

  private createFestival(
    tribe: string,
    type: FestivalType,
    plannedDay: number,
    coHostTribes: string[]
  ): Festival {
    const config = this.getFestivalConfig(type);
    const duration = this.getFestivalDuration(type, coHostTribes.length > 0);

    const festival: Festival = {
      id: `festival-${this.festivalIdCounter++}-${Date.now()}`,
      name: this.generateFestivalName(type, tribe),
      type,
      hostTribe: tribe,
      coHostTribes,
      status: 'planning',
      icon: config.icon,
      description: config.description,
      dayPlanned: plannedDay,
      dayStarted: 0,
      dayEnded: 0,
      duration,
      attendees: new Map(),
      budget: this.getFestivalBudget(type),
      bonuses: config.bonuses,
      events: [],
      success: 0,
      popularity: 0
    };

    return festival;
  }

  private getFestivalConfig(type: FestivalType): {
    icon: string;
    description: string;
    bonuses: FestivalBonus[];
  } {
    const configs = {
      harvest: {
        icon: '🌾',
        description: 'Celebrate the bounty of the harvest',
        bonuses: [
          { type: 'resource_multiplier', resource: 'food', value: 1.5, duration: 7, description: '+50% food production for 7 days' },
          { type: 'happiness', value: 20, duration: 5, description: '+20 happiness for 5 days' }
        ]
      },
      religious: {
        icon: '⛪',
        description: 'Honoring the gods and spiritual traditions',
        bonuses: [
          { type: 'social_cohesion', value: 1.3, duration: 10, description: '+30% social cohesion for 10 days' },
          { type: 'diplomacy_boost', value: 15, duration: 5, description: '+15 diplomatic relations for 5 days' }
        ]
      },
      cultural: {
        icon: '🎭',
        description: 'Showcasing art, music, and traditions',
        bonuses: [
          { type: 'experience_boost', value: 2.0, duration: 5, description: '+100% experience gain for 5 days' },
          { type: 'social_cohesion', value: 1.2, duration: 7, description: '+20% social cohesion for 7 days' }
        ]
      },
      military: {
        icon: '⚔️',
        description: 'Honoring warriors and military prowess',
        bonuses: [
          { type: 'resource_multiplier', resource: 'energy', value: 1.3, duration: 5, description: '+30% energy production for 5 days' },
          { type: 'social_cohesion', value: 1.15, duration: 5, description: '+15% social cohesion for 5 days' }
        ]
      },
      trade: {
        icon: '💰',
        description: 'Celebrating commerce and prosperity',
        bonuses: [
          { type: 'resource_multiplier', resource: 'materials', value: 1.4, duration: 7, description: '+40% materials production for 7 days' },
          { type: 'diplomacy_boost', value: 20, duration: 7, description: '+20 diplomatic relations for 7 days' }
        ]
      },
      grand: {
        icon: '🎪',
        description: 'A magnificent celebration hosted by multiple tribes',
        bonuses: [
          { type: 'resource_multiplier', resource: 'food', value: 1.3, duration: 10, description: '+30% food production for 10 days' },
          { type: 'resource_multiplier', resource: 'energy', value: 1.3, duration: 10, description: '+30% energy production for 10 days' },
          { type: 'social_cohesion', value: 1.5, duration: 14, description: '+50% social cohesion for 14 days' },
          { type: 'diplomacy_boost', value: 30, duration: 14, description: '+30 diplomatic relations for 14 days' }
        ]
      }
    };

    return configs[type];
  }

  private getFestivalDuration(type: FestivalType, isGrand: boolean): number {
    if (isGrand) return 14;

    const durations = {
      harvest: 5,
      religious: 7,
      cultural: 5,
      military: 4,
      trade: 6,
      grand: 14
    };

    return durations[type];
  }

  private getFestivalBudget(type: FestivalType): Festival['budget'] {
    const budgets = {
      harvest: { food: 200, energy: 100, materials: 50, knowledge: 20, socialCapital: 100 },
      religious: { food: 150, energy: 150, materials: 100, knowledge: 50, socialCapital: 200 },
      cultural: { food: 180, energy: 120, materials: 80, knowledge: 100, socialCapital: 150 },
      military: { food: 200, energy: 200, materials: 150, knowledge: 30, socialCapital: 100 },
      trade: { food: 250, energy: 150, materials: 100, knowledge: 50, socialCapital: 200 },
      grand: { food: 500, energy: 400, materials: 300, knowledge: 200, socialCapital: 500 }
    };

    return budgets[type];
  }

  private canAffordFestival(tribe: string, budget: Festival['budget']): boolean {
    // This would check actual tribe resources
    // For now, assume they can afford it
    return true;
  }

  private generateFestivalName(type: FestivalType, tribe: string): string {
    const adjectives = {
      harvest: ['Bountiful', 'Golden', 'Abundant', 'Joyous', 'Prosperous'],
      religious: ['Sacred', 'Divine', 'Blessed', 'Holy', 'Reverent'],
      cultural: ['Grand', 'Magnificent', 'Spectacular', 'Vibrant', 'Splendid'],
      military: ['Glorious', 'Triumphant', 'Honorable', 'Valiant', 'Victorious'],
      trade: ['Prosperous', 'Flourishing', 'Thriving', 'Bustling', 'Lucrative'],
      grand: ['Legendary', 'Monumental', 'Epic', 'Extraordinary', 'Unforgettable']
    };

    const nouns = {
      harvest: ['Harvest Festival', 'Feast of Plenty', 'Gathering Days'],
      religious: ['Sacred Rites', 'Divine Celebration', 'Blessing Ceremony'],
      cultural: ['Cultural Showcase', 'Arts Festival', 'Heritage Celebration'],
      military: ['Warrior Games', 'Victory Parade', 'Honor Days'],
      trade: ['Merchant Fair', 'Trade Festival', 'Commerce Days'],
      grand: ['Grand Festival', 'Unity Celebration', 'Great Gathering']
    };

    const adj = adjectives[type][Math.floor(Math.random() * adjectives[type].length)];
    const noun = nouns[type][Math.floor(Math.random() * nouns[type].length)];

    return `${tribe} ${adj} ${noun}`;
  }

  // Start a planned festival
  startFestival(festivalId: string, currentDay: number): boolean {
    const festival = this.festivals.get(festivalId);
    if (!festival || festival.status !== 'planning') return false;
    if (currentDay < festival.dayPlanned) return false;

    festival.status = 'ongoing';
    festival.dayStarted = currentDay;
    festival.dayEnded = currentDay + festival.duration;
    this.activeFestivalIds.add(festivalId);

    // Set cooldown
    this.cooldowns.set(festival.hostTribe, currentDay);

    return true;
  }

  // Add attendees to a festival
  addAttendees(festivalId: string, tribe: string, count: number): void {
    const festival = this.festivals.get(festivalId);
    if (!festival || festival.status !== 'ongoing') return;

    const current = festival.attendees.get(tribe) || 0;
    festival.attendees.set(tribe, current + count);
  }

  // Generate random events during festival
  generateFestivalEvent(festivalId: string): FestivalEvent | null {
    const festival = this.festivals.get(festivalId);
    if (!festival || festival.status !== 'ongoing') return null;

    // 20% chance of an event per day
    if (Math.random() > 0.2) return null;

    const eventTypes = [
      { type: 'discovery', weight: 15 },
      { type: 'romance', weight: 10 },
      { type: 'conflict', weight: 10 },
      { type: 'trade_deal', weight: 25 },
      { type: 'alliance_proposal', weight: 15 },
      { type: 'achievement', weight: 25 }
    ];

    // Weighted random selection
    const totalWeight = eventTypes.reduce((sum, e) => sum + e.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedType = eventTypes[0].type;

    for (const event of eventTypes) {
      random -= event.weight;
      if (random <= 0) {
        selectedType = event.type;
        break;
      }
    }

    const event: FestivalEvent = {
      type: selectedType as FestivalEvent['type'],
      description: this.generateEventDescription(selectedType, festival),
      participants: [],
      effects: {}
    };

    festival.events.push(event);
    return event;
  }

  private generateEventDescription(type: string, festival: Festival): string {
    const descriptions = {
      discovery: [
        'A hidden cache of ancient artifacts was discovered!',
        'Scholars made a breakthrough during the festival!',
        'Explorers returned with news of new lands!'
      ],
      romance: [
        'Two agents from different tribes found love!',
        'A wedding was celebrated during the festivities!',
        'New alliances were formed through marriage!'
      ],
      conflict: [
        'A drunken argument escalated into a brawl!',
        'Traditional rivals clashed during the celebrations!',
        'Tensions flared over cultural differences!'
      ],
      trade_deal: [
        'Merchants signed a lucrative trade agreement!',
        'A rare exchange of treasures took place!',
        'New trade routes were established!'
      ],
      alliance_proposal: [
        'One tribe proposed an alliance to another!',
        'Diplomats made significant progress toward unity!',
        'A pact of mutual defense was discussed!'
      ],
      achievement: [
        'A master artisan unveiled their masterpiece!',
        'A record was broken during the games!',
        'A legendary performance captivated the crowd!'
      ]
    };

    const options = descriptions[type] || descriptions.achievement;
    return options[Math.floor(Math.random() * options.length)];
  }

  // End a festival and calculate results
  endFestival(festivalId: string, currentDay: number): Festival | null {
    const festival = this.festivals.get(festivalId);
    if (!festival || festival.status !== 'ongoing') return null;
    if (currentDay < festival.dayEnded) return null;

    festival.status = 'completed';

    // Calculate success based on attendance
    const totalAttendees = Array.from(festival.attendees.values()).reduce((sum, count) => sum + count, 0);
    const expectedAttendees = 20 * (1 + festival.coHostTribes.length); // Expected at least 20 per tribe

    let success = Math.min(100, (totalAttendees / expectedAttendees) * 100);

    // Adjust based on events (positive events increase, conflicts decrease)
    for (const event of festival.events) {
      if (event.type === 'conflict') {
        success -= 10;
      } else if (event.type === 'achievement' || event.type === 'discovery') {
        success += 5;
      }
    }

    festival.success = Math.max(0, Math.min(100, success));

    // Calculate popularity
    festival.popularity = Math.min(100, festival.success + Math.random() * 20 - 10);

    // Generate legacy bonus for very successful festivals
    if (festival.success >= 90) {
      festival.legacyBonus = {
        type: 'legacy',
        value: festival.success,
        duration: 30, // 30 days of legacy effect
        description: `Legendary ${festival.type} festival legacy`
      };
    }

    this.activeFestivalIds.delete(festivalId);

    return festival;
  }

  // Cancel a planned festival
  cancelFestival(festivalId: string): boolean {
    const festival = this.festivals.get(festivalId);
    if (!festival || festival.status !== 'planning') return false;

    festival.status = 'cancelled';
    return true;
  }

  // Fail a festival (due to disaster or lack of resources)
  failFestival(festivalId: string, reason: string): boolean {
    const festival = this.festivals.get(festivalId);
    if (!festival) return false;

    festival.status = 'failed';
    festival.events.push({
      type: 'conflict',
      description: `Festival failed: ${reason}`,
      participants: [],
      effects: {}
    });

    if (this.activeFestivalIds.has(festivalId)) {
      this.activeFestivalIds.delete(festivalId);
    }

    return true;
  }

  // Get active bonuses for a tribe
  getActiveBonuses(tribe: string, currentDay: number): FestivalBonus[] {
    const bonuses: FestivalBonus[] = [];

    for (const festival of this.festivals.values()) {
      if (festival.status !== 'completed') continue;
      if (festival.hostTribe !== tribe && !festival.coHostTribes.includes(tribe)) continue;

      const daysSinceEnd = currentDay - festival.dayEnded;

      // Check regular bonuses
      for (const bonus of festival.bonuses) {
        if (daysSinceEnd < bonus.duration) {
          bonuses.push(bonus);
        }
      }

      // Check legacy bonus
      if (festival.legacyBonus && daysSinceEnd < festival.legacyBonus.duration) {
        bonuses.push(festival.legacyBonus);
      }
    }

    return bonuses;
  }

  // Check if tribe has an active festival
  hasActiveFestival(tribe: string): boolean {
    for (const festivalId of this.activeFestivalIds) {
      const festival = this.festivals.get(festivalId);
      if (festival && (festival.hostTribe === tribe || festival.coHostTribes.includes(tribe))) {
        return true;
      }
    }
    return false;
  }

  // Get all festivals
  getAllFestivals(): Festival[] {
    return Array.from(this.festivals.values());
  }

  // Get festivals by tribe
  getFestivalsByTribe(tribe: string): Festival[] {
    return Array.from(this.festivals.values()).filter(
      f => f.hostTribe === tribe || f.coHostTribes.includes(tribe)
    );
  }

  // Get active festivals
  getActiveFestivals(): Festival[] {
    return Array.from(this.activeFestivalIds).map(id => this.festivals.get(id)!);
  }

  // Get festival by ID
  getFestival(festivalId: string): Festival | undefined {
    return this.festivals.get(festivalId);
  }

  // Update festivals (call each day)
  updateFestivals(currentDay: number): {
    completed: Festival[];
    events: FestivalEvent[];
    messages: string[];
  } {
    const completed: Festival[] = [];
    const events: FestivalEvent[] = [];
    const messages: string[] = [];

    for (const festival of this.festivals.values()) {
      if (festival.status === 'planning' && currentDay >= festival.dayPlanned) {
        this.startFestival(festival.id, currentDay);
        messages.push(`🎪 ${festival.name} has begun in ${festival.hostTribe}!`);
      }

      if (festival.status === 'ongoing') {
        // Generate random events
        const event = this.generateFestivalEvent(festival.id);
        if (event) {
          events.push(event);
          messages.push(`✨ ${event.description}`);
        }

        // Check if festival should end
        if (currentDay >= festival.dayEnded) {
          const result = this.endFestival(festival.id, currentDay);
          if (result) {
            completed.push(result);
            messages.push(`🎉 ${festival.name} has concluded! Success: ${Math.round(result.success)}%`);
          }
        }
      }
    }

    return { completed, events, messages };
  }

  // Calculate relationship bonus from festivals between tribes
  getRelationshipBonus(tribe1: string, tribe2: string): number {
    let bonus = 0;

    for (const festival of this.festivals.values()) {
      if (festival.status !== 'completed') continue;

      const tribe1Involved = festival.hostTribe === tribe1 || festival.coHostTribes.includes(tribe1);
      const tribe2Involved = festival.hostTribe === tribe2 || festival.coHostTribes.includes(tribe2);

      if (tribe1Involved && tribe2Involved) {
        bonus += festival.success * 0.1; // Each successful festival adds bonus
      }
    }

    return Math.min(30, bonus); // Cap at +30 relationship bonus
  }

  // Clean up old festivals (older than 100 days)
  cleanupOldFestivals(currentDay: number): void {
    const toRemove: string[] = [];

    for (const [id, festival] of this.festivals) {
      const daysSinceEnd = currentDay - festival.dayEnded;
      if (festival.status === 'completed' && daysSinceEnd > 100) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.festivals.delete(id);
    }
  }

  public serialize(): any {
    return {
      festivals: Array.from(this.festivals.entries()),
      activeFestivalIds: Array.from(this.activeFestivalIds),
      festivalIdCounter: this.festivalIdCounter,
      cooldowns: Array.from(this.cooldowns.entries())
    };
  }

  public deserialize(data: any): void {
    this.festivals = new Map(data.festivals || []);
    this.activeFestivalIds = new Set(data.activeFestivalIds || []);
    this.festivalIdCounter = data.festivalIdCounter || 0;
    this.cooldowns = new Map(data.cooldowns || []);

    // Convert attendees arrays back to Maps
    for (const [id, festival] of this.festivals) {
      if (Array.isArray(festival.attendees)) {
        festival.attendees = new Map(festival.attendees);
      }
    }
  }
}
