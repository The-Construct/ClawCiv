// Religion/Culture System for ClawCiv
// Multiple faiths with unique beliefs, conversion, and conflicts

export type ReligionType = 'polytheistic' | 'monotheistic' | 'animistic' | 'philosophical' | 'mystical';
export type ReligionStatus = 'emerging' | 'established' | 'dominant' | 'state_religion' | 'persecuted' | 'extinct';

export interface ReligiousBelief {
  id: string;
  name: string;
  description: string;
  icon: string;
  effects: {
    socialCohesion: number;      // Multiplier for same-faith agents
    conversionResistance: number; // Resistance to other faiths
    missionaryPower: number;      // Strength of conversion efforts
    combatBonus: number;          // Bonus in holy wars
    productivity: number;         // Work ethic modifier
    researchSpeed: number;        // Knowledge/learning modifier
  };
}

export interface ReligiousBuilding {
  id: string;
  type: 'shrine' | 'temple' | 'church' | 'monastery' | 'cathedral' | 'holy_site';
  religion: string;
  tribe: string;
  location: { x: number; y: number };
  followers: number; // Capacity for worshippers
  influence: number;  // Conversion power in area
  constructionProgress: number; // 0-100
  bonuses: string[];
}

export interface ReligiousFigure {
  id: string;
  name: string;
  religion: string;
  tribe: string;
  role: 'prophet' | 'priest' | 'monk' | 'missionary' | 'heretic' | 'saint';
  influence: number; // 0-100
  followers: number; // Number of adherents
  power: number;     // Miraculous power level
  isAlive: boolean;
  martyr?: boolean;
}

export interface Miracle {
  id: string;
  name: string;
  description: string;
  religion: string;
  power: number;     // 1-100
  duration: number;  // Days
  effects: any;
}

export interface Religion {
  id: string;
  name: string;
  type: ReligionType;
  status: ReligionStatus;
  icon: string;
  description: string;
  foundingDay: number;
  founder: string; // Agent ID
  coreBeliefs: ReligiousBelief[];
  tenets: string[]; // Rules and guidelines
  tabooActions: string[]; // Forbidden actions

  // Population
  followers: Map<string, number>; // Tribe -> count
  totalFollowers: number;

  // Power and influence
  influence: number;    // 0-100, regional influence
  fervor: number;       // 0-100, zeal of followers
  orthodoxy: number;    // 0-100, adherence to doctrine

  // Structures
  buildings: ReligiousBuilding[];
  figures: ReligiousFigure[];

  // Conflicts
  enemies: string[];    // Other religions considered enemies
  heresies: string[];   // Split-off religions

  // History
  miracles: Miracle[];
  schisms: number;
  holyWars: number;
  conversions: number;
  martyrs: number;
}

export class ReligionSystem {
  private religions: Map<string, Religion> = new Map();
  private religionIdCounter = 0;

  constructor() {
    this.initializeDefaultReligions();
  }

  private initializeDefaultReligions(): void {
    // Ancient Pantheon (Polytheistic)
    this.createReligion({
      name: 'Ancient Pantheon',
      type: 'polytheistic',
      tribe: 'Alpha',
      founder: 'system',
      description: 'Worship of multiple gods governing natural forces'
    });

    // The One Truth (Monotheistic)
    this.createReligion({
      name: 'The One Truth',
      type: 'monotheistic',
      tribe: 'Beta',
      founder: 'system',
      description: 'Devotion to a single supreme deity'
    });

    // Spirit Way (Animistic)
    this.createReligion({
      name: 'Spirit Way',
      type: 'animistic',
      tribe: 'Gamma',
      founder: 'system',
      description: 'Belief that spirits inhabit all things'
    });
  }

  createReligion(params: {
    name: string;
    type: ReligionType;
    tribe: string;
    founder: string;
    description: string;
  }): Religion | null {
    const religion: Religion = {
      id: `religion-${this.religionIdCounter++}-${Date.now()}`,
      name: params.name,
      type: params.type,
      status: 'emerging',
      icon: this.getReligionIcon(params.type),
      description: params.description,
      foundingDay: Date.now(),
      founder: params.founder,
      coreBeliefs: this.generateBeliefs(params.type),
      tenets: this.generateTenets(params.type),
      tabooActions: this.generateTaboos(params.type),
      followers: new Map(),
      totalFollowers: 0,
      influence: 10,
      fervor: 80,
      orthodoxy: 70,
      buildings: [],
      figures: [],
      enemies: [],
      heresies: [],
      miracles: [],
      schisms: 0,
      holyWars: 0,
      conversions: 0,
      martyrs: 0
    };

    this.religions.set(religion.id, religion);
    return religion;
  }

  private getReligionIcon(type: ReligionType): string {
    const icons = {
      polytheistic: '⚡',
      monotheistic: '✝️',
      animistic: '🌿',
      philosophical: '☯️',
      mystical: '🔮'
    };
    return icons[type];
  }

  private generateBeliefs(type: ReligionType): ReligiousBelief[] {
    const beliefs: ReligiousBelief[] = [];

    switch (type) {
      case 'polytheistic':
        beliefs.push({
          id: 'many_gods',
          name: 'Many Gods',
          description: 'Multiple deities govern different aspects of life',
          icon: '⚡',
          effects: {
            socialCohesion: 1.2,
            conversionResistance: 0.9,
            missionaryPower: 0.8,
            combatBonus: 1.1,
            productivity: 1.1,
            researchSpeed: 1.0
          }
        });
        break;

      case 'monotheistic':
        beliefs.push({
          id: 'one_god',
          name: 'One God',
          description: 'Single supreme deity governs all creation',
          icon: '✝️',
          effects: {
            socialCohesion: 1.3,
            conversionResistance: 1.2,
            missionaryPower: 1.3,
            combatBonus: 1.2,
            productivity: 1.0,
            researchSpeed: 0.9
          }
        });
        break;

      case 'animistic':
        beliefs.push({
          id: 'spirits',
          name: 'Spirit World',
          description: 'Spirits inhabit all living things and places',
          icon: '🌿',
          effects: {
            socialCohesion: 1.1,
            conversionResistance: 0.8,
            missionaryPower: 0.9,
            combatBonus: 0.9,
            productivity: 1.2,
            researchSpeed: 1.2
          }
        });
        break;

      case 'philosophical':
        beliefs.push({
          id: 'enlightenment',
          name: 'Path of Wisdom',
          description: 'Personal enlightenment through understanding',
          icon: '☯️',
          effects: {
            socialCohesion: 1.0,
            conversionResistance: 1.1,
            missionaryPower: 0.7,
            combatBonus: 0.8,
            productivity: 1.0,
            researchSpeed: 1.4
          }
        });
        break;

      case 'mystical':
        beliefs.push({
          id: 'mysteries',
          name: 'Hidden Mysteries',
          description: 'Secret knowledge reveals divine truth',
          icon: '🔮',
          effects: {
            socialCohesion: 0.9,
            conversionResistance: 1.0,
            missionaryPower: 1.2,
            combatBonus: 1.0,
            productivity: 0.9,
            researchSpeed: 1.3
          }
        });
        break;
    }

    return beliefs;
  }

  private generateTenets(type: ReligionType): string[] {
    const tenets = {
      polytheistic: ['Honor the gods', 'Respect nature', 'Celebrate festivals', 'Offer sacrifices'],
      monotheistic: ['Worship only one god', 'Follow sacred texts', 'Proselytize', 'Reject false idols'],
      animistic: ['Respect all spirits', 'Live in harmony', 'Protect sacred places', 'Honor ancestors'],
      philosophical: ['Seek wisdom', 'Question assumptions', 'Practice meditation', 'Find balance'],
      mystical: ['Seek hidden knowledge', 'Decode signs', 'Perform rituals', 'Study mysteries']
    };

    return tenets[type];
  }

  private generateTaboos(type: ReligionType): string[] {
    const taboos = {
      polytheistic: ['Desecrating temples', 'Ignoring festivals', 'Offending any god'],
      monotheistic: ['Worshipping other gods', 'Blasphemy', 'Breaking sacred laws'],
      animistic: ['Harming sacred sites', 'Disrespecting spirits', 'Destroying nature'],
      philosophical: ['Dogmatism', 'Ignorance', 'Extremism'],
      mystical: ['Revealing secrets', 'Misusing rituals', 'Disrespecting mysteries']
    };

    return taboos[type];
  }

  // Convert an agent to a religion
  convertAgent(agentId: string, religionId: string, method: 'peaceful' | 'force' | 'miracle' = 'peaceful'): boolean {
    const religion = this.religions.get(religionId);
    if (!religion) return false;

    // Calculate conversion chance
    let baseChance = 0.3;
    if (method === 'force') baseChance = 0.5;
    if (method === 'miracle') baseChance = 0.8;

    // Modify by religion's missionary power
    const beliefPower = religion.coreBeliefs[0]?.effects.missionaryPower || 1.0;
    baseChance *= beliefPower;

    // Reduce by target's religion resistance
    // (Would need to check agent's current religion)

    if (Math.random() > baseChance) return false;

    // Add to followers
    religion.conversions++;

    return true;
  }

  // Build a religious structure
  buildReligiousBuilding(
    religionId: string,
    tribe: string,
    type: ReligiousBuilding['type'],
    location: { x: number; y: number }
  ): ReligiousBuilding | null {
    const religion = this.religions.get(religionId);
    if (!religion) return null;

    const buildingConfig = this.getBuildingConfig(type);

    const building: ReligiousBuilding = {
      id: `religious-building-${Date.now()}-${Math.random()}`,
      type,
      religion: religionId,
      tribe,
      location,
      followers: buildingConfig.capacity,
      influence: buildingConfig.influence,
      constructionProgress: 0,
      bonuses: buildingConfig.bonuses
    };

    religion.buildings.push(building);
    return building;
  }

  private getBuildingConfig(type: ReligiousBuilding['type']): {
    capacity: number;
    influence: number;
    bonuses: string[];
  } {
    const configs = {
      shrine: { capacity: 10, influence: 5, bonuses: ['+5% conversion nearby'] },
      temple: { capacity: 50, influence: 15, bonuses: ['+15% conversion nearby', '+10% social cohesion'] },
      church: { capacity: 100, influence: 20, bonuses: ['+20% conversion nearby', '+15% social cohesion'] },
      monastery: { capacity: 30, influence: 25, bonuses: ['+25% conversion nearby', '+20% research'] },
      cathedral: { capacity: 200, influence: 40, bonuses: ['+40% conversion nearby', '+30% social cohesion', '+20% fervor'] },
      'holy site': { capacity: 500, influence: 60, bonuses: ['+60% conversion nearby', '+50% social cohesion', 'Pilgrimage site'] }
    };

    return configs[type];
  }

  // Create a religious figure
  createReligiousFigure(
    religionId: string,
    tribe: string,
    name: string,
    role: ReligiousFigure['role']
  ): ReligiousFigure | null {
    const religion = this.religions.get(religionId);
    if (!religion) return null;

    const figure: ReligiousFigure = {
      id: `figure-${Date.now()}-${Math.random()}`,
      name,
      religion: religionId,
      tribe,
      role,
      influence: 50,
      followers: 10,
      power: Math.floor(Math.random() * 50) + 20,
      isAlive: true
    };

    religion.figures.push(figure);
    return figure;
  }

  // Perform a miracle
  performMiracle(religionId: string, figureId: string): Miracle | null {
    const religion = this.religions.get(religionId);
    if (!religion) return null;

    const figure = religion.figures.find(f => f.id === figureId && f.isAlive);
    if (!figure) return null;

    const miracle: Miracle = {
      id: `miracle-${Date.now()}-${Math.random()}`,
      name: this.generateMiracleName(),
      description: this.generateMiracleDescription(religion.type),
      religion: religionId,
      power: figure.power,
      duration: Math.floor(Math.random() * 10) + 5,
      effects: {}
    };

    religion.miracles.push(miracle);
    religion.fervor = Math.min(100, religion.fervor + 20);

    return miracle;
  }

  private generateMiracleName(): string {
    const names = [
      'Divine Healing', 'Holy Fire', 'Sacred Protection', 'Blessed Rain',
      'Prophetic Vision', 'Miraculous Provision', 'Spiritual Shield', 'Heavenly Light'
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  private generateMiracleDescription(type: ReligionType): string {
    const descriptions = {
      polytheistic: 'The gods have shown their favor!',
      monotheistic: 'Divine intervention has occurred!',
      animistic: 'The spirits have granted their power!',
      philosophical: 'A profound truth has been revealed!',
      mystical: 'Hidden mysteries have been unveiled!'
    };

    return descriptions[type];
  }

  // Declare holy war
  declareHolyWar(religionId: string, targetReligionId: string): boolean {
    const religion = this.religions.get(religionId);
    const target = this.religions.get(targetReligionId);

    if (!religion || !target) return false;
    if (religion.status === 'extinct' || target.status === 'extinct') return false;
    if (religion.enemies.includes(targetReligionId)) return false; // Already at war

    religion.enemies.push(targetReligionId);
    target.enemies.push(religionId);
    religion.holyWars++;
    target.holyWars++;

    religion.fervor = Math.min(100, religion.fervor + 30);
    religion.status = religion.status === 'emerging' ? 'established' : religion.status;

    return true;
  }

  // Create a schism (split off a heresy)
  createSchism(religionId: string, schismaticName: string, tribe: string): Religion | null {
    const parentReligion = this.religions.get(religionId);
    if (!religion || parentReligion?.status === 'extinct') return null;

    // Only schisms from religions with low orthodoxy or high fervor
    if (parentReligion.orthodoxy > 70 && parentReligion.fervor < 80) return null;

    const schism = this.createReligion({
      name: schismaticName,
      type: parentReligion.type,
      tribe,
      founder: 'schism',
      description: `A breakaway faction from ${parentReligion.name}`
    });

    if (schism) {
      parentReligion.heresies.push(schism.id);
      schism.heresies.push(parentReligion.id);
      parentReligion.schisms++;
      schism.schisms++;

      // Transfer some followers
      const transferAmount = Math.floor(parentReligion.totalFollowers * 0.2);
      schism.totalFollowers = transferAmount;
      parentReligion.totalFollowers -= transferAmount;

      // Auto-enemy status
      parentReligion.enemies.push(schism.id);
      schism.enemies.push(parentReligion.id);
    }

    return schism;
  }

  // Persecute a religion
  persecuteReligion(religionId: string, persecutorTribe: string): boolean {
    const religion = this.religions.get(religionId);
    if (!religion) return false;

    // Reduce followers
    const tribeFollowers = religion.followers.get(persecutorTribe) || 0;
    const lostFollowers = Math.floor(tribeFollowers * 0.5);
    religion.totalFollowers -= lostFollowers;
    religion.followers.set(persecutorTribe, tribeFollowers - lostFollowers);

    religion.martyrs += Math.floor(Math.random() * 5) + 1;
    religion.orthodoxy = Math.max(0, religion.orthodoxy - 10);

    // Check for extinction
    if (religion.totalFollowers <= 0) {
      religion.status = 'extinct';
    }

    return true;
  }

  // Get religion by ID
  getReligion(religionId: string): Religion | undefined {
    return this.religions.get(religionId);
  }

  // Get all religions
  getAllReligions(): Religion[] {
    return Array.from(this.religions.values());
  }

  // Get dominant religion for a tribe
  getDominantReligion(tribe: string): Religion | null {
    let dominant: Religion | null = null;
    let maxFollowers = 0;

    for (const religion of this.religions.values()) {
      const followers = religion.followers.get(tribe) || 0;
      if (followers > maxFollowers) {
        maxFollowers = followers;
        dominant = religion;
      }
    }

    return dominant;
  }

  // Get religions by type
  getReligionsByType(type: ReligionType): Religion[] {
    return Array.from(this.religions.values()).filter(r => r.type === type);
  }

  // Get active bonuses from religious buildings for a location
  getBuildingBonuses(location: { x: number; y: number }): {
    conversionBonus: number;
    socialCohesionBonus: number;
    fervorBonus: number;
  } {
    let conversionBonus = 0;
    let socialCohesionBonus = 0;
    let fervorBonus = 0;

    for (const religion of this.religions.values()) {
      for (const building of religion.buildings) {
        if (building.constructionProgress < 100) continue;

        // Calculate distance (simple grid distance)
        const distance = Math.abs(location.x - building.location.x) +
                        Math.abs(location.y - building.location.y);

        if (distance <= 3) {
          conversionBonus += building.influence / (distance + 1);
          socialCohesionBonus += building.influence * 0.1 / (distance + 1);
        }
      }
    }

    return {
      conversionBonus,
      socialCohesionBonus,
      fervorBonus
    };
  }

  // Update religion status based on followers
  updateReligionStatuses(): { changed: Religion[]; events: string[] } {
    const changed: Religion[] = [];
    const events: string[] = [];

    for (const religion of this.religions.values()) {
      const oldStatus = religion.status;

      // Update status based on followers
      if (religion.totalFollowers === 0) {
        religion.status = 'extinct';
      } else if (religion.totalFollowers > 100) {
        if (religion.totalFollowers > 200) {
          religion.status = 'state_religion';
        } else {
          religion.status = 'dominant';
        }
      } else if (religion.totalFollowers > 30) {
        religion.status = 'established';
      }

      if (oldStatus !== religion.status) {
        changed.push(religion);
        events.push(`📿 ${religion.name} is now ${religion.status}!`);
      }
    }

    return { changed, events };
  }

  // Get religious conflicts
  getConflicts(): { religion1: Religion; religion2: Religion; intensity: number }[] {
    const conflicts: { religion1: Religion; religion2: Religion; intensity: number }[] = [];

    for (const religion of this.religions.values()) {
      for (const enemyId of religion.enemies) {
        const enemy = this.religions.get(enemyId);
        if (enemy && religion.id < enemyId) { // Avoid duplicates
          const intensity = (religion.fervor + enemy.fervor) / 2;
          conflicts.push({ religion1: religion, religion2: enemy, intensity });
        }
      }
    }

    return conflicts;
  }

  public serialize(): any {
    return {
      religions: Array.from(this.religions.entries()),
      religionIdCounter: this.religionIdCounter
    };
  }

  public deserialize(data: any): void {
    this.religions = new Map(data.religions || []);
    this.religionIdCounter = data.religionIdCounter || 0;

    // Convert followers arrays back to Maps
    for (const [id, religion] of this.religions) {
      if (Array.isArray(religion.followers)) {
        religion.followers = new Map(religion.followers);
      }
    }
  }
}
