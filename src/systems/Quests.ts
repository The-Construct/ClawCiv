// Quest/Mission System for ClawCiv
// Agents can be assigned missions to complete for rewards

export interface Quest {
  id: string;
  name: string;
  description: string;
  type: 'gather' | 'combat' | 'research' | 'build' | 'explore' | 'trade' | 'diplomacy';
  difficulty: 'easy' | 'medium' | 'hard';
  icon: string;
  rewards: {
    tokens?: number;
    experience?: number;
    resources?: { food?: number; energy?: number; materials?: number; knowledge?: number; socialCapital?: number; };
  };
  requirements: {
    targetAgentId?: string;
    targetAmount?: number;
    targetResource?: string;
    targetLocation?: { x: number; y: number };
    targetTech?: string;
    targetTribe?: string;
  };
  progress: number;
  maxProgress: number;
  assignedAgentId: string;
  status: 'active' | 'completed' | 'failed' | 'abandoned';
  timeLimit?: number; // In days
  startTime: number;
}

export class QuestSystem {
  private quests: Map<string, Quest> = new Map();
  private questIdCounter = 0;

  generateQuest(agent: any): Quest | null {
    // Quests have specific requirements based on agent skills and tribe
    if (!agent.alive) return null;

    const questTypes = [
      {
        type: 'gather' as const,
        difficulty: 'easy' as const,
        name: 'Resource Gathering',
        description: 'Gather resources for the tribe',
        icon: '📦',
        canAssign: (a: any) => a.skills.includes('farming') || a.skills.includes('mining'),
        generateRequirements: (a: any) => ({
          targetResource: Math.random() > 0.5 ? 'food' : 'materials',
          targetAmount: 50 + Math.floor(Math.random() * 100)
        }),
        rewards: { tokens: 25, experience: 30 }
      },
      {
        type: 'combat' as const,
        difficulty: 'medium' as const,
        name: 'Eliminate Target',
        description: 'Eliminate an enemy agent',
        icon: '⚔️',
        canAssign: (a: any) => a.skills.includes('combat'),
        generateRequirements: (a: any) => ({
          targetAgentId: null, // Will be set by game engine
          targetTribe: a.tribe === 'Alpha' ? 'Beta' : a.tribe === 'Beta' ? 'Gamma' : 'Alpha'
        }),
        rewards: { tokens: 50, experience: 75 }
      },
      {
        type: 'research' as const,
        difficulty: 'easy' as const,
        name: 'Study Knowledge',
        description: 'Conduct research for the tribe',
        icon: '📚',
        canAssign: (a: any) => a.skills.includes('research'),
        generateRequirements: (a: any) => ({
          targetResource: 'knowledge',
          targetAmount: 30 + Math.floor(Math.random() * 50)
        }),
        rewards: { tokens: 35, experience: 50, resources: { knowledge: 20 } }
      },
      {
        type: 'build' as const,
        difficulty: 'medium' as const,
        name: 'Construction Project',
        description: 'Gather materials for construction',
        icon: '🔨',
        canAssign: (a: any) => a.skills.includes('building'),
        generateRequirements: (a: any) => ({
          targetResource: 'materials',
          targetAmount: 80 + Math.floor(Math.random() * 120)
        }),
        rewards: { tokens: 40, experience: 60 }
      },
      {
        type: 'explore' as const,
        difficulty: 'easy' as const,
        name: 'Explore Territory',
        description: 'Explore and claim new lands',
        icon: '🗺️',
        canAssign: (a: any) => a.skills.includes('trade') || a.skills.includes('diplomacy'),
        generateRequirements: (a: any) => ({
          targetAmount: 3 + Math.floor(Math.random() * 5) // Territories to claim
        }),
        rewards: { tokens: 30, experience: 40, resources: { socialCapital: 15 } }
      },
      {
        type: 'trade' as const,
        difficulty: 'medium' as const,
        name: 'Trade Mission',
        description: 'Complete profitable trades',
        icon: '💰',
        canAssign: (a: any) => a.skills.includes('trade'),
        generateRequirements: (a: any) => ({
          targetAmount: 2 + Math.floor(Math.random() * 3) // Trades to complete
        }),
        rewards: { tokens: 45, experience: 50, resources: { socialCapital: 25 } }
      },
      {
        type: 'diplomacy' as const,
        difficulty: 'hard' as const,
        name: 'Diplomatic Mission',
        description: 'Form alliances with other agents',
        icon: '🤝',
        canAssign: (a: any) => a.skills.includes('diplomacy'),
        generateRequirements: (a: any) => ({
          targetAmount: 2 + Math.floor(Math.random() * 2) // Alliances to form
        }),
        rewards: { tokens: 60, experience: 80, resources: { socialCapital: 40 } }
      }
    ];

    // Filter available quest types based on agent skills
    const availableTypes = questTypes.filter(t => t.canAssign(agent));
    if (availableTypes.length === 0) return null;

    // Randomly select a quest type
    const selectedType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    const requirements = selectedType.generateRequirements(agent);

    // Generate time limit based on difficulty
    const timeLimits = { easy: 50, medium: 75, hard: 100 };
    const timeLimit = timeLimits[selectedType.difficulty];

    const quest: Quest = {
      id: `quest-${this.questIdCounter++}-${Date.now()}`,
      name: selectedType.name,
      description: selectedType.description,
      type: selectedType.type,
      difficulty: selectedType.difficulty,
      icon: selectedType.icon,
      rewards: selectedType.rewards,
      requirements: {
        ...requirements,
        targetLocation: {
          x: Math.floor(Math.random() * 10),
          y: Math.floor(Math.random() * 10)
        }
      },
      progress: 0,
      maxProgress: requirements.targetAmount || 1,
      assignedAgentId: agent.id,
      status: 'active',
      timeLimit,
      startTime: Date.now()
    };

    this.quests.set(quest.id, quest);
    return quest;
  }

  getQuest(questId: string): Quest | undefined {
    return this.quests.get(questId);
  }

  getQuestsByAgent(agentId: string): Quest[] {
    return Array.from(this.quests.values()).filter(q => q.assignedAgentId === agentId);
  }

  getActiveQuests(): Quest[] {
    return Array.from(this.quests.values()).filter(q => q.status === 'active');
  }

  updateQuest(questId: string, progressIncrease: number): boolean {
    const quest = this.quests.get(questId);
    if (!quest || quest.status !== 'active') return false;

    quest.progress += progressIncrease;

    if (quest.progress >= quest.maxProgress) {
      quest.status = 'completed';
      return true; // Quest completed
    }

    return false;
  }

  completeQuest(questId: string): Quest | undefined {
    const quest = this.quests.get(questId);
    if (!quest) return undefined;

    quest.status = 'completed';
    return quest;
  }

  failQuest(questId: string): void {
    const quest = this.quests.get(questId);
    if (!quest) return;

    quest.status = 'failed';
  }

  abandonQuest(questId: string): void {
    const quest = this.quests.get(questId);
    if (!quest) return;

    quest.status = 'abandoned';
  }

  checkQuestExpirations(currentDay: number): Quest[] {
    const expired: Quest[] = [];

    for (const quest of this.quests.values()) {
      if (quest.status === 'active' && quest.timeLimit) {
        const ageInDays = currentDay - quest.startTime;
        if (ageInDays > quest.timeLimit) {
          quest.status = 'failed';
          expired.push(quest);
        }
      }
    }

    return expired;
  }

  cleanupOldQuests(maxAge: number = 500): void {
    const now = Date.now();
    for (const [id, quest] of this.quests) {
      const age = now - quest.startTime;
      if (age > maxAge && quest.status !== 'active') {
        this.quests.delete(id);
      }
    }
  }

  public serialize(): any {
    return {
      quests: Array.from(this.quests.entries()),
      questIdCounter: this.questIdCounter
    };
  }

  public deserialize(data: any): void {
    this.quests = new Map(data.quests || []);
    this.questIdCounter = data.questIdCounter || 0;
  }
}
