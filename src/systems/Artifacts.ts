// Artifact/Relic System for ClawCiv
// Powerful items that can be found, created, or stolen
// Provide tribe-wide bonuses and special abilities
// Sets grant synergy bonuses when collected together

export type ArtifactRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ArtifactType = 'weapon' | 'tool' | 'relic' | 'artifact' | 'wonder' | 'consumable';
export type ArtifactCategory = 'combat' | 'resource' | 'knowledge' | 'social' | 'defense' | 'utility';

export interface ArtifactBonus {
  type: 'resource_multiplier' | 'flat_bonus' | 'skill_boost' | 'special_ability' | 'defense_boost' | 'combat_boost' | 'research_boost';
  resource?: 'food' | 'energy' | 'materials' | 'knowledge' | 'socialCapital';
  skill?: string;
  value: number;
  description: string;
}

export interface Artifact {
  id: string;
  name: string;
  type: ArtifactType;
  category: ArtifactCategory;
  rarity: ArtifactRarity;
  icon: string;
  description: string;
  lore: string;
  tribe: string; // Current owner tribe
  bonuses: ArtifactBonus[];
  set?: string; // Set name for synergy bonuses
  requiredSkill?: string; // Skill required to use
  creatorAgentId?: string; // Agent who created it
  discoveredBy?: string; // Agent who discovered it
  dayCreated: number;
  dayFound: number;
  isActive: boolean;
  durability?: number; // For tools/weapons, 0-100
  charges?: number; // For consumables
  stolenCount: number; // Times stolen
  transferHistory: { from: string; to: string; day: number; method: string }[];
}

export interface ArtifactSet {
  id: string;
  name: string;
  description: string;
  artifacts: string[]; // Artifact IDs in set
  bonuses: {
    [count: number]: ArtifactBonus[]; // Bonus for having X artifacts from set
  };
  icon: string;
}

export class ArtifactSystem {
  private artifacts: Map<string, Artifact> = new Map();
  private artifactSets: Map<string, ArtifactSet> = new Map();
  private artifactIdCounter = 0;

  // Names and templates for procedural generation
  private readonly artifactPrefixes = [
    'Ancient', 'Cursed', 'Blessed', 'Lost', 'Forgotten', 'Divine', 'Demonic',
    'Eternal', 'Radiant', 'Shadow', 'Crystal', 'Golden', 'Iron', 'Steel',
    'Mystic', 'Arcane', 'Sacred', 'Profane', 'Timeless', 'Primordial'
  ];

  private readonly artifactNames = {
    weapon: ['Sword', 'Axe', 'Bow', 'Spear', 'Dagger', 'Hammer', 'Staff', 'Wand', 'Blade', 'Mace'],
    tool: ['Pickaxe', 'Hammer', 'Chisel', 'Saw', 'Plow', 'Loom', 'Kiln', 'Forge', 'Mill', 'Press'],
    relic: ['Amulet', 'Ring', 'Crown', 'Scepter', 'Orb', 'Crystal', 'Statue', 'Idol', 'Totem', 'Shrine'],
    artifact: ['Compass', 'Map', 'Lens', 'Cube', 'Sphere', 'Pyramid', 'Monolith', 'Obelisk', 'Runestone', 'Tablet'],
    wonder: ['Fountain', 'Tree', 'Flame', 'Horn', 'Chalice', 'Cauldron', 'Mirror', 'Lamp', 'Chest', 'Gateway'],
    consumable: ['Potion', 'Elixir', 'Scroll', 'Gem', 'Herb', 'Root', 'Bloom', 'Essence', 'Dust', 'Ash']
  };

  private readonly loreTemplates = [
    'Found in the ruins of an ancient civilization.',
    'Crafted by a master artisan of old.',
    'Gifted by the gods to a worthy hero.',
    'Cursed by a dark sorcerer long ago.',
    'Emerges from the depths of the earth.',
    'Passed down through generations of leaders.',
    'Discovered in a hidden tomb.',
    'Forged in the fires of a dying star.',
    'Born from the tears of a fallen god.',
    'Created through an alchemical accident.'
  ];

  constructor() {
    this.initializeArtifactSets();
  }

  private initializeArtifactSets(): void {
    // Ancient Warriors Set
    this.artifactSets.set('ancient_warriors', {
      id: 'ancient_warriors',
      name: 'Ancient Warriors',
      description: 'Relics of legendary warriors',
      artifacts: [],
      bonuses: {
        2: [
          { type: 'combat_boost', value: 1.1, description: '+10% combat power' }
        ],
        4: [
          { type: 'combat_boost', value: 1.25, description: '+25% combat power' },
          { type: 'defense_boost', value: 1.15, description: '+15% defense' }
        ],
        6: [
          { type: 'combat_boost', value: 1.5, description: '+50% combat power' },
          { type: 'defense_boost', value: 1.3, description: '+30% defense' },
          { type: 'special_ability', value: 0, description: 'Berserker Rage: Temporary combat boost' }
        ]
      },
      icon: '⚔️'
    });

    // Artificer's Collection Set
    this.artifactSets.set('artificers_collection', {
      id: 'artificers_collection',
      name: 'Artificer\'s Collection',
      description: 'Masterpieces of craft and innovation',
      artifacts: [],
      bonuses: {
        2: [
          { type: 'resource_multiplier', resource: 'materials', value: 1.15, description: '+15% materials' }
        ],
        4: [
          { type: 'resource_multiplier', resource: 'materials', value: 1.3, description: '+30% materials' },
          { type: 'skill_boost', skill: 'crafting', value: 1.2, description: '+20% crafting' }
        ],
        6: [
          { type: 'resource_multiplier', resource: 'materials', value: 1.5, description: '+50% materials' },
          { type: 'skill_boost', skill: 'crafting', value: 1.4, description: '+40% crafting' },
          { type: 'skill_boost', skill: 'building', value: 1.25, description: '+25% building' }
        ]
      },
      icon: '⚒️'
    });

    // Knowledge Keepers Set
    this.artifactSets.set('knowledge_keepers', {
      id: 'knowledge_keepers',
      name: 'Knowledge Keepers',
      description: 'Ancient tomes and sources of wisdom',
      artifacts: [],
      bonuses: {
        2: [
          { type: 'research_boost', value: 1.15, description: '+15% research' }
        ],
        4: [
          { type: 'research_boost', value: 1.3, description: '+30% research' },
          { type: 'resource_multiplier', resource: 'knowledge', value: 1.2, description: '+20% knowledge' }
        ],
        6: [
          { type: 'research_boost', value: 1.6, description: '+60% research' },
          { type: 'resource_multiplier', resource: 'knowledge', value: 1.4, description: '+40% knowledge' },
          { type: 'special_ability', value: 0, description: 'Enlightenment: Random tech discovery boost' }
        ]
      },
      icon: '📚'
    });

    // Divine Blessings Set
    this.artifactSets.set('divine_blessings', {
      id: 'divine_blessings',
      name: 'Divine Blessings',
      description: 'Sacred relics of the gods',
      artifacts: [],
      bonuses: {
        2: [
          { type: 'resource_multiplier', resource: 'socialCapital', value: 1.2, description: '+20% social capital' }
        ],
        4: [
          { type: 'resource_multiplier', resource: 'socialCapital', value: 1.4, description: '+40% social capital' },
          { type: 'defense_boost', value: 1.15, description: '+15% defense' }
        ],
        6: [
          { type: 'resource_multiplier', resource: 'socialCapital', value: 1.6, description: '+60% social capital' },
          { type: 'defense_boost', value: 1.3, description: '+30% defense' },
          { type: 'special_ability', value: 0, description: 'Divine Intervention: Rescue from defeat' }
        ]
      },
      icon: '✨'
    });
  }

  // Generate a random artifact
  generateArtifact(tribe: string, rarity?: ArtifactRarity, type?: ArtifactType): Artifact | null {
    const artifactRarity = rarity || this.rollRarity();
    const artifactType = type || this.getRandomType();

    const name = this.generateArtifactName(artifactType, artifactRarity);
    const bonuses = this.generateBonuses(artifactType, artifactRarity);
    const artifactSet = this.assignSet(artifactType, artifactRarity);

    const artifact: Artifact = {
      id: `artifact-${this.artifactIdCounter++}-${Date.now()}`,
      name,
      type: artifactType,
      category: this.getCategoryFromType(artifactType),
      rarity: artifactRarity,
      icon: this.getArtifactIcon(artifactType, artifactRarity),
      description: this.generateDescription(artifactType, artifactRarity),
      lore: this.loreTemplates[Math.floor(Math.random() * this.loreTemplates.length)],
      tribe,
      bonuses,
      set: artifactSet,
      dayCreated: Date.now(),
      dayFound: Date.now(),
      isActive: true,
      durability: artifactType === 'weapon' || artifactType === 'tool' ? 100 : undefined,
      charges: artifactType === 'consumable' ? Math.floor(Math.random() * 3) + 1 : undefined,
      stolenCount: 0,
      transferHistory: []
    };

    this.artifacts.set(artifact.id, artifact);
    return artifact;
  }

  private rollRarity(): ArtifactRarity {
    const roll = Math.random() * 100;
    if (roll < 50) return 'common';
    if (roll < 75) return 'uncommon';
    if (roll < 90) return 'rare';
    if (roll < 98) return 'epic';
    return 'legendary';
  }

  private getRandomType(): ArtifactType {
    const types: ArtifactType[] = ['weapon', 'tool', 'relic', 'artifact', 'wonder', 'consumable'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private generateArtifactName(type: ArtifactType, rarity: ArtifactRarity): string {
    const usePrefix = rarity !== 'common' && Math.random() > 0.5;
    const names = this.artifactNames[type];
    const baseName = names[Math.floor(Math.random() * names.length)];

    if (usePrefix) {
      const prefix = this.artifactPrefixes[Math.floor(Math.random() * this.artifactPrefixes.length)];
      return `${prefix} ${baseName}`;
    }
    return baseName;
  }

  private generateDescription(type: ArtifactType, rarity: ArtifactRarity): string {
    const rarityAdjectives = {
      common: ['A simple', 'An ordinary', 'A basic'],
      uncommon: ['A fine', 'A quality', 'A well-crafted'],
      rare: ['An exceptional', 'A remarkable', 'A superb'],
      epic: ['A legendary', 'An awe-inspiring', 'A magnificent'],
      legendary: ['A god-like', 'An omnipotent', 'An otherworldly']
    };

    const typeDescriptions = {
      weapon: 'weapon that strikes with great power',
      tool: 'tool that enhances productivity',
      relic: 'relic imbued with ancient magic',
      artifact: 'artifact of mysterious origin',
      wonder: 'wonder that defies explanation',
      consumable: 'consumable of great potency'
    };

    const adjective = rarityAdjectives[rarity][Math.floor(Math.random() * 3)];
    return `${adjective} ${typeDescriptions[type]}.`;
  }

  private generateBonuses(type: ArtifactType, rarity: ArtifactRarity): ArtifactBonus[] {
    const bonuses: ArtifactBonus[] = [];
    const rarityMultiplier = {
      common: 1,
      uncommon: 1.2,
      rare: 1.5,
      epic: 2,
      legendary: 3
    }[rarity];

    const bonusCount = rarity === 'common' ? 1 : rarity === 'uncommon' ? 2 : rarity === 'rare' ? 3 : 4;

    for (let i = 0; i < bonusCount; i++) {
      const bonusType = this.getBonusTypeForArtifact(type);
      bonuses.push(this.createBonus(bonusType, rarityMultiplier));
    }

    return bonuses;
  }

  private getBonusTypeForArtifact(type: ArtifactType): ArtifactBonus['type'] {
    const types = {
      weapon: ['combat_boost', 'defense_boost'],
      tool: ['resource_multiplier', 'skill_boost'],
      relic: ['special_ability', 'defense_boost'],
      artifact: ['special_ability', 'flat_bonus'],
      wonder: ['special_ability'],
      consumable: ['flat_bonus', 'resource_multiplier']
    };

    const possibleTypes = types[type];
    return possibleTypes[Math.floor(Math.random() * possibleTypes.length)] as ArtifactBonus['type'];
  }

  private createBonus(type: ArtifactBonus['type'], multiplier: number): ArtifactBonus {
    const resources = ['food', 'energy', 'materials', 'knowledge', 'socialCapital'] as const;
    const skills = ['farming', 'mining', 'research', 'trade', 'combat', 'building', 'diplomacy', 'crafting'];

    switch (type) {
      case 'resource_multiplier':
        return {
          type,
          resource: resources[Math.floor(Math.random() * resources.length)],
          value: 1 + (Math.random() * 0.1 + 0.05) * multiplier,
          description: 'Resource production bonus'
        };

      case 'flat_bonus':
        return {
          type,
          resource: resources[Math.floor(Math.random() * resources.length)],
          value: Math.floor((5 + Math.random() * 10) * multiplier),
          description: 'Flat resource bonus'
        };

      case 'skill_boost':
        return {
          type,
          skill: skills[Math.floor(Math.random() * skills.length)],
          value: 1 + (Math.random() * 0.15 + 0.05) * multiplier,
          description: 'Skill effectiveness bonus'
        };

      case 'combat_boost':
        return {
          type,
          value: 1 + (Math.random() * 0.1 + 0.05) * multiplier,
          description: 'Combat power bonus'
        };

      case 'defense_boost':
        return {
          type,
          value: 1 + (Math.random() * 0.1 + 0.05) * multiplier,
          description: 'Defense bonus'
        };

      case 'research_boost':
        return {
          type,
          value: 1 + (Math.random() * 0.1 + 0.05) * multiplier,
          description: 'Research speed bonus'
        };

      case 'special_ability':
        return {
          type,
          value: 0,
          description: 'Special ability'
        };

      default:
        return {
          type: 'flat_bonus',
          resource: 'food',
          value: 5,
          description: 'Bonus'
        };
    }
  }

  private assignSet(type: ArtifactType, rarity: ArtifactRarity): string | undefined {
    if (rarity === 'common') return undefined;

    const setTypeMap = {
      weapon: 'ancient_warriors',
      tool: 'artificers_collection',
      relic: 'divine_blessings',
      artifact: 'knowledge_keepers'
    };

    return setTypeMap[type];
  }

  private getCategoryFromType(type: ArtifactType): ArtifactCategory {
    const map = {
      weapon: 'combat',
      tool: 'resource',
      relic: 'social',
      artifact: 'knowledge',
      wonder: 'utility',
      consumable: 'utility'
    };
    return map[type] as ArtifactCategory;
  }

  private getArtifactIcon(type: ArtifactType, rarity: ArtifactRarity): string {
    const icons = {
      weapon: '⚔️',
      tool: '🔧',
      relic: '💎',
      artifact: '🏺',
      wonder: '✨',
      consumable: '🧪'
    };

    const rarityGlow = {
      common: '',
      uncommon: '🔵',
      rare: '🟡',
      epic: '🟣',
      legendary: '🔴'
    };

    return rarityGlow[rarity] + icons[type];
  }

  // Transfer artifact between tribes
  transferArtifact(artifactId: string, newTribe: string, method: 'trade' | 'theft' | 'conquest' | 'gift'): boolean {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) return false;

    const oldTribe = artifact.tribe;
    artifact.tribe = newTribe;
    artifact.stolenCount++;
    artifact.transferHistory.push({
      from: oldTribe,
      to: newTribe,
      day: Date.now(),
      method
    });

    return true;
  }

  // Get all artifacts for a tribe
  getArtifactsByTribe(tribe: string): Artifact[] {
    return Array.from(this.artifacts.values()).filter(a => a.tribe === tribe);
  }

  // Calculate set bonuses for a tribe
  getSetBonuses(tribe: string): { set: ArtifactSet; count: number; bonuses: ArtifactBonus[] }[] {
    const tribeArtifacts = this.getArtifactsByTribe(tribe);
    const results: { set: ArtifactSet; count: number; bonuses: ArtifactBonus[] }[] = [];

    for (const [setId, set] of this.artifactSets) {
      const artifactsInSet = tribeArtifacts.filter(a => a.set === setId);
      const count = artifactsInSet.length;

      if (count > 0) {
        const bonuses: ArtifactBonus[] = [];
        // Find the highest bonus threshold achieved
        const thresholds = Object.keys(set.bonuses).map(Number).sort((a, b) => b - a);

        for (const threshold of thresholds) {
          if (count >= threshold) {
            bonuses.push(...set.bonuses[threshold]);
            break;
          }
        }

        if (bonuses.length > 0) {
          results.push({ set, count, bonuses });
        }
      }
    }

    return results;
  }

  // Calculate total artifact bonuses for a tribe
  getArtifactBonuses(tribe: string): {
    resourceMultipliers: { [resource: string]: number };
    skillBoosts: { [skill: string]: number };
    combatBoost: number;
    defenseBoost: number;
    researchBoost: number;
    flatBonuses: { [resource: string]: number };
    specialAbilities: string[];
  } {
    const artifacts = this.getArtifactsByTribe(tribe);
    const setBonuses = this.getSetBonuses(tribe);

    const result = {
      resourceMultipliers: {} as { [resource: string]: number },
      skillBoosts: {} as { [skill: string]: number },
      combatBoost: 1,
      defenseBoost: 1,
      researchBoost: 1,
      flatBonuses: {} as { [resource: string]: number },
      specialAbilities: [] as string[]
    };

    // Process individual artifact bonuses
    for (const artifact of artifacts) {
      if (!artifact.isActive) continue;

      for (const bonus of artifact.bonuses) {
        this.applyBonus(result, bonus);
      }
    }

    // Process set bonuses
    for (const { bonuses } of setBonuses) {
      for (const bonus of bonuses) {
        this.applyBonus(result, bonus);
      }
    }

    return result;
  }

  private applyBonus(
    result: any,
    bonus: ArtifactBonus
  ): void {
    switch (bonus.type) {
      case 'resource_multiplier':
        if (bonus.resource) {
          result.resourceMultipliers[bonus.resource] =
            (result.resourceMultipliers[bonus.resource] || 1) * bonus.value;
        }
        break;

      case 'flat_bonus':
        if (bonus.resource) {
          result.flatBonuses[bonus.resource] =
            (result.flatBonuses[bonus.resource] || 0) + bonus.value;
        }
        break;

      case 'skill_boost':
        if (bonus.skill) {
          result.skillBoosts[bonus.skill] =
            (result.skillBoosts[bonus.skill] || 1) * bonus.value;
        }
        break;

      case 'combat_boost':
        result.combatBoost *= bonus.value;
        break;

      case 'defense_boost':
        result.defenseBoost *= bonus.value;
        break;

      case 'research_boost':
        result.researchBoost *= bonus.value;
        break;

      case 'special_ability':
        result.specialAbilities.push(bonus.description);
        break;
    }
  }

  // Random discovery chance during exploration
  discoverArtifact(tribe: string, agentId: string): Artifact | null {
    // 5% chance of discovery
    if (Math.random() > 0.05) return null;

    const artifact = this.generateArtifact(tribe);
    if (artifact) {
      artifact.discoveredBy = agentId;
    }
    return artifact;
  }

  // Master craftsman creation
  createArtifact(tribe: string, agentId: string, skill: string, quality: number): Artifact | null {
    // Quality 0-100, higher = better chance of rarity
    let rarity: ArtifactRarity = 'common';

    if (quality > 95) rarity = 'legendary';
    else if (quality > 85) rarity = 'epic';
    else if (quality > 70) rarity = 'rare';
    else if (quality > 50) rarity = 'uncommon';

    const typeMap: { [skill: string]: ArtifactType } = {
      combat: 'weapon',
      crafting: 'tool',
      research: 'artifact',
      building: 'tool',
      diplomacy: 'relic',
      trade: 'artifact'
    };

    const type = typeMap[skill] || 'artifact';

    const artifact = this.generateArtifact(tribe, rarity, type);
    if (artifact) {
      artifact.creatorAgentId = agentId;
      artifact.requiredSkill = skill;
    }

    return artifact;
  }

  // Reduce durability of tools/weapons
  reduceDurability(artifactId: string, amount: number = 1): boolean {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact || artifact.durability === undefined) return false;

    artifact.durability = Math.max(0, artifact.durability - amount);

    if (artifact.durability <= 0) {
      artifact.isActive = false;
      return true; // Artifact broke
    }

    return false;
  }

  // Use a consumable charge
  useCharge(artifactId: string): boolean {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact || artifact.charges === undefined) return false;

    artifact.charges--;

    if (artifact.charges <= 0) {
      this.artifacts.delete(artifactId);
      return true; // Consumable used up
    }

    return false;
  }

  // Repair artifact
  repairArtifact(artifactId: string, amount: number): boolean {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact || artifact.durability === undefined) return false;

    artifact.durability = Math.min(100, artifact.durability + amount);
    artifact.isActive = true;
    return true;
  }

  // Get artifact by ID
  getArtifact(artifactId: string): Artifact | undefined {
    return this.artifacts.get(artifactId);
  }

  // Get all artifacts
  getAllArtifacts(): Artifact[] {
    return Array.from(this.artifacts.values());
  }

  // Get artifact sets
  getAllSets(): ArtifactSet[] {
    return Array.from(this.artifactSets.values());
  }

  // Get artifact set progress for a tribe
  getSetProgress(tribe: string): { setId: string; setName: string; count: number; max: number }[] {
    const tribeArtifacts = this.getArtifactsByTribe(tribe);
    const progress: { setId: string; setName: string; count: number; max: number }[] = [];

    for (const [setId, set] of this.artifactSets) {
      const count = tribeArtifacts.filter(a => a.set === setId).length;
      const max = 6; // Max pieces per set

      if (count > 0) {
        progress.push({
          setId,
          setName: set.name,
          count,
          max
        });
      }
    }

    return progress;
  }

  // Clean up broken/inactive artifacts
  cleanupArtifacts(): void {
    const toRemove: string[] = [];

    for (const [id, artifact] of this.artifacts) {
      if (!artifact.isActive && artifact.durability !== undefined && artifact.durability <= 0) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.artifacts.delete(id);
    }
  }

  public serialize(): any {
    return {
      artifacts: Array.from(this.artifacts.entries()),
      artifactSets: Array.from(this.artifactSets.entries()),
      artifactIdCounter: this.artifactIdCounter
    };
  }

  public deserialize(data: any): void {
    this.artifacts = new Map(data.artifacts || []);
    this.artifactSets = new Map(data.artifactSets || []);
    this.artifactIdCounter = data.artifactIdCounter || 0;
  }
}
