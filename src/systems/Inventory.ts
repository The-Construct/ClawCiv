// Inventory & Equipment System for ClawCiv
// Agents can collect, craft, and equip items to enhance their abilities

export type ItemType = 'weapon' | 'armor' | 'accessory' | 'tool' | 'consumable' | 'material';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type EquipmentSlot = 'mainhand' | 'offhand' | 'armor' | 'accessory1' | 'accessory2' | 'tool';

export interface ItemStats {
  attack?: number;
  defense?: number;
  health?: number;
  speed?: number;
  craftingSpeed?: number;
  researchSpeed?: number;
  gatheringBonus?: number;
  combatBonus?: number;
  diplomacyBonus?: number;
  tradeBonus?: number;
  movementSpeed?: number;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  icon: string;
  stats: ItemStats;
  value: number; // Base value in tokens
  stackable: boolean;
  maxStack: number;
  durability?: number;
  maxDurability?: number;
  requiredLevel?: number;
  requiredSkills?: string[];
  isEquipped: boolean;
}

export interface InventorySlot {
  item: Item | null;
  quantity: number;
}

export interface Equipment {
  mainhand: Item | null;
  offhand: Item | null;
  armor: Item | null;
  accessory1: Item | null;
  accessory2: Item | null;
  tool: Item | null;
}

export interface CraftingRecipe {
  id: string;
  resultItem: Partial<Item>;
  materials: { [key: string]: number };
  craftingTime: number; // In ticks
  requiredLevel: number;
  requiredSkills?: string[];
}

export interface AgentInventory {
  agentId: string;
  inventory: InventorySlot[];
  equipment: Equipment;
  maxSlots: number;
  usedSlots: number;
}

export class InventorySystem {
  private inventories: Map<string, AgentInventory> = new Map();
  private itemIdCounter = 0;
  private recipes: CraftingRecipe[] = [];

  constructor() {
    this.initializeRecipes();
  }

  // Create inventory for an agent
  createInventory(agentId: string, initialItems: Item[] = []): AgentInventory {
    const inventory: AgentInventory = {
      agentId,
      inventory: Array(20).fill(null).map(() => ({ item: null, quantity: 0 })),
      equipment: {
        mainhand: null,
        offhand: null,
        armor: null,
        accessory1: null,
        accessory2: null,
        tool: null
      },
      maxSlots: 20,
      usedSlots: 0
    };

    // Add initial items
    for (const item of initialItems) {
      this.addItem(agentId, item);
    }

    this.inventories.set(agentId, inventory);
    return inventory;
  }

  // Generate a random item based on level and rarity
  generateItem(level: number, rarity?: ItemRarity, type?: ItemType): Item {
    const selectedRarity = rarity || this.randomRarity(level);
    const itemTypes: ItemType[] = ['weapon', 'armor', 'accessory', 'tool', 'consumable'];
    const selectedType = type || itemTypes[Math.floor(Math.random() * itemTypes.length)];

    const baseStats = this.getBaseStatsForType(selectedType);
    const rarityMultiplier = this.getRarityMultiplier(selectedRarity);
    const levelBonus = level * 2;

    const item: Item = {
      id: `item-${this.itemIdCounter++}-${Date.now()}`,
      name: this.generateItemName(selectedType, selectedRarity),
      description: this.generateItemDescription(selectedType, selectedRarity),
      type: selectedType,
      rarity: selectedRarity,
      icon: this.getItemIcon(selectedType, selectedRarity),
      stats: {},
      value: Math.floor((10 + levelBonus) * rarityMultiplier),
      stackable: selectedType === 'consumable' || selectedType === 'material',
      maxStack: selectedType === 'consumable' || selectedType === 'material' ? 99 : 1,
      durability: selectedType === 'weapon' || selectedType === 'armor' || selectedType === 'tool' ? 100 : undefined,
      maxDurability: selectedType === 'weapon' || selectedType === 'armor' || selectedType === 'tool' ? 100 : undefined,
      requiredLevel: selectedRarity === 'legendary' ? Math.max(1, level - 5) : undefined,
      isEquipped: false
    };

    // Apply stats based on rarity and type
    for (const [stat, baseValue] of Object.entries(baseStats)) {
      const variance = 0.2; // 20% variance
      const randomMult = 1 + (Math.random() * variance * 2 - variance);
      const finalValue = Math.floor(baseValue * rarityMultiplier * randomMult + levelBonus * 0.5);
      if (finalValue > 0) {
        (item.stats as any)[stat] = finalValue;
      }
    }

    return item;
  }

  private randomRarity(level: number): ItemRarity {
    const roll = Math.random() * 100;
    if (roll < 50) return 'common';
    if (roll < 75) return 'uncommon';
    if (roll < 90) return 'rare';
    if (roll < 97) return 'epic';
    return 'legendary';
  }

  private getRarityMultiplier(rarity: ItemRarity): number {
    switch (rarity) {
      case 'common': return 1.0;
      case 'uncommon': return 1.5;
      case 'rare': return 2.5;
      case 'epic': return 4.0;
      case 'legendary': return 6.0;
    }
  }

  private getBaseStatsForType(type: ItemType): ItemStats {
    switch (type) {
      case 'weapon':
        return { attack: 5, combatBonus: 3 };
      case 'armor':
        return { defense: 5, health: 10 };
      case 'accessory':
        return { speed: 2, [this.randomBonusStat()]: 3 };
      case 'tool':
        return { craftingSpeed: 5, gatheringBonus: 5 };
      case 'consumable':
        return { health: 20 };
      case 'material':
        return {};
    }
  }

  private randomBonusStat(): string {
    const stats = ['attack', 'defense', 'craftingSpeed', 'researchSpeed', 'diplomacyBonus', 'tradeBonus'];
    return stats[Math.floor(Math.random() * stats.length)];
  }

  private generateItemName(type: ItemType, rarity: ItemRarity): string {
    const rarityPrefix = {
      common: '',
      uncommon: 'Fine ',
      rare: 'Superior ',
      epic: 'Epic ',
      legendary: 'Legendary '
    };

    const typeNames = {
      weapon: ['Sword', 'Axe', 'Spear', 'Bow', 'Dagger', 'Mace', 'Staff'],
      armor: ['Chestplate', 'Helmet', 'Gauntlets', 'Boots', 'Shield', 'Greaves'],
      accessory: ['Ring', 'Amulet', 'Bracelet', 'Crown', 'Belt', 'Cloak'],
      tool: ['Hammer', 'Pickaxe', 'Axe', 'Sickle', 'Chisel', 'Saw'],
      consumable: ['Health Potion', 'Energy Brew', 'Lucky Charm', 'Ration'],
      material: ['Iron Ingot', 'Wood Plank', 'Leather Strip', 'Gem Shard', 'Cloth', 'Herb Bundle']
    };

    const names = typeNames[type] || typeNames.weapon;
    const baseName = names[Math.floor(Math.random() * names.length)];
    return rarityPrefix[rarity] + baseName;
  }

  private generateItemDescription(type: ItemType, rarity: ItemRarity): string {
    const descriptions = {
      common: 'A basic item for everyday use.',
      uncommon: 'Well-crafted with above average materials.',
      rare: 'Expertly made with rare components.',
      epic: 'An exceptional item of great power.',
      legendary: 'A legendary artifact of immense power!'
    };
    return descriptions[rarity];
  }

  private getItemIcon(type: ItemType, rarity: ItemRarity): string {
    const icons = {
      weapon: '⚔️',
      armor: '🛡️',
      accessory: '💍',
      tool: '🔧',
      consumable: '🧪',
      material: '📦'
    };
    return icons[type] || '📦';
  }

  // Add item to inventory
  addItem(agentId: string, item: Item, quantity: number = 1): boolean {
    const inv = this.inventories.get(agentId);
    if (!inv) return false;

    // Try to stack if item is stackable
    if (item.stackable) {
      for (const slot of inv.inventory) {
        if (slot.item && slot.item.id === item.id && slot.quantity < slot.item.maxStack) {
          const canAdd = Math.min(quantity, slot.item.maxStack - slot.quantity);
          slot.quantity += canAdd;
          quantity -= canAdd;
          if (quantity <= 0) return true;
        }
      }
    }

    // Find empty slot
    while (quantity > 0) {
      const emptySlot = inv.inventory.find(s => s.item === null);
      if (!emptySlot) return false; // Inventory full

      const itemToAdd = { ...item, id: item.stackable ? item.id : `item-${this.itemIdCounter++}-${Date.now()}` };
      emptySlot.item = itemToAdd;
      emptySlot.quantity = item.stackable ? Math.min(quantity, item.maxStack) : 1;
      quantity -= item.stackable ? emptySlot.quantity : 1;
      inv.usedSlots++;
    }

    return true;
  }

  // Remove item from inventory
  removeItem(agentId: string, itemId: string, quantity: number = 1): boolean {
    const inv = this.inventories.get(agentId);
    if (!inv) return false;

    for (const slot of inv.inventory) {
      if (slot.item && slot.item.id === itemId) {
        if (slot.quantity >= quantity) {
          slot.quantity -= quantity;
          if (slot.quantity <= 0) {
            slot.item = null;
            inv.usedSlots--;
          }
          return true;
        }
      }
    }

    return false;
  }

  // Equip item to specific slot
  equipItem(agentId: string, itemId: string, slot: EquipmentSlot): boolean {
    const inv = this.inventories.get(agentId);
    if (!inv) return false;

    const itemSlot = inv.inventory.find(s => s.item && s.item.id === itemId);
    if (!itemSlot || !itemSlot.item) return false;

    const item = itemSlot.item;
    const validSlot = this.getValidSlotForItem(item.type);
    if (!validSlot || validSlot !== slot) return false;

    // Unequip current item if any
    if (inv.equipment[slot]) {
      this.unequipItem(agentId, slot);
    }

    // Equip new item
    inv.equipment[slot] = item;
    item.isEquipped = true;

    // Remove from inventory
    itemSlot.quantity--;
    if (itemSlot.quantity <= 0) {
      itemSlot.item = null;
      inv.usedSlots--;
    }

    return true;
  }

  // Unequip item from slot
  unequipItem(agentId: string, slot: EquipmentSlot): boolean {
    const inv = this.inventories.get(agentId);
    if (!inv || !inv.equipment[slot]) return false;

    const item = inv.equipment[slot];
    if (!item) return false;

    // Try to add back to inventory
    if (this.addItem(agentId, { ...item, isEquipped: false }, 1)) {
      inv.equipment[slot] = null;
      item.isEquipped = false;
      return true;
    }

    return false;
  }

  private getValidSlotForItem(type: ItemType): EquipmentSlot | null {
    switch (type) {
      case 'weapon': return 'mainhand';
      case 'armor': return 'armor';
      case 'accessory': return 'accessory1';
      case 'tool': return 'tool';
      default: return null;
    }
  }

  // Get total stat bonuses from equipment
  getEquipmentBonus(agentId: string, stat: keyof ItemStats): number {
    const inv = this.inventories.get(agentId);
    if (!inv) return 0;

    let total = 0;
    for (const item of Object.values(inv.equipment)) {
      if (item && item.stats[stat]) {
        total += item.stats[stat]!;
      }
    }
    return total;
  }

  // Craft item from recipe
  craftItem(agentId: string, recipeId: string, agent: any): boolean {
    const inv = this.inventories.get(agentId);
    if (!inv) return false;

    const recipe = this.recipes.find(r => r.id === recipeId);
    if (!recipe) return false;

    // Check level requirement
    if (agent.level < recipe.requiredLevel) return false;

    // Check skills
    if (recipe.requiredSkills) {
      const hasSkill = recipe.requiredSkills.some(s => agent.skills.includes(s));
      if (!hasSkill) return false;
    }

    // Check materials
    for (const [material, amount] of Object.entries(recipe.materials)) {
      if (!this.hasMaterial(agentId, material, amount)) {
        return false;
      }
    }

    // Consume materials
    for (const [material, amount] of Object.entries(recipe.materials)) {
      this.consumeMaterial(agentId, material, amount);
    }

    // Create result item
    const resultItem: Item = {
      id: `item-${this.itemIdCounter++}-${Date.now()}`,
      name: recipe.resultItem.name || 'Crafted Item',
      description: recipe.resultItem.description || 'Crafted by hand',
      type: recipe.resultItem.type || 'weapon',
      rarity: recipe.resultItem.rarity || 'common',
      icon: recipe.resultItem.icon || '⚒️',
      stats: recipe.resultItem.stats || {},
      value: recipe.resultItem.value || 10,
      stackable: recipe.resultItem.stackable || false,
      maxStack: recipe.resultItem.maxStack || 1,
      durability: recipe.resultItem.durability,
      maxDurability: recipe.resultItem.maxDurability,
      isEquipped: false
    };

    return this.addItem(agentId, resultItem);
  }

  private hasMaterial(agentId: string, material: string, amount: number): boolean {
    const inv = this.inventories.get(agentId);
    if (!inv) return false;

    for (const slot of inv.inventory) {
      if (slot.item && slot.item.name === material && slot.quantity >= amount) {
        return true;
      }
    }
    return false;
  }

  private consumeMaterial(agentId: string, material: string, amount: number): void {
    const inv = this.inventories.get(agentId);
    if (!inv) return;

    for (const slot of inv.inventory) {
      if (slot.item && slot.item.name === material) {
        const toRemove = Math.min(slot.quantity, amount);
        slot.quantity -= toRemove;
        amount -= toRemove;
        if (slot.quantity <= 0) {
          slot.item = null;
          inv.usedSlots--;
        }
        if (amount <= 0) break;
      }
    }
  }

  // Get inventory for agent
  getInventory(agentId: string): AgentInventory | undefined {
    return this.inventories.get(agentId);
  }

  // Get all items of a specific type from inventory
  getItemsByType(agentId: string, type: ItemType): Item[] {
    const inv = this.inventories.get(agentId);
    if (!inv) return [];

    const items: Item[] = [];
    for (const slot of inv.inventory) {
      if (slot.item && slot.item.type === type) {
        items.push(slot.item);
      }
    }
    return items;
  }

  // Use consumable item
  useConsumable(agentId: string, itemId: string): { success: boolean; effect?: string } {
    const inv = this.inventories.get(agentId);
    if (!inv) return { success: false };

    const slot = inv.inventory.find(s => s.item && s.item.id === itemId);
    if (!slot || !slot.item || slot.item.type !== 'consumable') {
      return { success: false };
    }

    const item = slot.item;
    let effect = '';

    // Apply item effects
    if (item.stats.health) {
      effect = `Restored ${item.stats.health} health`;
    }

    // Remove consumable
    this.removeItem(agentId, itemId, 1);

    return { success: true, effect };
  }

  // Repair equipment
  repairItem(agentId: string, slot: EquipmentSlot, materials: number): boolean {
    const inv = this.inventories.get(agentId);
    if (!inv || !inv.equipment[slot]) return false;

    const item = inv.equipment[slot];
    if (!item || !item.durability || !item.maxDurability) return false;

    // Check if has materials to repair
    if (!this.hasMaterial(agentId, 'materials', materials)) return false;

    // Repair item
    const repairAmount = Math.min(50, item.maxDurability - item.durability);
    item.durability += repairAmount;
    this.consumeMaterial(agentId, 'materials', materials);

    return true;
  }

  // Initialize crafting recipes
  private initializeRecipes(): void {
    this.recipes = [
      {
        id: 'sword_basic',
        resultItem: {
          name: 'Iron Sword',
          description: 'A reliable iron sword',
          type: 'weapon',
          rarity: 'common',
          icon: '⚔️',
          stats: { attack: 8, combatBonus: 5 },
          value: 25,
          stackable: false,
          maxStack: 1,
          durability: 100,
          maxDurability: 100
        },
        materials: { 'Iron Ingot': 3, 'Wood Plank': 1 },
        craftingTime: 5,
        requiredLevel: 1,
        requiredSkills: ['crafting']
      },
      {
        id: 'armor_basic',
        resultItem: {
          name: 'Iron Armor',
          description: 'Sturdy iron armor',
          type: 'armor',
          rarity: 'common',
          icon: '🛡️',
          stats: { defense: 10, health: 15 },
          value: 30,
          stackable: false,
          maxStack: 1,
          durability: 100,
          maxDurability: 100
        },
        materials: { 'Iron Ingot': 5, 'Leather Strip': 2 },
        craftingTime: 8,
        requiredLevel: 2,
        requiredSkills: ['crafting']
      },
      {
        id: 'potion_health',
        resultItem: {
          name: 'Health Potion',
          description: 'Restores health when consumed',
          type: 'consumable',
          rarity: 'common',
          icon: '🧪',
          stats: { health: 30 },
          value: 15,
          stackable: true,
          maxStack: 10
        },
        materials: { 'Herb Bundle': 2 },
        craftingTime: 2,
        requiredLevel: 1,
        requiredSkills: ['healing']
      },
      {
        id: 'tool_pickaxe',
        resultItem: {
          name: 'Mining Pickaxe',
          description: 'Essential for mining operations',
          type: 'tool',
          rarity: 'common',
          icon: '⛏️',
          stats: { gatheringBonus: 15 },
          value: 20,
          stackable: false,
          maxStack: 1,
          durability: 80,
          maxDurability: 80
        },
        materials: { 'Iron Ingot': 2, 'Wood Plank': 2 },
        craftingTime: 4,
        requiredLevel: 1,
        requiredSkills: ['mining']
      },
      {
        id: 'ring_lucky',
        resultItem: {
          name: 'Lucky Ring',
          description: 'A ring that brings good fortune',
          type: 'accessory',
          rarity: 'uncommon',
          icon: '💍',
          stats: { speed: 5, tradeBonus: 10 },
          value: 40,
          stackable: false,
          maxStack: 1
        },
        materials: { 'Gem Shard': 1, 'Iron Ingot': 1 },
        craftingTime: 6,
        requiredLevel: 3,
        requiredSkills: ['crafting']
      }
    ];
  }

  public serialize(): any {
    return {
      inventories: Array.from(this.inventories.entries()),
      itemIdCounter: this.itemIdCounter
    };
  }

  public deserialize(data: any): void {
    this.inventories = new Map(data.inventories || []);
    this.itemIdCounter = data.itemIdCounter || 0;
  }
}
