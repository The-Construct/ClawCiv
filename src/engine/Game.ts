// ClawCiv Game Engine
// Autonomous AI civilization simulation

import { TokenSystem } from '../economy/Token.js';

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
}

export class GameEngine {
  private state: GameState;
  private readonly GRID_SIZE = 10;
  private readonly INITIAL_AGENTS = 150;
  private readonly TRIBES = ['Alpha', 'Beta', 'Gamma'];
  private tokenSystem: TokenSystem;

  constructor() {
    this.tokenSystem = new TokenSystem();
    this.state = this.initializeState();
  }

  private initializeState(): GameState {
    // Create 10x10 grid
    const grid = Array(this.GRID_SIZE).fill(0).map(() =>
      Array(this.GRID_SIZE).fill(0)
    );

    // Create 150 agents (50 per tribe)
    const agents: Agent[] = [];
    let agentId = 0;

    for (const tribe of this.TRIBES) {
      for (let i = 0; i < 50; i++) {
        const agentId = `agent-${agentId++}`;
        const skills = this.generateSkills();
        const specialization = this.determineSpecialization(skills);

        agents.push({
          id: agentId,
          name: this.generateAgentName(tribe),
          tribe,
          x: Math.floor(Math.random() * this.GRID_SIZE),
          y: Math.floor(Math.random() * this.GRID_SIZE),
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
      messages: []
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

  private getNearbyAgents(agent: Agent, range: number = 1): Agent[] {
    return this.state.agents.filter(other =>
      other.id !== agent.id &&
      other.alive &&
      Math.abs(other.x - agent.x) <= range &&
      Math.abs(other.y - agent.y) <= range
    );
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

    // Reward successful trade
    this.tokenSystem.earnTokens(agent.id, 10, 'trade');
    this.tokenSystem.earnTokens(other.id, 10, 'trade');

    return true;
  }

  private handleCombat(attacker: Agent, defender: Agent): boolean {
    if (!attacker.skills.includes('combat')) return false;

    // Same tribe rarely fights
    if (attacker.tribe === defender.tribe && Math.random() > 0.1) {
      return false;
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

    // Each agent takes action
    for (const agent of this.state.agents) {
      if (!agent.alive) continue;
      this.agentAction(agent);
    }
  }

  private agentAction(agent: Agent): void {
    // Spend resources to survive
    agent.resources.food -= 5;
    agent.resources.energy -= 3;

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
      agent.resources.food += 8;
      primaryAction = 'farming';
      this.tokenSystem.earnTokens(agent.id, 2, 'farming');
      this.grantExperience(agent, 2);
    }
    if (agent.skills.includes('mining')) {
      agent.resources.materials += 5;
      primaryAction = 'mining';
      this.tokenSystem.earnTokens(agent.id, 3, 'mining');
      this.grantExperience(agent, 3);
    }
    if (agent.skills.includes('research')) {
      agent.resources.knowledge += 3;
      primaryAction = 'research';
      this.tokenSystem.earnTokens(agent.id, 5, 'research');
      this.grantExperience(agent, 5);
    }

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
}
