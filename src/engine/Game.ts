// Genesis Game Engine
// Autonomous AI civilization simulation

export interface Agent {
  id: string;
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
}

export interface GameState {
  agents: Agent[];
  grid: number[][];
  day: number;
  territories: Map<string, number[][]>;
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
      territories: new Map()
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

    // Agent takes action based on skills
    if (agent.skills.includes('farming')) {
      agent.resources.food += 8;
    }
    if (agent.skills.includes('mining')) {
      agent.resources.materials += 5;
    }
    if (agent.skills.includes('research')) {
      agent.resources.knowledge += 3;
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
}
