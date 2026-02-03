// Quest/Mission System for ClawCiv
// Agents can be assigned missions to complete for rewards

export type QuestType = 'gather' | 'combat' | 'research' | 'build' | 'explore' | 'trade' | 'diplomacy' | 'hunting' | 'rescue' | 'escort';
export type QuestDifficulty = 'trivial' | 'easy' | 'normal' | 'hard' | 'extreme' | 'legendary';
export type QuestStatus = 'available' | 'active' | 'completed' | 'failed' | 'abandoned' | 'expired';

export interface QuestObjective {
  id: string;
  description: string;
  type: 'collect' | 'build' | 'talk_to' | 'defeat' | 'explore' | 'research' | 'trade' | 'reach';
  target: string | number;
  current: number;
  required: number;
  unit?: string;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  type: QuestType;
  difficulty: QuestDifficulty;
  icon: string;
  rewards: {
    tokens?: number;
    experience?: number;
    resources?: { food?: number; energy?: number; materials?: number; knowledge?: number; socialCapital?: number; };
    items?: string[];
    reputation?: number;
  };
  requirements: {
    targetAgentId?: string;
    targetAmount?: number;
    targetResource?: string;
    targetLocation?: { x: number; y: number };
    targetTech?: string;
    targetTribe?: string;
    minLevel?: number;
    requiredSkills?: string[];
  };
  objectives: QuestObjective[];
  currentObjectiveIndex: number;
  progress: number; // 0-100
  maxProgress: number;
  assignedAgentId: string;
  status: QuestStatus;
  timeLimit?: number; // In days
  startTime: number;
  dayAccepted?: number;
  dayCompleted?: number;
  failures: number;
  maxFailures: number;
  // Advanced features
  isChainQuest: boolean;
  chainId?: string;
  chainOrder?: number;
  nextQuestId?: string;
  previousQuestId?: string;
  isHeroQuest: boolean;
  isDailyQuest: boolean;
  tags: string[];
}

export class QuestSystem {
  private quests: Map<string, Quest> = new Map();
  private questIdCounter = 0;
  private questChains: Map<string, Quest[]> = new Map();
  private activeQuests: Map<string, string> = new Map(); // agentId -> questId
  private questHistory: Map<string, string[]> = new Map(); // agentId -> completed questIds
  private dailyQuests: Map<string, Quest> = new Map(); // tribe -> daily quest
  private lastDailyReset: number = 0;

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
      },
      // NEW: Hunting quest
      {
        type: 'hunting' as const,
        difficulty: 'normal' as const,
        name: 'Hunting Expedition',
        description: 'Hunt wildlife to gather food',
        icon: '🏹',
        canAssign: (a: any) => a.skills.includes('combat'),
        generateRequirements: (a: any) => ({
          targetAmount: 3 + Math.floor(Math.random() * 5)
        }),
        rewards: { tokens: 40, experience: 45, resources: { food: 30 } }
      },
      // NEW: Rescue quest
      {
        type: 'rescue' as const,
        difficulty: 'hard' as const,
        name: 'Rescue Mission',
        description: 'Rescue a captured ally',
        icon: '🆘',
        canAssign: (a: any) => a.skills.includes('combat') && a.level >= 5,
        generateRequirements: (a: any) => ({
          targetAgentId: null // Will be set by game engine
        }),
        rewards: { tokens: 75, experience: 100, reputation: 20 }
      }
    ];

    // Filter available quest types based on agent skills
    const availableTypes = questTypes.filter(t => t.canAssign(agent));
    if (availableTypes.length === 0) return null;

    // Randomly select a quest type
    const selectedType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    const requirements = selectedType.generateRequirements(agent);

    // Determine if this should be a hero quest (legendary difficulty)
    const isHeroQuest = agent.level >= 10 && Math.random() < 0.1;

    // Generate quest details
    const questDetails = this.generateQuestDetails(selectedType, agent, requirements, isHeroQuest);

    // Generate objectives
    const objectives = this.generateObjectives(selectedType, requirements, questDetails);

    // Generate rewards
    const rewards = this.generateQuestRewards(selectedType, isHeroQuest);

    // Generate time limit based on difficulty
    const timeLimits = { trivial: 30, easy: 50, normal: 75, hard: 100, extreme: 150, legendary: 200 };
    const timeLimit = timeLimits[selectedType.difficulty];

    const quest: Quest = {
      id: `quest-${this.questIdCounter++}-${Date.now()}`,
      name: questDetails.name,
      description: questDetails.description,
      type: selectedType.type,
      difficulty: isHeroQuest ? 'legendary' : selectedType.difficulty,
      icon: selectedType.icon,
      rewards,
      requirements: {
        ...requirements,
        targetLocation: {
          x: Math.floor(Math.random() * 10),
          y: Math.floor(Math.random() * 10)
        },
        minLevel: isHeroQuest ? 10 : undefined,
        requiredSkills: selectedType.canAssign(agent) ? [agent.skills.find((s: string) => selectedType.canAssign({ skills: [s] }))] : undefined
      },
      objectives,
      currentObjectiveIndex: 0,
      progress: 0,
      maxProgress: objectives.reduce((sum, obj) => sum + obj.required, 0),
      assignedAgentId: agent.id,
      status: 'active',
      timeLimit,
      startTime: Date.now(),
      failures: 0,
      maxFailures: this.getMaxFailures(isHeroQuest ? 'legendary' : selectedType.difficulty),
      isChainQuest: false,
      isHeroQuest,
      isDailyQuest: false,
      tags: this.generateQuestTags(selectedType.type, isHeroQuest ? 'legendary' : selectedType.difficulty)
    };

    this.quests.set(quest.id, quest);
    this.activeQuests.set(agent.id, quest.id);
    return quest;
  }

  private generateQuestDetails(type: any, agent: any, requirements: any, isHeroQuest: boolean): any {
    const details: any = {};

    switch (type.type) {
      case 'gather':
        details.name = `${this.getResourceName(requirements.targetResource)} Gathering`;
        details.description = `部落需要${requirements.targetAmount}个${this.getResourceName(requirements.targetResource)}。请前往收集并提交。`;
        break;
      case 'combat':
        details.name = isHeroQuest ? '英雄征伐' : '战斗任务';
        details.description = isHeroQuest ? `传奇的战斗任务：击败来自${requirements.targetTribe}的敌人！` : `击败来自${requirements.targetTribe}的敌人。`;
        break;
      case 'hunting':
        details.name = '狩猎远征';
        details.description = `前往野外狩猎野生动物，获取${requirements.targetAmount * 10}个食物。`;
        break;
      case 'rescue':
        details.name = '救援行动';
        details.description = '一名盟友被敌人困住了。前往救援他们！';
        break;
      default:
        details.name = type.name;
        details.description = type.description;
    }

    return details;
  }

  private generateObjectives(type: any, requirements: any, questDetails: any): QuestObjective[] {
    const objectives: QuestObjective[] = [];

    switch (type.type) {
      case 'gather':
      case 'research':
        objectives.push({
          id: `obj-${Date.now()}-1`,
          description: `收集/生产${requirements.targetAmount}个${this.getResourceName(requirements.targetResource)}`,
          type: 'collect',
          target: requirements.targetResource,
          current: 0,
          required: requirements.targetAmount,
          unit: 'resource'
        });
        break;

      case 'build':
        objectives.push({
          id: `obj-${Date.now()}-1`,
          description: '建造建筑',
          type: 'build',
          target: requirements.targetResource,
          current: 0,
          required: requirements.targetAmount,
          unit: 'materials'
        });
        break;

      case 'explore':
        objectives.push({
          id: `obj-${Date.now()}-1`,
          description: `探索${requirements.targetAmount}个新区域`,
          type: 'explore',
          target: requirements.targetAmount,
          current: 0,
          required: requirements.targetAmount,
          unit: 'territory'
        });
        break;

      case 'trade':
        objectives.push({
          id: `obj-${Date.now()}-1`,
          description: `完成${requirements.targetAmount}次交易`,
          type: 'trade',
          target: requirements.targetAmount,
          current: 0,
          required: requirements.targetAmount,
          unit: 'trade'
        });
        break;

      case 'diplomacy':
        objectives.push({
          id: `obj-${Date.now()}-1`,
          description: `建立${requirements.targetAmount}个外交关系`,
          type: 'talk_to',
          target: requirements.targetAmount,
          current: 0,
          required: requirements.targetAmount,
          unit: 'alliance'
        });
        break;

      case 'combat':
      case 'hunting':
        objectives.push({
          id: `obj-${Date.now()}-1`,
          description: type.type === 'hunting' ? '击败野兽' : '击败敌人',
          type: 'defeat',
          target: requirements.targetAmount,
          current: 0,
          required: requirements.targetAmount,
          unit: 'enemy'
        });
        break;

      case 'rescue':
        objectives.push({
          id: `obj-${Date.now()}-1`,
          description: '营救盟友',
          type: 'reach',
          target: 1,
          current: 0,
          required: 1,
          unit: 'agent'
        });
        objectives.push({
          id: `obj-${Date.now()}-2`,
          description: '返回基地',
          type: 'reach',
          target: 1,
          current: 0,
          required: 1,
          unit: 'base'
        });
        break;
    }

    return objectives;
  }

  private generateQuestRewards(type: any, isHeroQuest: boolean): any {
    const multiplier = isHeroQuest ? 5 : 1;
    const baseRewards = type.rewards;

    const rewards: any = {
      tokens: Math.floor((baseRewards.tokens || 25) * multiplier),
      experience: Math.floor((baseRewards.experience || 30) * multiplier)
    };

    if (baseRewards.resources) {
      rewards.resources = {};
      for (const [key, value] of Object.entries(baseRewards.resources)) {
        rewards.resources[key] = Math.floor(value * multiplier);
      }
    }

    if (isHeroQuest) {
      rewards.reputation = 50;
      rewards.items = ['rare_equipment'];
    }

    return rewards;
  }

  private getMaxFailures(difficulty: QuestDifficulty): number {
    switch (difficulty) {
      case 'trivial': return 5;
      case 'easy': return 4;
      case 'normal': return 3;
      case 'hard': return 2;
      case 'extreme': return 1;
      case 'legendary': return 0;
      default: return 3;
    }
  }

  private getResourceName(resource: string): string {
    const names: { [key: string]: string } = {
      food: '食物',
      materials: '材料',
      energy: '能量',
      knowledge: '知识'
    };
    return names[resource] || resource;
  }

  private generateQuestTags(type: QuestType, difficulty: QuestDifficulty): string[] {
    const tags: string[] = [type];

    if (difficulty === 'legendary') tags.push('hero', 'epic');
    if (difficulty === 'extreme') tags.push('dangerous');
    if (difficulty === 'trivial') tags.push('tutorial');

    return tags;
  }

  // Generate daily quest for a tribe
  generateDailyQuest(tribe: string, currentDay: number): Quest | null {
    // Reset daily quests every 7 days
    if (currentDay - this.lastDailyReset >= 7) {
      this.dailyQuests.clear();
      this.lastDailyReset = currentDay;
    }

    // Check if tribe already has a daily quest
    if (this.dailyQuests.has(tribe)) {
      return this.dailyQuests.get(tribe)!;
    }

    // Generate a simple daily quest
    const dailyQuestTypes: QuestType[] = ['gather', 'explore'];
    const selectedType = dailyQuestTypes[Math.floor(Math.random() * dailyQuestTypes.length)];

    const quest: Quest = {
      id: `daily-${this.questIdCounter++}-${Date.now()}`,
      name: `日常任务：${selectedType === 'gather' ? '资源收集' : '领土探索'}`,
      description: selectedType === 'gather' ? '为部落收集基本资源。' : '探索周边区域，扩大领地。',
      type: selectedType,
      difficulty: 'easy',
      icon: selectedType === 'gather' ? '📦' : '🗺️',
      rewards: {
        tokens: 15,
        experience: 20
      },
      requirements: {
        targetResource: 'food',
        targetAmount: selectedType === 'explore' ? 2 : 25
      },
      objectives: [{
        id: `obj-${Date.now()}-1`,
        description: selectedType === 'gather' ? '收集25个食物' : '探索2个区域',
        type: selectedType === 'gather' ? 'collect' : 'explore',
        target: selectedType === 'gather' ? 'food' : 2,
        current: 0,
        required: selectedType === 'gather' ? 25 : 2,
        unit: selectedType === 'gather' ? 'resource' : 'territory'
      }],
      currentObjectiveIndex: 0,
      progress: 0,
      maxProgress: selectedType === 'gather' ? 25 : 2,
      assignedAgentId: '', // Available to any agent
      status: 'available',
      timeLimit: 7, // 7 days to complete daily quest
      startTime: Date.now(),
      failures: 0,
      maxFailures: 3,
      isChainQuest: false,
      isHeroQuest: false,
      isDailyQuest: true,
      tags: ['daily', 'easy']
    };

    this.quests.set(quest.id, quest);
    this.dailyQuests.set(tribe, quest);
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
