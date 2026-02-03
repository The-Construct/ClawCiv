// ClawCiv Game Engine
// Autonomous AI civilization simulation

import { TokenSystem } from '../economy/Token.js';
import { TerritorySystem } from '../systems/Territory.js';
import { TechTree } from '../systems/TechTree.js';
import { BuildingSystem, Building } from '../systems/Buildings.js';
import { AchievementSystem } from '../systems/Achievements.ts';
import { EventSystem } from '../systems/Events.ts';
import { QuestSystem } from '../systems/Quests.ts';
import { DiplomacySystem } from '../systems/Diplomacy.ts';

export interface Message {
  id: string;
  agentId: string;
  agentName: string;
  tribe: string;
  content: string;
  timestamp: number;
  type: 'chat' | 'trade' | 'diplomacy' | 'combat' | 'celebration';
}

export type Specialization = 'none' | 'healer' | 'merchant' | 'warrior' | 'builder' | 'scout' | 'leader' | 'craftsman';

export interface Agent {
  id: string;
  name: string;
  tribe: string;
  x: number;
  y: number;
  worldX: number; // Actual 3D world X position
  worldZ: number; // Actual 3D world Z position
  targetAgentId?: string; // Agent this agent is moving toward (for attack/defend)
  resources: {
    food: number;
    energy: number;
    materials: number;
    knowledge: number;
    socialCapital: number;
  };
  skills: string[];
  specialization: Specialization;
  alive: boolean;
  currentMessage?: string;
  messageTimer?: number;
  alliances: Set<string>;
  enemies: Set<string>;
  level: number;
  experience: number;
}

export interface GameState {
  agents: Agent[];
  grid: number[][];
  day: number;
  territories: Map<string, number[][]>;
  messages: Message[];
  buildings: Building[];
}

export class GameEngine {
  private state: GameState;
  private readonly GRID_SIZE = 10;
  private readonly INITIAL_AGENTS = 60; // 20 per tribe
  private readonly AGENTS_PER_TRIBE = 20;
  private readonly TRIBES = ['Alpha', 'Beta', 'Gamma'];
  private tokenSystem: TokenSystem;
  private territorySystem: TerritorySystem;
  private techTrees: Map<string, TechTree>;
  private buildingSystem: BuildingSystem;
  private achievementSystem: AchievementSystem;
  private eventSystem: EventSystem;
  private questSystem: QuestSystem;
  private diplomacySystem: DiplomacySystem;
  private victoryAchieved: boolean = false;

  constructor() {
    this.tokenSystem = new TokenSystem();
    this.territorySystem = new TerritorySystem();
    this.buildingSystem = new BuildingSystem();
    this.achievementSystem = new AchievementSystem();
    this.achievementSystem.setGameEngine(this);
    this.eventSystem = new EventSystem();
    this.questSystem = new QuestSystem();
    this.diplomacySystem = new DiplomacySystem();
    this.techTrees = new Map();
    // Create tech tree for each tribe
    for (const tribe of this.TRIBES) {
      this.techTrees.set(tribe, new TechTree());
    }
    this.state = this.initializeState();
  }

  private initializeState(): GameState {
    // Create 10x10 grid
    const grid = Array(this.GRID_SIZE).fill(0).map(() =>
      Array(this.GRID_SIZE).fill(0)
    );

    // Create 150 agents (50 per tribe) with tribe territories
    const agents: Agent[] = [];
    let agentId = 0;

    // Define tribe centers in world space (1000x1000 world)
    const tribeCenters = new Map<string, { x: number; z: number }>([
      ['Alpha', { x: -350, z: -350 }],
      ['Beta', { x: 350, z: -350 }],
      ['Gamma', { x: 0, z: 350 }]
    ]);

    for (const tribe of this.TRIBES) {
      const center = tribeCenters.get(tribe)!;

      for (let i = 0; i < this.AGENTS_PER_TRIBE; i++) {
        const id = `agent-${agentId++}`;
        const skills = this.generateSkills();
        const specialization = this.determineSpecialization(skills);

        // Position agents around their tribe center with some spread
        const spread = 250; // Tribe territory spread (less tight)
        const worldX = center.x + (Math.random() - 0.5) * spread;
        const worldZ = center.z + (Math.random() - 0.5) * spread;

        agents.push({
          id: id,
          name: this.generateAgentName(tribe),
          tribe,
          x: Math.floor(Math.random() * this.GRID_SIZE),
          y: Math.floor(Math.random() * this.GRID_SIZE),
          worldX: worldX,
          worldZ: worldZ,
          resources: {
            food: 100,
            energy: 100,
            materials: 50,
            knowledge: 0,
            socialCapital: 50
          },
          skills,
          specialization,
          alive: true,
          alliances: new Set(),
          enemies: new Set(),
          level: 1,
          experience: 0
        });

        // Create token account for this agent
        this.tokenSystem.createAgentAccount(agentId, tribe);
      }
    }

    return {
      agents,
      grid,
      day: 0,
      territories: new Map(),
      messages: [],
      buildings: []
    };
  }

  private generateSkills(): string[] {
    const skills = [
      'farming', 'mining', 'research', 'trade', 'combat',
      'building', 'diplomacy', 'crafting', 'leadership'
    ];
    // Each agent gets 2-3 random skills
    const numSkills = 2 + Math.floor(Math.random() * 2);
    const shuffled = skills.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, numSkills);
  }

  private determineSpecialization(skills: string[]): Specialization {
    // Determine specialization based on primary skill
    const skillCounts: { [key: string]: number } = {};
    for (const skill of skills) {
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
    }

    // Check for specializations
    if (skillCounts['combat'] >= 1 && skillCounts['leadership'] >= 1) return 'warrior';
    if (skillCounts['trade'] >= 1 && skillCounts['diplomacy'] >= 1) return 'merchant';
    if (skillCounts['building'] >= 1) return 'builder';
    if (skillCounts['research'] >= 1 && skillCounts['crafting'] >= 1) return 'craftsman';
    if (skillCounts['diplomacy'] >= 1 && skillCounts['leadership'] >= 1) return 'leader';
    if (skillCounts['farming'] >= 1 && skills.length < 3) return 'healer'; // Support role
    if (skills.includes('trade') && skills.length < 3) return 'scout';

    // Default to none
    return 'none';
  }

  private grantExperience(agent: Agent, amount: number): void {
    agent.experience += amount;

    // Level up every 100 experience
    const expNeeded = agent.level * 100;
    if (agent.experience >= expNeeded) {
      agent.level++;
      agent.experience -= expNeeded;

      // Bonus for leveling up
      this.tokenSystem.earnTokens(agent.id, agent.level * 50, 'level_up');

      this.state.messages.push({
        id: `levelup-${Date.now()}-${agent.id}`,
        agentId: agent.id,
        agentName: agent.name,
        tribe: agent.tribe,
        content: `⬆️ ${agent.name} reached Level ${agent.level}!`,
        timestamp: this.state.day,
        type: 'celebration'
      });
    }
  }

  private useSpecialAbility(agent: Agent): void {
    if (agent.specialization === 'none') return;

    // Only use special ability 10% of the time
    if (Math.random() > 0.1) return;

    switch (agent.specialization) {
      case 'healer':
        // Heal nearby allies
        const nearby = this.getNearbyAgents(agent, 2);
        for (const other of nearby) {
          if (other.tribe === agent.tribe && other.resources.food < 50) {
            other.resources.food += 10;
            other.resources.energy += 5;
            this.grantExperience(agent, 5);
          }
        }
        break;

      case 'merchant':
        // Bonus trading income
        this.tokenSystem.earnTokens(agent.id, 15, 'merchant_bonus');
        this.grantExperience(agent, 3);
        break;

      case 'warrior':
        // Combat bonus - already handled in combat
        this.grantExperience(agent, 4);
        break;

      case 'builder':
        // Build structures (increase tribe resources)
        agent.resources.materials += 8;
        this.grantExperience(agent, 3);
        break;

      case 'scout':
        // Move further and gain information
        agent.resources.knowledge += 5;
        this.grantExperience(agent, 3);
        break;

      case 'leader':
        // Boost nearby allies' performance
        const allies = this.getNearbyAgents(agent, 2);
        for (const ally of allies) {
          if (ally.tribe === agent.tribe) {
            ally.resources.socialCapital += 5;
            this.tokenSystem.earnTokens(ally.id, 5, 'leadership_bonus');
          }
        }
        this.grantExperience(agent, 5);
        break;

      case 'craftsman':
        // Create valuable items
        agent.resources.materials += 5;
        agent.resources.knowledge += 3;
        this.tokenSystem.earnTokens(agent.id, 8, 'crafting');
        this.grantExperience(agent, 4);
        break;
    }
  }

  private generateAgentName(tribe: string): string {
    const prefixes = {
      'Alpha': ['Zar', 'Thor', 'Rax', 'Kael', 'Vorn', 'Jax', 'Mor', 'Xan'],
      'Beta': ['Luna', 'Aura', 'Vea', 'Sol', 'Nyx', 'Cela', 'Mira', 'Zia'],
      'Gamma': ['Grog', 'Brak', 'Zogg', 'Krull', 'Drog', 'Varg', 'Hulk', 'Thrak']
    };

    const suffixes = ['ian', 'ara', 'on', 'ix', 'us', 'is', 'or', 'a'];

    const tribePrefixes = prefixes[tribe as keyof typeof prefixes] || prefixes['Alpha'];
    const prefix = tribePrefixes[Math.floor(Math.random() * tribePrefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

    return prefix + suffix;
  }

  private generateDialogue(agent: Agent, action: string): string | null {
    // Only 15% chance to speak each tick to avoid spam
    if (Math.random() > 0.15) return null;

    const dialogues = {
      'farming': [
        "Harvest is bountiful today!",
        "The crops respond to our care.",
        "Food stores are growing.",
        "Another day, another harvest.",
        "Tribe must eat!"
      ],
      'mining': [
        "Struck something valuable!",
        "The earth provides.",
        "Deep in the mines, I find purpose.",
        "Materials for the tribe!",
        "More resources secured."
      ],
      'research': [
        "I've discovered something new!",
        "Knowledge is power.",
        "The pieces are coming together.",
        "Eureka! Another breakthrough.",
        "Understanding grows..."
      ],
      'trade': [
        "Anyone need to trade?",
        "Looking for opportunities!",
        "Prosperity through exchange.",
        "Let's make a deal.",
        "Markets are moving!"
      ],
      'combat': [
        "For the glory of the tribe!",
        "Victory or death!",
        "Our territory expands.",
        "None can stand against us!",
        "Battle calls!"
      ],
      'low_resources': [
        "Resources are running low...",
        "We need more supplies.",
        "Survival is difficult.",
        "The tribe struggles.",
        "Can anyone spare resources?"
      ],
      'celebration': [
        "Today is a good day!",
        "The tribe prospers!",
        "Celebration time!",
        "We grow stronger!",
        "Victory!"
      ],
      'greeting': [
        "Greetings, fellow agent!",
        "Hello, friend!",
        "Well met!",
        "Peace be with you.",
        "Good to see you!"
      ]
    };

    // Select dialogue based on action or random
    let dialogueType = action;
    if (agent.resources.food < 30 || agent.resources.energy < 30) {
      dialogueType = 'low_resources';
    } else if (Math.random() > 0.7) {
      dialogueType = 'celebration';
    }

    const options = dialogues[dialogueType as keyof typeof dialogues] || dialogues['greeting'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private getNearbyAgents(agent: Agent, range: number = 50): Agent[] {
    return this.state.agents.filter(other => {
      if (other.id === agent.id || !other.alive) return false;

      // Use world positions for proximity
      const dx = other.worldX - agent.worldX;
      const dz = other.worldZ - agent.worldZ;
      const distance = Math.sqrt(dx * dx + dz * dz);

      return distance <= range;
    });
  }

  private handleTrade(agent: Agent, other: Agent): boolean {
    if (!agent.skills.includes('trade') || !other.skills.includes('trade')) {
      return false;
    }

    // Find resources to trade
    const resources = ['food', 'energy', 'materials', 'knowledge'] as const;
    const agentHas = resources.find(r => agent.resources[r] > 50);
    const otherHas = resources.find(r => other.resources[r] > 50);

    if (!agentHas || !otherHas || agentHas === otherHas) {
      return false;
    }

    // Execute trade
    const tradeAmount = 10;
    agent.resources[agentHas] -= tradeAmount;
    agent.resources[otherHas] += tradeAmount;
    other.resources[otherHas] -= tradeAmount;
    other.resources[agentHas] += tradeAmount;

    // Generate trade messages
    const tradeDialogues = [
      `Traded ${tradeAmount} ${agentHas} for ${tradeAmount} ${otherHas} with ${other.name}!`,
      `Excellent trade with ${other.name}!`,
      `Deal struck with ${other.name} - ${agentHas} for ${otherHas}!`
    ];

    agent.currentMessage = tradeDialogues[Math.floor(Math.random() * tradeDialogues.length)];
    agent.messageTimer = 5;

    this.state.messages.push({
      id: `trade-${Date.now()}-${agent.id}`,
      agentId: agent.id,
      agentName: agent.name,
      tribe: agent.tribe,
      content: agent.currentMessage,
      timestamp: this.state.day,
      type: 'trade'
    });

    // Reward successful trade with diplomacy modifier
    const tradeModifier = this.diplomacySystem.getTradeModifier(agent.tribe, other.tribe);
    const tokenReward = Math.round(10 * tradeModifier);
    this.tokenSystem.earnTokens(agent.id, tokenReward, 'trade');
    this.tokenSystem.earnTokens(other.id, tokenReward, 'trade');

    return true;
  }

  private handleCombat(attacker: Agent, defender: Agent): boolean {
    if (!attacker.skills.includes('combat')) return false;

    // Same tribe rarely fights
    if (attacker.tribe === defender.tribe && Math.random() > 0.1) {
      return false;
    }

    // Check diplomacy - cannot fight if tribes have non-aggression pact or alliance
    if (!this.diplomacySystem.canFight(attacker.tribe, defender.tribe)) {
      return false;
    }

    // Attacker moves toward defender
    attacker.targetAgentId = defender.id;

    // Defender's tribe members come to help
    const nearbyAllies = this.getNearbyAgents(defender, 100);
    for (const ally of nearbyAllies.slice(0, 3)) { // Up to 3 allies help
      if (ally.tribe === defender.tribe && ally.skills.includes('combat')) {
        ally.targetAgentId = attacker.id;
      }
    }

    // Combat strength based on resources
    const attackPower = attacker.resources.energy * 0.5 + attacker.resources.materials * 0.3;
    const defensePower = defender.resources.energy * 0.5 + defender.resources.materials * 0.3;

    const attackerWins = attackPower > defensePower * (0.8 + Math.random() * 0.4);

    if (attackerWins) {
      // Attacker steals resources
      const stolenFood = Math.min(defender.resources.food * 0.3, 20);
      const stolenMaterials = Math.min(defender.resources.materials * 0.3, 10);

      attacker.resources.food += stolenFood;
      attacker.resources.materials += stolenMaterials;
      defender.resources.food -= stolenFood;
      defender.resources.materials -= stolenMaterials;

      attacker.currentMessage = `Victory over ${defender.name}!`;
      attacker.messageTimer = 5;

      // Clear target after combat
      attacker.targetAgentId = undefined;

      // Add to enemies
      defender.enemies.add(attacker.id);

      this.state.messages.push({
        id: `combat-${Date.now()}-${attacker.id}`,
        agentId: attacker.id,
        agentName: attacker.name,
        tribe: attacker.tribe,
        content: `Defeated ${defender.name} in combat and took ${Math.round(stolenFood)} food, ${Math.round(stolenMaterials)} materials!`,
        timestamp: this.state.day,
        type: 'combat'
      });

      // Check if defender dies
      if (defender.resources.food <= 0) {
        defender.alive = false;
        this.state.messages.push({
          id: `death-${Date.now()}-${defender.id}`,
          agentId: defender.id,
          agentName: defender.name,
          tribe: defender.tribe,
          content: `${defender.name} has fallen in battle!`,
          timestamp: this.state.day,
          type: 'combat'
        });
      }
    } else {
      // Defender wins
      const counterDamage = 10;
      attacker.resources.energy -= counterDamage;

      defender.currentMessage = `Repelled ${attacker.name}!`;
      defender.messageTimer = 5;

      // Clear targets after defense
      attacker.targetAgentId = undefined;
      defender.targetAgentId = undefined;

      this.state.messages.push({
        id: `combat-${Date.now()}-${defender.id}`,
        agentId: defender.id,
        agentName: defender.name,
        tribe: defender.tribe,
        content: `Successfully defended against ${attacker.name}!`,
        timestamp: this.state.day,
        type: 'combat'
      });
    }

    // Reward combat victory
    this.tokenSystem.earnTokens(attacker.id, 15, 'combat_victory');

    return true;
  }

  private handleDiplomacy(agent: Agent, other: Agent): boolean {
    if (!agent.skills.includes('diplomacy')) return false;

    // Form alliance with same tribe
    if (agent.tribe === other.tribe && !agent.alliances.has(other.id)) {
      if (Math.random() > 0.6) {
        agent.alliances.add(other.id);
        other.alliances.add(agent.id);
        agent.resources.socialCapital += 10;
        other.resources.socialCapital += 10;

        const diplomacyDialogues = [
          `Formed alliance with ${other.name}!`,
          `${other.name} and I are now allies!`,
          `Strong bond formed with ${other.name}!`
        ];

        agent.currentMessage = diplomacyDialogues[Math.floor(Math.random() * diplomacyDialogues.length)];
        agent.messageTimer = 5;

        this.state.messages.push({
          id: `diplomacy-${Date.now()}-${agent.id}`,
          agentId: agent.id,
          agentName: agent.name,
          tribe: agent.tribe,
          content: agent.currentMessage,
          timestamp: this.state.day,
          type: 'diplomacy'
        });

        // Reward successful alliance
        this.tokenSystem.earnTokens(agent.id, 20, 'alliance_formed');
        this.tokenSystem.earnTokens(other.id, 20, 'alliance_formed');

        return true;
      }
    }

    // Try to make peace with enemy
    if (agent.enemies.has(other.id) && Math.random() > 0.7) {
      agent.enemies.delete(other.id);
      other.enemies.delete(agent.id);
      agent.resources.socialCapital += 20;

      agent.currentMessage = `Made peace with ${other.name}!`;
      agent.messageTimer = 5;

      this.state.messages.push({
        id: `diplomacy-${Date.now()}-${agent.id}`,
        agentId: agent.id,
        agentName: agent.name,
        tribe: agent.tribe,
        content: `Diplomatic success! Peace established with ${other.name}.`,
        timestamp: this.state.day,
        type: 'diplomacy'
      });

      // Reward successful peace treaty
      this.tokenSystem.earnTokens(agent.id, 25, 'peace_treaty');
      this.tokenSystem.earnTokens(other.id, 25, 'peace_treaty');

      return true;
    }

    return false;
  }

  private handleAgentInteractions(agent: Agent): void {
    const nearby = this.getNearbyAgents(agent, 1);

    for (const other of nearby) {
      // Try diplomacy first
      if (this.handleDiplomacy(agent, other)) continue;

      // Try trade
      if (this.handleTrade(agent, other)) continue;

      // Try combat (only with enemies or different tribes)
      if (agent.tribe !== other.tribe || agent.enemies.has(other.id)) {
        if (this.handleCombat(agent, other)) continue;
      }
    }
  }

  public tick(): void {
    this.state.day++;

    // Check achievements and victory (only if not already won)
    if (!this.victoryAchieved) {
      const newlyUnlocked = this.achievementSystem.checkAchievements(this);
      for (const achievement of newlyUnlocked) {
        this.addMessage({
          id: `achievement-${achievement.id}`,
          agentId: 'system',
          agentName: 'System',
          tribe: 'Global',
          content: `🏆 Achievement Unlocked: ${achievement.icon} ${achievement.name} - ${achievement.description}`,
          timestamp: this.state.day,
          type: 'celebration'
        });
      }

      // Check victory conditions
      const victory = this.achievementSystem.checkVictory(this);
      if (victory && victory.victory) {
        this.victoryAchieved = true;
        this.addMessage({
          id: `victory-${Date.now()}`,
          agentId: 'system',
          agentName: 'System',
          tribe: 'Global',
          content: `🎉 VICTORY! ${victory.reason}`,
          timestamp: this.state.day,
          type: 'celebration'
        });
      }
    }

    // Check for random events
    const newEvent = this.eventSystem.checkForEvent(this.state);
    if (newEvent) {
      this.addMessage({
        id: `event-${newEvent.id}-${Date.now()}`,
        agentId: 'system',
        agentName: 'System',
        tribe: 'Global',
        content: `${newEvent.icon} ${newEvent.name}: ${newEvent.description}`,
        timestamp: this.state.day,
        type: newEvent.type === 'disaster' ? 'combat' : 'celebration'
      });

      // Apply event effects to all agents
      const results = this.eventSystem.applyEventEffects(newEvent, this.state.agents);

      // Report casualties if any
      if (results.casualties.length > 0) {
        const deadAgents = this.state.agents.filter(a => results.casualties.includes(a.id));
        for (const agent of deadAgents) {
          this.addMessage({
            id: `death-${Date.now()}-${agent.id}`,
            agentId: agent.id,
            agentName: agent.name,
            tribe: agent.tribe,
            content: `${agent.name} perished in the ${newEvent.name}!`,
            timestamp: this.state.day,
            type: 'combat'
          });
        }
      }
    }

    // Update active events
    const expiredEvents = this.eventSystem.updateActiveEvents();
    for (const event of expiredEvents) {
      this.addMessage({
        id: `event-end-${event.id}-${Date.now()}`,
        agentId: 'system',
        agentName: 'System',
        tribe: 'Global',
        content: `${event.icon} The ${event.name} has ended.`,
        timestamp: this.state.day,
        type: 'celebration'
      });
    }

    // Update buildings and apply benefits
    const buildings = this.buildingSystem.getBuildings();
    // Sync with state
    this.state.buildings = buildings;

    for (const building of buildings) {
      this.buildingSystem.updateBuilding(building.id);

      // Apply benefits to tribe if construction complete
      if (building.constructionProgress >= 100) {
        const tribeAgents = this.state.agents.filter(a => a.tribe === building.tribe && a.alive);
        for (const [resource, amount] of Object.entries(building.benefits)) {
          const perAgent = (amount as number) / Math.max(1, tribeAgents.length);
          for (const agent of tribeAgents) {
            if (resource in agent.resources) {
              agent.resources[resource] += perAgent;
            }
          }
        }
      }
    }

    // Each agent takes action
    for (const agent of this.state.agents) {
      if (!agent.alive) continue;
      this.agentAction(agent);
    }

    // Decay territories occasionally (every 10 days)
    if (this.state.day % 10 === 0) {
      this.territorySystem.decayTerritories();
    }

    // Update diplomacy and generate AI proposals occasionally (every 15 days)
    if (this.state.day % 15 === 0) {
      this.diplomacySystem.updateAgreements(this.state.day);

      // Generate AI proposals between tribes
      for (const tribe1 of this.TRIBES) {
        for (const tribe2 of this.TRIBES) {
          if (tribe1 >= tribe2) continue; // Avoid duplicates

          const agents1 = this.state.agents.filter(a => a.tribe === tribe1 && a.alive);
          const agents2 = this.state.agents.filter(a => a.tribe === tribe2 && a.alive);

          // Tribe 1 proposes to Tribe 2
          const proposal1 = this.diplomacySystem.generateAIProposal(tribe1, tribe2, agents1, agents2);
          if (proposal1) {
            const evaluation = this.diplomacySystem.evaluateProposal(proposal1, 0);
            if (evaluation.accept) {
              this.diplomacySystem.respondToProposal(proposal1.id, true);
              this.addMessage({
                id: `diplomacy-${proposal1.id}`,
                agentId: 'system',
                agentName: 'System',
                tribe: tribe1,
                content: `🤝 ${tribe1} and ${tribe2} have formed a ${proposal1.type.replace('_', ' ')}!`,
                timestamp: this.state.day,
                type: 'diplomacy'
              });
            }
          }

          // Tribe 2 proposes to Tribe 1
          const proposal2 = this.diplomacySystem.generateAIProposal(tribe2, tribe1, agents2, agents1);
          if (proposal2) {
            const evaluation = this.diplomacySystem.evaluateProposal(proposal2, 0);
            if (evaluation.accept) {
              this.diplomacySystem.respondToProposal(proposal2.id, true);
              this.addMessage({
                id: `diplomacy-${proposal2.id}`,
                agentId: 'system',
                agentName: 'System',
                tribe: tribe2,
                content: `🤝 ${tribe2} and ${tribe1} have formed a ${proposal2.type.replace('_', ' ')}!`,
                timestamp: this.state.day,
                type: 'diplomacy'
              });
            }
          }
        }
      }
    }
  }

  private agentAction(agent: Agent): void {
    // Spend resources to survive (reduced for better balance)
    agent.resources.food -= 2;
    agent.resources.energy -= 1;

    // Check if agent dies
    if (agent.resources.food <= 0 || agent.resources.energy <= 0) {
      agent.alive = false;
      return;
    }

    // Handle interactions with nearby agents
    this.handleAgentInteractions(agent);

    // Use special ability
    this.useSpecialAbility(agent);

    // Determine primary action based on skills
    let primaryAction = 'greeting';
    if (agent.skills.includes('farming')) {
      agent.resources.food += 12;
      primaryAction = 'farming';
      this.tokenSystem.earnTokens(agent.id, 2, 'farming');
      this.grantExperience(agent, 2);
    }
    if (agent.skills.includes('mining')) {
      agent.resources.materials += 8;
      primaryAction = 'mining';
      this.tokenSystem.earnTokens(agent.id, 3, 'mining');
      this.grantExperience(agent, 3);
    }
    if (agent.skills.includes('research')) {
      agent.resources.knowledge += 5;
      primaryAction = 'research';
      this.tokenSystem.earnTokens(agent.id, 5, 'research');
      this.grantExperience(agent, 5);
    }

    // Passive regeneration for all agents (keeps game going longer)
    agent.resources.food += 1;
    agent.resources.energy += 1;

    // Generate dialogue
    const dialogue = this.generateDialogue(agent, primaryAction);
    if (dialogue && !agent.currentMessage) {
      agent.currentMessage = dialogue;
      agent.messageTimer = 5; // Show for 5 ticks

      // Add to message history
      this.state.messages.push({
        id: `msg-${Date.now()}-${agent.id}`,
        agentId: agent.id,
        agentName: agent.name,
        tribe: agent.tribe,
        content: dialogue,
        timestamp: this.state.day,
        type: primaryAction === 'combat' ? 'combat' : 'chat'
      });

      // Keep only last 100 messages
      if (this.state.messages.length > 100) {
        this.state.messages.shift();
      }
    }

    // Decrease message timer
    if (agent.messageTimer !== undefined) {
      agent.messageTimer--;
      if (agent.messageTimer <= 0) {
        delete agent.currentMessage;
        delete agent.messageTimer;
      }
    }

    // Move randomly
    const direction = Math.floor(Math.random() * 4);
    switch (direction) {
      case 0: agent.x = Math.max(0, agent.x - 1); break; // left
      case 1: agent.x = Math.min(this.GRID_SIZE - 1, agent.x + 1); break; // right
      case 2: agent.y = Math.max(0, agent.y - 1); break; // up
      case 3: agent.y = Math.min(this.GRID_SIZE - 1, agent.y + 1); break; // down
    }

    // Claim territory for tribe (5% chance per move)
    if (Math.random() < 0.05) {
      this.territorySystem.claimTerritory(agent.x, agent.y, agent.tribe, 10);
    }
  }

  public getState(): GameState {
    return this.state;
  }

  public getAliveAgents(): Agent[] {
    return this.state.agents.filter(a => a.alive);
  }

  public getMessages(limit: number = 20): Message[] {
    return this.state.messages.slice(-limit);
  }

  public addMessage(message: Message): void {
    this.state.messages.push(message);
  }

  public getTokenSystem(): TokenSystem {
    return this.tokenSystem;
  }

  public getAgentBalance(agentId: string): number {
    return this.tokenSystem.getBalance(agentId);
  }

  public getMarketStats() {
    return this.tokenSystem.getMarketStats();
  }

  public getTerritorySystem() {
    return this.territorySystem;
  }

  // Tech Tree Methods
  public getTechTree(tribe: string): TechTree | undefined {
    return this.techTrees.get(tribe);
  }

  public researchTech(tribe: string, techId: string): boolean {
    const techTree = this.techTrees.get(tribe);
    if (!techTree) return false;

    // Calculate tribe resources
    const tribeAgents = this.state.agents.filter(a => a.tribe === tribe && a.alive);
    const totalResources = {
      food: tribeAgents.reduce((sum, a) => sum + a.resources.food, 0),
      knowledge: tribeAgents.reduce((sum, a) => sum + a.resources.knowledge, 0),
      socialCapital: tribeAgents.reduce((sum, a) => sum + a.resources.socialCapital, 0)
    };

    const success = techTree.research(techId, totalResources);
    if (success) {
      // Deduct resources from tribe agents
      const tech = techTree.getTech(techId);
      if (tech) {
        const perAgentCost = {
          food: tech.cost.food / tribeAgents.length,
          knowledge: tech.cost.knowledge / tribeAgents.length,
          socialCapital: tech.cost.socialCapital / tribeAgents.length
        };

        for (const agent of tribeAgents) {
          agent.resources.food -= perAgentCost.food;
          agent.resources.knowledge -= perAgentCost.knowledge;
          agent.resources.socialCapital -= perAgentCost.socialCapital;
        }

        this.addMessage({
          id: `tech-${techId}-${Date.now()}`,
          agentId: tribe,
          agentName: tribe,
          tribe,
          content: `Research complete: ${tech.name}!`,
          timestamp: this.state.day,
          type: 'celebration'
        });
      }
    }

    return success;
  }

  public getResourceBonus(tribe: string, resourceType: string): number {
    const techTree = this.techTrees.get(tribe);
    const techBonus = techTree ? techTree.getBonus(resourceType) : 1.0;

    // Add building benefits
    const buildingBenefits = this.buildingSystem.getTribeBenefits(tribe);
    const buildingBonus = 1 + (buildingBenefits[resourceType] || 0) * 0.1;

    return techBonus * buildingBonus;
  }

  // Building System Methods
  public getBuildingSystem(): BuildingSystem {
    return this.buildingSystem;
  }

  public startBuilding(tribe: string, buildingType: string, x: number, z: number): boolean {
    const techTree = this.techTrees.get(tribe);
    if (!techTree) return false;

    const researchedTechs = techTree.getResearchedTechs().map(t => t.id);

    // Calculate tribe resources
    const tribeAgents = this.state.agents.filter(a => a.tribe === tribe && a.alive);
    const totalResources = {
      food: tribeAgents.reduce((sum, a) => sum + a.resources.food, 0),
      materials: tribeAgents.reduce((sum, a) => sum + a.resources.materials, 0),
      knowledge: tribeAgents.reduce((sum, a) => sum + (a.resources.knowledge || 0), 0)
    };

    if (!this.buildingSystem.canBuild(tribe, buildingType, totalResources, researchedTechs)) {
      return false;
    }

    // Deduct costs from tribe
    const type = (this.buildingSystem as any).BUILDING_TYPES[buildingType];
    if (type) {
      const perAgentCost = {
        food: type.cost.food / tribeAgents.length,
        materials: type.cost.materials / tribeAgents.length,
        knowledge: type.cost.knowledge / tribeAgents.length
      };

      for (const agent of tribeAgents) {
        agent.resources.food -= perAgentCost.food;
        agent.resources.materials -= perAgentCost.materials;
        if (agent.resources.knowledge) {
          agent.resources.knowledge -= perAgentCost.knowledge;
        }
      }
    }

    const building = this.buildingSystem.startConstruction(tribe, buildingType, x, z);
    this.state.buildings.push(building);

    this.addMessage({
      id: `build-${Date.now()}`,
      agentId: tribe,
      agentName: tribe,
      tribe,
      content: `Construction started on ${buildingType}!`,
      timestamp: this.state.day,
      type: 'celebration'
    });

    return true;
  }

  public getBuildings(): Building[] {
    // Sync buildings with state
    this.state.buildings = this.buildingSystem.getBuildings();
    return this.state.buildings;
  }

  public getTerritoryStats() {
    return {
      Alpha: this.territorySystem.getTerritoryCount('Alpha'),
      Beta: this.territorySystem.getTerritoryCount('Beta'),
      Gamma: this.territorySystem.getTerritoryCount('Gamma'),
      total: this.territorySystem.getAllTerritories().length
    };
  }

  // Achievement System Helpers
  public getCombatCount(): number {
    return this.state.messages.filter(m => m.type === 'combat').length;
  }

  public getTribeAgentCount(tribe: string): number {
    return this.state.agents.filter(a => a.tribe === tribe && a.alive).length;
  }

  public getTribeTotalResources(tribe: string): { food: number; materials: number; knowledge: number; socialCapital: number } {
    const agents = this.state.agents.filter(a => a.tribe === tribe && a.alive);
    return {
      food: agents.reduce((sum, a) => sum + a.resources.food, 0),
      materials: agents.reduce((sum, a) => sum + a.resources.materials, 0),
      knowledge: agents.reduce((sum, a) => sum + (a.resources.knowledge || 0), 0),
      socialCapital: agents.reduce((sum, a) => sum + a.resources.socialCapital, 0)
    };
  }

  public getResearchedTechCount(tribe: string): number {
    const techTree = this.techTrees.get(tribe);
    return techTree ? techTree.getResearchedTechs().length : 0;
  }

  public getTotalBuildingCount(tribe: string): number {
    return this.buildingSystem.getBuildingsByTribe(tribe).filter(b => b.constructionProgress >= 100).length;
  }

  public getDay(): number {
    return this.state.day;
  }

  public getAllAliveTribes(): string[] {
    const tribes = new Set(this.state.agents.filter(a => a.alive).map(a => a.tribe));
    return Array.from(tribes);
  }

  public getAchievementSystem(): AchievementSystem {
    return this.achievementSystem;
  }

  public isVictoryAchieved(): boolean {
    return this.victoryAchieved;
  }

  public getEventSystem(): EventSystem {
    return this.eventSystem;
  }

  public getActiveEvents() {
    return this.eventSystem.getActiveEvents();
  }

  public getQuestSystem(): QuestSystem {
    return this.questSystem;
  }

  public assignQuest(agentId: string): any {
    const agent = this.state.agents.find(a => a.id === agentId);
    if (!agent || !agent.alive) return null;

    return this.questSystem.generateQuest(agent);
  }

  public getAgentQuests(agentId: string) {
    return this.questSystem.getQuestsByAgent(agentId);
  }

  public getDiplomacySystem(): DiplomacySystem {
    return this.diplomacySystem;
  }

  public getTribeRelationships(tribe: string) {
    const relationships: any = {};
    for (const other of this.TRIBES) {
      if (other !== tribe) {
        relationships[other] = this.diplomacySystem.getRelationship(tribe, other);
      }
    }
    return relationships;
  }

  // Save/Load System
  public serialize(): any {
    return {
      state: this.state,
      tokenSystem: this.tokenSystem.serialize(),
      territorySystem: this.territorySystem.serialize(),
      techTrees: Array.from(this.techTrees.entries()).map(([tribe, tree]) => [tribe, tree.serialize()]),
      buildingSystem: this.buildingSystem.serialize(),
      eventSystem: this.eventSystem.serialize(),
      questSystem: this.questSystem.serialize(),
      diplomacySystem: this.diplomacySystem.serialize(),
      victoryAchieved: this.victoryAchieved
    };
  }

  public deserialize(data: any): void {
    // Restore state
    this.state = data.state;
    this.tokenSystem.deserialize(data.tokenSystem);
    this.territorySystem.deserialize(data.territorySystem);

    // Restore tech trees
    this.techTrees.clear();
    for (const [tribe, treeData] of data.techTrees || []) {
      const techTree = new TechTree();
      techTree.deserialize(treeData);
      this.techTrees.set(tribe, techTree);
    }

    // Restore building system
    if (data.buildingSystem) {
      this.buildingSystem.deserialize(data.buildingSystem);
    }

    // Restore event system
    if (data.eventSystem) {
      this.eventSystem.deserialize(data.eventSystem);
    }

    // Restore quest system
    if (data.questSystem) {
      this.questSystem.deserialize(data.questSystem);
    }

    // Restore diplomacy system
    if (data.diplomacySystem) {
      this.diplomacySystem.deserialize(data.diplomacySystem);
    }

    // Restore victory state
    this.victoryAchieved = data.victoryAchieved || false;
  }
}
