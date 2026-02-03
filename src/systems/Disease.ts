// Disease/Plague System for ClawCiv
// Illness spreads between agents, tribes can implement quarantines, and cures can be researched

export type DiseaseSeverity = 'mild' | 'moderate' | 'severe' | 'deadly' | 'pandemic';
export type DiseaseStatus = 'active' | 'quarantined' | 'cured' | 'contained' | 'extinct';

export interface DiseaseSymptom {
  name: string;
  effect: {
    type: 'resource_drain' | 'mortality' | 'contagion' | 'incapacitation';
    value: number;
  };
}

export interface Disease {
  id: string;
  name: string;
  severity: DiseaseSeverity;
  status: DiseaseStatus;
  icon: string;
  description: string;
  origin: string; // Tribe where it started
  dayDiscovered: number;
  symptoms: DiseaseSymptom[];

  // Transmission
  transmissionRate: number; // 0-100, chance to spread per contact
  incubationPeriod: number; // Days before symptoms show
  contagiousPeriod: number; // Days agent can spread it
  mortalityRate: number; // 0-100, chance of death

  // Spread
  infectedAgents: Set<string>; // Agent IDs
  recoveredAgents: Set<string>; // Immune
  deceasedAgents: Set<string>;  // Killed by disease
  tribesAffected: Set<string>;

  // Control
  quarantineZones: Map<string, { x: number; y: number; radius: number }>; // Tribe -> zones
  cureProgress: number; // 0-100
  hasCure: boolean;

  // Statistics
  totalCases: number;
  totalDeaths: number;
  peakInfections: number;
}

export class DiseaseSystem {
  private diseases: Map<string, Disease> = new Map();
  private diseaseIdCounter = 0;
  private quarantinedAgents: Map<string, string> = new Map(); // Agent ID -> disease ID
  private immuneAgents: Map<string, Set<string>> = new Map(); // Disease ID -> immune agent IDs

  constructor() {}

  // Create a new disease
  createDisease(
    name: string,
    origin: string,
    severity?: DiseaseSeverity
  ): Disease | null {
    const diseaseSeverity = severity || this.rollSeverity();

    const disease: Disease = {
      id: `disease-${this.diseaseIdCounter++}-${Date.now()}`,
      name,
      severity: diseaseSeverity,
      status: 'active',
      icon: this.getDiseaseIcon(diseaseSeverity),
      description: this.generateDescription(diseaseSeverity),
      origin,
      dayDiscovered: Date.now(),
      symptoms: this.generateSymptoms(diseaseSeverity),
      transmissionRate: this.getTransmissionRate(diseaseSeverity),
      incubationPeriod: this.getIncubationPeriod(diseaseSeverity),
      contagiousPeriod: this.getContagiousPeriod(diseaseSeverity),
      mortalityRate: this.getMortalityRate(diseaseSeverity),
      infectedAgents: new Set(),
      recoveredAgents: new Set(),
      deceasedAgents: new Set(),
      tribesAffected: new Set(),
      quarantineZones: new Map(),
      cureProgress: 0,
      hasCure: false,
      totalCases: 0,
      totalDeaths: 0,
      peakInfections: 0
    };

    this.diseases.set(disease.id, disease);
    return disease;
  }

  private rollSeverity(): DiseaseSeverity {
    const roll = Math.random() * 100;
    if (roll < 40) return 'mild';
    if (roll < 70) return 'moderate';
    if (roll < 90) return 'severe';
    if (roll < 98) return 'deadly';
    return 'pandemic';
  }

  private getDiseaseIcon(severity: DiseaseSeverity): string {
    const icons = {
      mild: '🤧',
      moderate: '🤒',
      severe: '🤢',
      deadly: '☠️',
      pandemic: '💀'
    };
    return icons[severity];
  }

  private generateDescription(severity: DiseaseSeverity): string {
    const descriptions = {
      mild: 'A minor illness causing discomfort',
      moderate: 'A concerning sickness with notable symptoms',
      severe: 'A dangerous disease requiring medical attention',
      deadly: 'A lethal plague with high mortality',
      pandemic: 'A catastrophic illness threatening entire populations'
    };
    return descriptions[severity];
  }

  private generateSymptoms(severity: DiseaseSeverity): DiseaseSymptom[] {
    const symptomSets = {
      mild: [
        { name: 'Cough', effect: { type: 'resource_drain', value: 2 } },
        { name: 'Fatigue', effect: { type: 'resource_drain', value: 1 } }
      ],
      moderate: [
        { name: 'Fever', effect: { type: 'resource_drain', value: 4 } },
        { name: 'Weakness', effect: { type: 'incapacitation', value: 20 } },
        { name: 'Cough', effect: { type: 'contagion', value: 3 } }
      ],
      severe: [
        { name: 'High Fever', effect: { type: 'resource_drain', value: 6 } },
        { name: 'Delirium', effect: { type: 'incapacitation', value: 40 } },
        { name: 'Hemorrhaging', effect: { type: 'mortality', value: 15 } },
        { name: 'Coughing Blood', effect: { type: 'contagion', value: 5 } }
      ],
      deadly: [
        { name: 'Organ Failure', effect: { type: 'mortality', value: 30 } },
        { name: 'Seizures', effect: { type: 'incapacitation', value: 60 } },
        { name: 'Necrosis', effect: { type: 'mortality', value: 25 } },
        { name: 'Coughing Blood', effect: { type: 'contagion', value: 7 } }
      ],
      pandemic: [
        { name: 'Systemic Collapse', effect: { type: 'mortality', value: 50 } },
        { name: 'Coma', effect: { type: 'incapacitation', value: 80 } },
        { name: 'Massive Hemorrhaging', effect: { type: 'mortality', value: 40 } },
        { name: 'Airborne Transmission', effect: { type: 'contagion', value: 10 } }
      ]
    };

    return symptomSets[severity];
  }

  private getTransmissionRate(severity: DiseaseSeverity): number {
    const rates = {
      mild: 10,
      moderate: 20,
      severe: 30,
      deadly: 40,
      pandemic: 60
    };
    return rates[severity];
  }

  private getIncubationPeriod(severity: DiseaseSeverity): number {
    const periods = {
      mild: 3,
      moderate: 5,
      severe: 7,
      deadly: 4,
      pandemic: 2
    };
    return periods[severity];
  }

  private getContagiousPeriod(severity: DiseaseSeverity): number {
    const periods = {
      mild: 7,
      moderate: 14,
      severe: 21,
      deadly: 14,
      pandemic: 30
    };
    return periods[severity];
  }

  private getMortalityRate(severity: DiseaseSeverity): number {
    const rates = {
      mild: 1,
      moderate: 5,
      severe: 15,
      deadly: 40,
      pandemic: 70
    };
    return rates[severity];
  }

  // Infect an agent with a disease
  infectAgent(agentId: string, diseaseId: string, day: number): boolean {
    const disease = this.diseases.get(diseaseId);
    if (!disease || disease.status === 'extinct') return false;

    // Check if agent is already infected or immune
    if (disease.infectedAgents.has(agentId)) return false;
    if (this.isAgentImmune(agentId, diseaseId)) return false;

    // Check if agent is quarantined for this disease
    if (this.quarantinedAgents.get(agentId) === diseaseId) return false;

    disease.infectedAgents.add(agentId);
    disease.totalCases++;
    disease.tribesAffected.add(day.toString()); // Simplified tracking

    // Update peak infections
    if (disease.infectedAgents.size > disease.peakInfections) {
      disease.peakInfections = disease.infectedAgents.size;
    }

    return true;
  }

  // Spread disease between nearby agents
  spreadDisease(diseaseId: string, agents: any[], currentDay: number): {
    newInfections: string[];
    deaths: string[];
  } {
    const disease = this.diseases.get(diseaseId);
    if (!disease || disease.status !== 'active') {
      return { newInfections: [], deaths: [] };
    }

    const newInfections: string[] = [];
    const deaths: string[] = [];

    for (const infectedId of disease.infectedAgents) {
      const infectedAgent = agents.find(a => a.id === infectedId);
      if (!infectedAgent || !infectedAgent.alive) continue;

      // Find nearby agents
      const nearbyAgents = agents.filter(a =>
        a.id !== infectedId &&
        a.alive &&
        !disease.infectedAgents.has(a.id) &&
        !this.isAgentImmune(a.id, diseaseId) &&
        this.calculateDistance(infectedAgent, a) <= 2 // Within 2 grid spaces
      );

      for (const nearbyAgent of nearbyAgents) {
        // Transmission check
        if (Math.random() * 100 < disease.transmissionRate) {
          this.infectAgent(nearbyAgent.id, diseaseId, currentDay);
          newInfections.push(nearbyAgent.id);
        }
      }
    }

    return { newInfections, deaths };
  }

  private calculateDistance(agent1: any, agent2: any): number {
    return Math.abs(agent1.x - agent2.x) + Math.abs(agent1.y - agent2.y);
  }

  // Check if agent is immune to a disease
  isAgentImmune(agentId: string, diseaseId: string): boolean {
    const immuneSet = this.immuneAgents.get(diseaseId);
    return immuneSet ? immuneSet.has(agentId) : false;
  }

  // Update disease progression for all agents
  updateDiseases(agents: any[], currentDay: number): {
    recovered: string[];
    deaths: string[];
    events: string[];
  } {
    const recovered: string[] = [];
    const deaths: string[] = [];
    const events: string[] = [];

    for (const disease of this.diseases.values()) {
      if (disease.status !== 'active') continue;

      const agentsToRecover: string[] = [];
      const agentsToDie: string[] = [];

      for (const agentId of disease.infectedAgents) {
        const agent = agents.find(a => a.id === agentId);
        if (!agent || !agent.alive) {
          agentsToDie.push(agentId);
          continue;
        }

        // Apply symptoms
        for (const symptom of disease.symptoms) {
          switch (symptom.effect.type) {
            case 'resource_drain':
              agent.resources.food -= symptom.effect.value * 0.1;
              agent.resources.energy -= symptom.effect.value * 0.1;
              break;

            case 'mortality':
              if (Math.random() * 100 < disease.mortalityRate * 0.01) {
                agentsToDie.push(agentId);
              }
              break;

            case 'incapacitation':
              // Agent has reduced chance to act
              break;
          }
        }

        // Check for recovery (after contagious period)
        const daysInfected = currentDay - disease.dayDiscovered;
        if (daysInfected > disease.contagiousPeriod) {
          // 70% chance to recover each day after contagious period
          if (Math.random() < 0.7) {
            agentsToRecover.push(agentId);
          }
        }
      }

      // Process deaths
      for (const agentId of agentsToDie) {
        disease.infectedAgents.delete(agentId);
        disease.deceasedAgents.add(agentId);
        disease.totalDeaths++;
      }

      // Process recoveries
      for (const agentId of agentsToRecover) {
        disease.infectedAgents.delete(agentId);
        disease.recoveredAgents.add(agentId);

        // Grant immunity
        if (!this.immuneAgents.has(disease.id)) {
          this.immuneAgents.set(disease.id, new Set());
        }
        this.immuneAgents.get(disease.id)!.add(agentId);
      }

      recovered.push(...agentsToRecover);
      deaths.push(...agentsToDie);

      // Check if disease should end
      if (disease.infectedAgents.size === 0) {
        if (disease.totalCases > 0) {
          disease.status = 'contained';
          events.push(`🦠 ${disease.name} has been contained! Total cases: ${disease.totalCases}, Deaths: ${disease.totalDeaths}`);
        } else {
          disease.status = 'extinct';
        }
      }
    }

    return { recovered, deaths, events };
  }

  // Implement quarantine for a disease in a region
  implementQuarantine(
    diseaseId: string,
    tribe: string,
    location: { x: number; y: number },
    radius: number
  ): boolean {
    const disease = this.diseases.get(diseaseId);
    if (!disease) return false;

    disease.quarantineZones.set(tribe, { ...location, radius });
    disease.status = 'quarantined';

    return true;
  }

  // Lift quarantine
  liftQuarantine(diseaseId: string, tribe: string): boolean {
    const disease = this.diseases.get(diseaseId);
    if (!disease) return false;

    disease.quarantineZones.delete(tribe);

    // If no more quarantine zones, revert to active
    if (disease.quarantineZones.size === 0 && disease.status === 'quarantined') {
      disease.status = 'active';
    }

    return true;
  }

  // Research cure for a disease
  researchCure(diseaseId: string, progress: number): boolean {
    const disease = this.diseases.get(diseaseId);
    if (!disease || disease.hasCure) return false;

    disease.cureProgress = Math.min(100, disease.cureProgress + progress);

    if (disease.cureProgress >= 100) {
      disease.hasCure = true;
      disease.status = 'cured';
      return true;
    }

    return false;
  }

  // Apply cure to all infected agents
  applyCure(diseaseId: string): string[] {
    const disease = this.diseases.get(diseaseId);
    if (!disease || !disease.hasCure) return [];

    const cured: string[] = [];

    for (const agentId of disease.infectedAgents) {
      disease.infectedAgents.delete(agentId);
      disease.recoveredAgents.add(agentId);

      // Grant immunity
      if (!this.immuneAgents.has(disease.id)) {
        this.immuneAgents.set(disease.id, new Set());
      }
      this.immuneAgents.get(disease.id)!.add(agentId);

      cured.push(agentId);
    }

    return cured;
  }

  // Get active diseases
  getActiveDiseases(): Disease[] {
    return Array.from(this.diseases.values()).filter(d => d.status === 'active' || d.status === 'quarantined');
  }

  // Get all diseases
  getAllDiseases(): Disease[] {
    return Array.from(this.diseases.values());
  }

  // Get disease by ID
  getDisease(diseaseId: string): Disease | undefined {
    return this.diseases.get(diseaseId);
  }

  // Get diseases affecting a tribe
  getDiseasesByTribe(tribe: string): Disease[] {
    return Array.from(this.diseases.values()).filter(d => d.tribesAffected.has(tribe));
  }

  // Get infection status for an agent
  getAgentInfection(agentId: string): Disease | null {
    for (const disease of this.diseases.values()) {
      if (disease.infectedAgents.has(agentId)) {
        return disease;
      }
    }
    return null;
  }

  // Check if agent can spread disease
  canSpreadDisease(agentId: string): boolean {
    for (const disease of this.diseases.values()) {
      if (disease.infectedAgents.has(agentId) && disease.status === 'active') {
        return true;
      }
    }
    return false;
  }

  // Mutate a disease (randomly spawn new disease variant)
  mutateDisease(parentDiseaseId: string): Disease | null {
    const parent = this.diseases.get(parentDiseaseId);
    if (!parent) return null;

    const severityMutation = ['mild', 'moderate', 'severe', 'deadly', 'pandemic'];
    const currentSeverityIndex = severityMutation.indexOf(parent.severity);

    // Mutation can increase or rarely decrease severity
    let newSeverity = parent.severity;
    if (Math.random() < 0.3) {
      // Increase severity
      if (currentSeverityIndex < severityMutation.length - 1) {
        newSeverity = severityMutation[currentSeverityIndex + 1] as DiseaseSeverity;
      }
    } else if (Math.random() < 0.1) {
      // Decrease severity
      if (currentSeverityIndex > 0) {
        newSeverity = severityMutation[currentSeverityIndex - 1] as DiseaseSeverity;
      }
    }

    const mutant = this.createDisease(
      `${parent.name} (Mutant)`,
      parent.origin,
      newSeverity
    );

    if (mutant) {
      mutant.transmissionRate = Math.min(100, parent.transmissionRate * 1.2);
    }

    return mutant;
  }

  // Trigger random disease outbreak
  triggerOutbreak(tribe: string, severity?: DiseaseSeverity): Disease | null {
    const diseaseNames = {
      mild: ['Common Cold', 'Mild Flu', 'Seasonal Allergy'],
      moderate: ['Influenza', 'Food Poisoning', 'Stomach Flu'],
      severe: ['Typhoid', 'Dysentery', 'Tuberculosis'],
      deadly: ['Cholera', 'Plague', 'Smallpox'],
      pandemic: ['Black Death', 'Spanish Flu', 'Coronavirus']
    };

    const names = diseaseNames[severity || this.rollSeverity()];
    const name = names[Math.floor(Math.random() * names.length)];

    return this.createDisease(name, tribe, severity);
  }

  // Get disease statistics
  getStatistics(): {
    totalDiseases: number;
    activeDiseases: number;
    totalCases: number;
    totalDeaths: number;
    totalRecovered: number;
  } {
    const stats = {
      totalDiseases: this.diseases.size,
      activeDiseases: 0,
      totalCases: 0,
      totalDeaths: 0,
      totalRecovered: 0
    };

    for (const disease of this.diseases.values()) {
      if (disease.status === 'active' || disease.status === 'quarantined') {
        stats.activeDiseases++;
      }
      stats.totalCases += disease.totalCases;
      stats.totalDeaths += disease.totalDeaths;
      stats.totalRecovered += disease.recoveredAgents.size;
    }

    return stats;
  }

  // Clean up extinct diseases
  cleanupOldDiseases(currentDay: number): void {
    const toRemove: string[] = [];

    for (const [id, disease] of this.diseases) {
      const daysSinceDiscovered = currentDay - disease.dayDiscovered;

      // Remove diseases that are contained/cured and very old
      if ((disease.status === 'contained' || disease.status === 'cured') && daysSinceDiscovered > 200) {
        toRemove.push(id);
      }

      // Remove extinct diseases
      if (disease.status === 'extinct' && daysSinceDiscovered > 100) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.diseases.delete(id);
      this.immuneAgents.delete(id);
    }
  }

  public serialize(): any {
    return {
      diseases: Array.from(this.diseases.entries()),
      diseaseIdCounter: this.diseaseIdCounter,
      quarantinedAgents: Array.from(this.quarantinedAgents.entries()),
      immuneAgents: Array.from(this.immuneAgents.entries())
    };
  }

  public deserialize(data: any): void {
    this.diseases = new Map(data.diseases || []);
    this.diseaseIdCounter = data.diseaseIdCounter || 0;
    this.quarantinedAgents = new Map(data.quarantinedAgents || []);

    this.immuneAgents = new Map();
    for (const [id, set] of (data.immuneAgents || [])) {
      this.immuneAgents.set(id, new Set(set));
    }

    // Convert infected agents arrays back to Sets
    for (const [id, disease] of this.diseases) {
      if (Array.isArray(disease.infectedAgents)) {
        disease.infectedAgents = new Set(disease.infectedAgents);
      }
      if (Array.isArray(disease.recoveredAgents)) {
        disease.recoveredAgents = new Set(disease.recoveredAgents);
      }
      if (Array.isArray(disease.deceasedAgents)) {
        disease.deceasedAgents = new Set(disease.deceasedAgents);
      }
      if (Array.isArray(disease.tribesAffected)) {
        disease.tribesAffected = new Set(disease.tribesAffected);
      }
    }
  }
}
