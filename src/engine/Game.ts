// ClawCiv Game Engine
// Autonomous AI civilization simulation

export interface Message {
  id: string;
  agentId: string;
  agentName: string;
  tribe: string;
  content: string;
  timestamp: number;
  type: 'chat' | 'trade' | 'diplomacy' | 'combat' | 'celebration';
}

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
  alive: boolean;
  currentMessage?: string;
  messageTimer?: number;
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

  constructor() {
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
        agents.push({
          id: `agent-${agentId++}`,
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
          skills: this.generateSkills(),
          alive: true
        });
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

    // Determine primary action based on skills
    let primaryAction = 'greeting';
    if (agent.skills.includes('farming')) {
      agent.resources.food += 8;
      primaryAction = 'farming';
    }
    if (agent.skills.includes('mining')) {
      agent.resources.materials += 5;
      primaryAction = 'mining';
    }
    if (agent.skills.includes('research')) {
      agent.resources.knowledge += 3;
      primaryAction = 'research';
    }

    // Generate dialogue
    const dialogue = this.generateDialogue(agent, primaryAction);
    if (dialogue) {
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
}
