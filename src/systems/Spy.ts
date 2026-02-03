// Spy/Intelligence System for ClawCiv
// Agents can conduct espionage, steal technology, sabotage, and gather intelligence

export interface SpyMission {
  id: string;
  type: 'steal_tech' | 'sabotage_building' | 'gather_intel' | 'assassinate' | 'disinformation' | 'counter_spy';
  spyId: string;
  targetTribe: string;
  targetId?: string; // Specific target for assassination/sabotage
  status: 'pending' | 'in_progress' | 'success' | 'failed' | 'detained';
  progress: number; // 0-100
  risk: number; // 0-100, chance of detection
  reward: number; // Experience/tokens on success
  startDay: number;
  duration: number; // Days to complete
  result?: any;
}

export interface IntelligenceReport {
  id: string;
  tribe: string;
  sourceTribe: string;
  targetTribe: string;
  intelType: 'resources' | 'technology' | 'military' | 'plans' | 'spies';
  data: any;
  accuracy: number; // 0-100
  timestamp: number;
  day: number;
}

export interface Spy {
  agentId: string;
  tribe: string;
  coverRole: 'merchant' | 'diplomat' | 'refugee' | 'trader' | 'scholar';
  isInfiltrated: boolean;
  infiltratedTribe: string;
  coverBlown: boolean;
  missionsCompleted: number;
  missionsFailed: number;
  totalIntelGathered: number;
  detectionChance: number; // Base chance of being detected
  skillLevel: number; // 1-10, increases with experience
}

export class SpySystem {
  private spies: Map<string, Spy> = new Map();
  private activeMissions: Map<string, SpyMission> = new Map();
  private intelligenceReports: Map<string, IntelligenceReport> = new Map();
  private missionIdCounter = 0;
  private reportIdCounter = 0;

  constructor() {}

  // Recruit an agent as a spy
  recruitSpy(agentId: string, tribe: string, coverRole: Spy['coverRole']): boolean {
    // Check if already a spy
    if (this.spies.has(agentId)) return false;

    const spy: Spy = {
      agentId,
      tribe,
      coverRole,
      isInfiltrated: false,
      infiltratedTribe: '',
      coverBlown: false,
      missionsCompleted: 0,
      missionsFailed: 0,
      totalIntelGathered: 0,
      detectionChance: 30,
      skillLevel: 1
    };

    this.spies.set(agentId, spy);
    return true;
  }

  // Infiltrate a target tribe
  infiltrateTribe(spyId: string, targetTribe: string): boolean {
    const spy = this.spies.get(spyId);
    if (!spy || spy.isInfiltrated || spy.coverBlown) return false;

    spy.isInfiltrated = true;
    spy.infiltratedTribe = targetTribe;
    return true;
  }

  // Exfiltrate from current tribe
  exfiltrate(spyId: string): boolean {
    const spy = this.spies.get(spyId);
    if (!spy) return false;

    spy.isInfiltrated = false;
    spy.infiltratedTribe = '';
    return true;
  }

  // Create a new spy mission
  createMission(
    spyId: string,
    targetTribe: string,
    missionType: SpyMission['type'],
    targetId?: string
  ): SpyMission | null {
    const spy = this.spies.get(spyId);
    if (!spy || spy.coverBlown) return null;

    // Calculate mission parameters based on type
    const missionConfig = this.getMissionConfig(missionType);
    const risk = this.calculateMissionRisk(spy, targetTribe, missionType);
    const duration = missionConfig.baseDuration + (Math.random() * 5);

    const mission: SpyMission = {
      id: `mission-${this.missionIdCounter++}-${Date.now()}`,
      type: missionType,
      spyId,
      targetTribe,
      targetId,
      status: 'pending',
      progress: 0,
      risk,
      reward: missionConfig.baseReward * spy.skillLevel,
      startDay: Date.now(),
      duration,
    };

    this.activeMissions.set(mission.id, mission);
    return mission;
  }

  private getMissionConfig(type: SpyMission['type']): { baseDuration: number; baseReward: number } {
    const configs = {
      steal_tech: { baseDuration: 15, baseReward: 100 },
      sabotage_building: { baseDuration: 10, baseReward: 80 },
      gather_intel: { baseDuration: 5, baseReward: 50 },
      assassinate: { baseDuration: 8, baseReward: 150 },
      disinformation: { baseDuration: 7, baseReward: 70 },
      counter_spy: { baseDuration: 12, baseReward: 90 }
    };
    return configs[type];
  }

  private calculateMissionRisk(spy: Spy, targetTribe: string, missionType: SpyMission['type']): number {
    let baseRisk = spy.detectionChance;

    // Higher risk for more dangerous missions
    const riskModifiers = {
      steal_tech: 1.5,
      sabotage_building: 1.3,
      gather_intel: 0.8,
      assassinate: 2.0,
      disinformation: 1.0,
      counter_spy: 1.2
    };

    baseRisk *= riskModifiers[missionType];

    // Skill reduces risk
    baseRisk -= spy.skillLevel * 3;

    // Infiltration status affects risk
    if (spy.isInfiltrated && spy.infiltratedTribe === targetTribe) {
      baseRisk -= 15;
    }

    return Math.max(5, Math.min(95, baseRisk));
  }

  // Update all active missions
  updateMissions(currentDay: number, gameState: any): { completed: SpyMission[]; events: string[] } {
    const completed: SpyMission[] = [];
    const events: string[] = [];

    for (const [missionId, mission] of this.activeMissions) {
      if (mission.status !== 'pending' && mission.status !== 'in_progress') continue;

      // Start mission if pending
      if (mission.status === 'pending') {
        mission.status = 'in_progress';
      }

      // Update progress
      const spy = this.spies.get(mission.spyId);
      if (!spy) continue;

      // Progress based on spy skill
      const progressIncrement = (100 / mission.duration) * (1 + spy.skillLevel * 0.1);
      mission.progress = Math.min(100, mission.progress + progressIncrement);

      // Check for detection
      if (Math.random() * 100 < mission.risk * 0.1) {
        mission.status = 'detained';
        mission.result = { detected: true };
        spy.coverBlown = true;
        spy.missionsFailed++;

        events.push(`🕵️ Spy from ${this.getSpyTribe(mission.spyId, gameState)} was detected in ${mission.targetTribe}!`);
        completed.push(mission);
        continue;
      }

      // Check for completion
      if (mission.progress >= 100) {
        const result = this.completeMission(mission, gameState);
        mission.status = 'success';
        mission.result = result;
        spy.missionsCompleted++;
        spy.skillLevel = Math.min(10, spy.skillLevel + 0.5);

        if (result.event) {
          events.push(result.event);
        }

        completed.push(mission);
      }
    }

    // Remove completed missions
    for (const mission of completed) {
      this.activeMissions.delete(mission.id);
    }

    return { completed, events };
  }

  private completeMission(mission: SpyMission, gameState: any): any {
    const spy = this.spies.get(mission.spyId);
    if (!spy) return {};

    switch (mission.type) {
      case 'steal_tech':
        return this.stealTechnology(mission, gameState);

      case 'sabotage_building':
        return this.sabotageBuilding(mission, gameState);

      case 'gather_intel':
        return this.gatherIntelligence(mission, gameState);

      case 'assassinate':
        return this.assassinateTarget(mission, gameState);

      case 'disinformation':
        return this.spreadDisinformation(mission, gameState);

      case 'counter_spy':
        return this.counterEspionage(mission, gameState);

      default:
        return {};
    }
  }

  private stealTechnology(mission: SpyMission, gameState: any): any {
    // Find a tech from target tribe
    const targetTribe = mission.targetTribe;
    const spyTribe = this.getSpyTribe(mission.spyId, gameState);

    // Return event message
    return {
      success: true,
      techStolen: true,
      event: `🔓 ${spyTribe} spy stole technology from ${targetTribe}!`
    };
  }

  private sabotageBuilding(mission: SpyMission, gameState: any): any {
    const targetTribe = mission.targetTribe;
    const spyTribe = this.getSpyTribe(mission.spyId, gameState);

    return {
      success: true,
      buildingDamaged: true,
      event: `💥 ${spyTribe} spy sabotaged a building in ${targetTribe}!`
    };
  }

  private gatherIntelligence(mission: SpyMission, gameState: any): any {
    const targetTribe = mission.targetTribe;
    const spyTribe = this.getSpyTribe(mission.spyId, gameState);

    // Create intelligence report
    const report: IntelligenceReport = {
      id: `intel-${this.reportIdCounter++}-${Date.now()}`,
      tribe: spyTribe,
      sourceTribe: spyTribe,
      targetTribe,
      intelType: 'resources',
      data: {
        agentCount: this.getTribeAgentCount(targetTribe, gameState),
        estimatedResources: this.estimateTribeResources(targetTribe, gameState)
      },
      accuracy: 70 + Math.random() * 20,
      timestamp: Date.now(),
      day: gameState.day
    };

    this.intelligenceReports.set(report.id, report);

    const spy = this.spies.get(mission.spyId);
    if (spy) {
      spy.totalIntelGathered++;
    }

    return {
      success: true,
      reportId: report.id,
      event: `📊 Intelligence gathered on ${targetTribe}`
    };
  }

  private assassinateTarget(mission: SpyMission, gameState: any): any {
    if (!mission.targetId) {
      return { success: false, event: 'Assassination failed: No target specified' };
    }

    const targetTribe = mission.targetTribe;
    const spyTribe = this.getSpyTribe(mission.spyId, gameState);

    // 70% success chance for assassination
    if (Math.random() < 0.7) {
      return {
        success: true,
        targetEliminated: mission.targetId,
        event: `☠️ ${spyTribe} spy assassinated a target in ${targetTribe}!`
      };
    } else {
      return {
        success: false,
        event: `❌ Assassination attempt in ${targetTribe} failed!`
      };
    }
  }

  private spreadDisinformation(mission: SpyMission, gameState: any): any {
    const targetTribe = mission.targetTribe;
    const spyTribe = this.getSpyTribe(mission.spyId, gameState);

    // Disinformation damages relationships
    return {
      success: true,
      relationshipDamage: 20,
      event: `📢 Disinformation campaign launched in ${targetTribe}`
    };
  }

  private counterEspionage(mission: SpyMission, gameState: any): any {
    const targetTribe = mission.targetTribe;
    const spyTribe = this.getSpyTribe(mission.spyId, gameState);

    // Check for enemy spies
    const enemySpies = this.findEnemySpiesInTribe(spyTribe);

    return {
      success: true,
      enemySpiesFound: enemySpies.length,
      event: enemySpies.length > 0
        ? `🔍 Counter-espionage in ${spyTribe} found ${enemySpies.length} enemy spies!`
        : `🔍 Counter-espionage in ${spyTribe} found no enemy spies.`
    };
  }

  private getSpyTribe(spyId: string, gameState: any): string {
    const spy = this.spies.get(spyId);
    return spy?.tribe || 'Unknown';
  }

  private getTribeAgentCount(tribe: string, gameState: any): number {
    const agents = gameState.agents || [];
    return agents.filter((a: any) => a.tribe === tribe && a.alive).length;
  }

  private estimateTribeResources(tribe: string, gameState: any): any {
    const agents = gameState.agents || [];
    const tribeAgents = agents.filter((a: any) => a.tribe === tribe && a.alive);

    if (tribeAgents.length === 0) {
      return { food: 0, energy: 0, materials: 0, knowledge: 0 };
    }

    return {
      food: Math.floor(tribeAgents.reduce((sum: number, a: any) => sum + a.resources.food, 0) / tribeAgents.length),
      energy: Math.floor(tribeAgents.reduce((sum: number, a: any) => sum + a.resources.energy, 0) / tribeAgents.length),
      materials: Math.floor(tribeAgents.reduce((sum: number, a: any) => sum + a.resources.materials, 0) / tribeAgents.length),
      knowledge: Math.floor(tribeAgents.reduce((sum: number, a: any) => sum + (a.resources.knowledge || 0), 0) / tribeAgents.length)
    };
  }

  private findEnemySpiesInTribe(tribe: string): string[] {
    const enemySpies: string[] = [];
    for (const [spyId, spy] of this.spies) {
      if (spy.infiltratedTribe === tribe && spy.tribe !== tribe && !spy.coverBlown) {
        enemySpies.push(spyId);
      }
    }
    return enemySpies;
  }

  // Check if an agent is a spy
  isSpy(agentId: string): boolean {
    return this.spies.has(agentId);
  }

  getSpy(agentId: string): Spy | undefined {
    return this.spies.get(agentId);
  }

  getAllSpies(): Spy[] {
    return Array.from(this.spies.values());
  }

  getSpiesByTribe(tribe: string): Spy[] {
    return Array.from(this.spies.values()).filter(s => s.tribe === tribe);
  }

  getActiveMissions(): SpyMission[] {
    return Array.from(this.activeMissions.values());
  }

  getMission(missionId: string): SpyMission | undefined {
    return this.activeMissions.get(missionId);
  }

  getMissionsBySpy(spyId: string): SpyMission[] {
    return Array.from(this.activeMissions.values()).filter(m => m.spyId === spyId);
  }

  getIntelligenceReports(tribe?: string): IntelligenceReport[] {
    const reports = Array.from(this.intelligenceReports.values());
    if (tribe) {
      return reports.filter(r => r.tribe === tribe);
    }
    return reports;
  }

  getLatestIntelReport(tribe: string, targetTribe: string): IntelligenceReport | undefined {
    const reports = Array.from(this.intelligenceReports.values())
      .filter(r => r.tribe === tribe && r.targetTribe === targetTribe)
      .sort((a, b) => b.timestamp - a.timestamp);
    return reports[0];
  }

  // Train a spy to improve their skills
  trainSpy(spyId: string): boolean {
    const spy = this.spies.get(spyId);
    if (!spy) return false;

    spy.skillLevel = Math.min(10, spy.skillLevel + 1);
    spy.detectionChance = Math.max(10, spy.detectionChance - 2);
    return true;
  }

  // Reset spy cover (after being blown, requires recovery time)
  resetCover(spyId: string): boolean {
    const spy = this.spies.get(spyId);
    if (!spy) return false;

    spy.coverBlown = false;
    spy.isInfiltrated = false;
    spy.infiltratedTribe = '';
    return true;
  }

  // Clear old intelligence reports (keep only last 50 per tribe)
  cleanupOldReports(): void {
    const reportsByTribe = new Map<string, IntelligenceReport[]>();

    for (const report of this.intelligenceReports.values()) {
      if (!reportsByTribe.has(report.tribe)) {
        reportsByTribe.set(report.tribe, []);
      }
      reportsByTribe.get(report.tribe)!.push(report);
    }

    for (const [tribe, reports] of reportsByTribe) {
      if (reports.length > 50) {
        // Sort by timestamp and keep only the newest 50
        reports.sort((a, b) => b.timestamp - a.timestamp);
        const toRemove = reports.slice(50);
        for (const report of toRemove) {
          this.intelligenceReports.delete(report.id);
        }
      }
    }
  }

  public serialize(): any {
    return {
      spies: Array.from(this.spies.entries()),
      activeMissions: Array.from(this.activeMissions.entries()),
      intelligenceReports: Array.from(this.intelligenceReports.entries()),
      missionIdCounter: this.missionIdCounter,
      reportIdCounter: this.reportIdCounter
    };
  }

  public deserialize(data: any): void {
    this.spies = new Map(data.spies || []);
    this.activeMissions = new Map(data.activeMissions || []);
    this.intelligenceReports = new Map(data.intelligenceReports || []);
    this.missionIdCounter = data.missionIdCounter || 0;
    this.reportIdCounter = data.reportIdCounter || 0;
  }
}
