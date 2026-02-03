// Governance System for ClawCiv
// Tribes can develop different forms of government with mechanical effects

export type GovType = 'tribal' | 'chiefdom' | 'democracy' | 'republic' | 'technocracy' | 'dictatorship' | 'monarchy' | 'anarchy';

export interface Government {
  type: GovType;
  name: string;
  icon: string;
  description: string;
  leaderTitle: string;
  // Mechanical effects
  effects: {
    productivity: number;      // Multiplier for all resource gathering (0.5 to 2.0)
    researchSpeed: number;      // Multiplier for research speed (0.5 to 2.0)
    militaryPower: number;      // Multiplier for combat effectiveness (0.5 to 2.0)
    socialCohesion: number;     // Multiplier for social capital gain (0.5 to 2.0)
    innovation: number;         // Chance of new discoveries (0.5 to 2.0)
    stability: number;          // Resistance to unrest/rebellion (0 to 100)
    taxRate: number;           // Resources taken by government (0.0 to 0.5)
  };
  electionCycle?: number;       // Days between elections (for democracies/republics)
  lastElectionDay: number;
  approvalRating: number;      // Public support (0 to 100)
  policies: string[];           // Active policies
  stability: number;           // Government stability (0-100)
  revolutionRisk: number;       // Chance of revolution (0-100)
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  icon: string;
  effects: {
    productivity?: number;
    researchSpeed?: number;
    militaryPower?: number;
    socialCohesion?: number;
    innovation?: number;
    stability?: number;
    taxRate?: number;
  };
  supportRequired: number;     // Minimum approval to enact
  support: number;             // Current support level
}

export class GovernanceSystem {
  private tribalGovernments: Map<string, Government> = new Map();
  private availablePolicies: Map<string, Policy> = new Map();

  constructor() {
    this.initializePolicies();
    this.initializeGovernments();
  }

  private initializeGovernments(): void {
    // Start all tribes with tribal governance
    this.tribalGovernments.set('Alpha', this.getGovernmentDefaults('tribal'));
    this.tribalGovernments.set('Beta', this.getGovernmentDefaults('tribal'));
    this.tribalGovernments.set('Gamma', this.getGovernmentDefaults('tribal'));
  }

  private getGovernmentDefaults(type: GovType): Government {
    const govDefaults: { [key in GovType]: Government } = {
      tribal: {
        type: 'tribal',
        name: 'Tribal Council',
        icon: '🏺',
        description: 'Elders lead by consensus and tradition',
        leaderTitle: 'Elder',
        effects: {
          productivity: 0.9,
          researchSpeed: 0.8,
          militaryPower: 1.0,
          socialCohesion: 1.2,
          innovation: 0.7,
          stability: 60,
          taxRate: 0.0
        },
        approvalRating: 70,
        policies: [],
        stability: 60,
        revolutionRisk: 20
      },
      chiefdom: {
        type: 'chiefdom',
        name: 'Chiefdom',
        icon: '👑',
        description: 'Single ruler with advisory council',
        leaderTitle: 'Chief',
        effects: {
          productivity: 1.0,
          researchSpeed: 0.9,
          militaryPower: 1.2,
          socialCohesion: 1.0,
          innovation: 0.8,
          stability: 70,
          taxRate: 0.05
        },
        approvalRating: 65,
        policies: [],
        stability: 70,
        revolutionRisk: 15
      },
      democracy: {
        type: 'democracy',
        name: 'Democracy',
        icon: '🗳️',
        description: 'Citizens vote on all major decisions',
        leaderTitle: 'Prime Minister',
        effects: {
          productivity: 1.1,
          researchSpeed: 1.2,
          militaryPower: 0.9,
          socialCohesion: 1.3,
          innovation: 1.3,
          stability: 50,
          taxRate: 0.15
        },
        electionCycle: 30,
        lastElectionDay: 0,
        approvalRating: 60,
        policies: [],
        stability: 50,
        revolutionRisk: 10
      },
      republic: {
        type: 'republic',
        name: 'Republic',
        icon: '🏛️',
        description: 'Representatives elected to govern',
        leaderTitle: 'Consul',
        effects: {
          productivity: 1.15,
          researchSpeed: 1.1,
          militaryPower: 1.0,
          socialCohesion: 1.1,
          innovation: 1.2,
          stability: 65,
          taxRate: 0.12
        },
        electionCycle: 40,
        lastElectionDay: 0,
        approvalRating: 65,
        policies: [],
        stability: 65,
        revolutionRisk: 8
      },
      technocracy: {
        type: 'technocracy',
        name: 'Technocracy',
        icon: '🔬',
        description: 'Scientists and experts rule by merit',
        leaderTitle: 'Director',
        effects: {
          productivity: 1.2,
          researchSpeed: 1.6,
          militaryPower: 0.8,
          socialCohesion: 0.9,
          innovation: 1.5,
          stability: 55,
          taxRate: 0.10
        },
        approvalRating: 70,
        policies: [],
        stability: 55,
        revolutionRisk: 12
      },
      dictatorship: {
        type: 'dictatorship',
        name: 'Dictatorship',
        icon: '⚔️',
        description: 'Single ruler with absolute power',
        leaderTitle: 'Dictator',
        effects: {
          productivity: 1.3,
          researchSpeed: 0.8,
          militaryPower: 1.5,
          socialCohesion: 0.6,
          innovation: 0.7,
          stability: 40,
          taxRate: 0.25
        },
        approvalRating: 40,
        policies: [],
        stability: 40,
        revolutionRisk: 40
      },
      monarchy: {
        type: 'monarchy',
        name: 'Monarchy',
        icon: '👑',
        description: 'Hereditary rule with divine right',
        leaderTitle: 'King/Queen',
        effects: {
          productivity: 1.1,
          researchSpeed: 0.9,
          militaryPower: 1.3,
          socialCohesion: 1.2,
          innovation: 0.8,
          stability: 75,
          taxRate: 0.20
        },
        approvalRating: 55,
        policies: [],
        stability: 75,
        revolutionRisk: 25
      },
      anarchy: {
        type: 'anarchy',
        name: 'Anarchy',
        icon: '🏴',
        description: 'No formal government, complete freedom',
        leaderTitle: 'None',
        effects: {
          productivity: 0.7,
          researchSpeed: 1.1,
          militaryPower: 0.6,
          socialCohesion: 0.5,
          innovation: 1.4,
          stability: 20,
          taxRate: 0.0
        },
        approvalRating: 50,
        policies: [],
        stability: 20,
        revolutionRisk: 5
      }
    };

    return govDefaults[type];
  }

  private initializePolicies(): void {
    // Economic Policies
    this.addPolicy({
      id: 'free_trade',
      name: 'Free Trade',
      description: 'No restrictions on commerce',
      icon: '📈',
      effects: {
        productivity: 1.1,
        innovation: 1.1
      },
      supportRequired: 40,
      support: 0
    });

    this.addPolicy({
      id: 'protectionism',
      name: 'Protectionism',
      description: 'Tariffs and trade restrictions',
      icon: '🛡️',
      effects: {
        productivity: 0.9,
        socialCohesion: 1.2,
        taxRate: 0.05
      },
      supportRequired: 30,
      support: 0
    });

    // Social Policies
    this.addPolicy({
      id: 'welfare_state',
      name: 'Welfare State',
      description: 'Government provides for citizens',
      icon: '🏥',
      effects: {
        socialCohesion: 1.3,
        stability: 1.1,
        taxRate: 0.15
      },
      supportRequired: 50,
      support: 0
    });

    this.addPolicy({
      id: 'austerity',
      name: 'Austerity',
      description: 'Cut spending to reduce taxes',
      icon: '✂️',
      effects: {
        stability: 0.9,
        taxRate: -0.1
      },
      supportRequired: 35,
      support: 0
    });

    // Military Policies
    this.addPolicy({
      id: 'militarism',
      name: 'Militarism',
      description: 'Focus on military strength',
      icon: '⚔️',
      effects: {
        militaryPower: 1.3,
        productivity: 0.9,
        innovation: 0.9
      },
      supportRequired: 45,
      support: 0
    });

    this.addPolicy({
      id: 'pacifism',
      name: 'Pacifism',
      description: 'Peaceful coexistence',
      icon: '☮️',
      effects: {
        militaryPower: 0.5,
        socialCohesion: 1.2,
        innovation: 0.9
      },
      supportRequired: 55,
      support: 0
    });

    // Knowledge Policies
    this.addPolicy({
      id: 'science_funding',
      name: 'Science Funding',
      description: 'Invest heavily in research',
      icon: '🔬',
      effects: {
        researchSpeed: 1.3,
        innovation: 1.2
      },
      supportRequired: 40,
      support: 0
    });

    this.addPolicy({
      id: 'tradition',
      name: 'Traditional Values',
      description: 'Preserve traditional ways',
      icon: '📜',
      effects: {
        innovation: 0.7,
        socialCohesion: 1.3,
        stability: 1.2
      },
      supportRequired: 35,
      support: 0
    });
  }

  private addPolicy(policy: Policy): void {
    this.availablePolicies.set(policy.id, policy);
  }

  getGovernment(tribe: string): Government {
    return this.tribalGovernments.get(tribe)!;
  }

  getAllGovernments(): { tribe: string; gov: Government }[] {
    return Array.from(this.tribalGovernments.entries()).map(([tribe, gov]) => ({ tribe, gov }));
  }

  // Transition to a new government type
  transitionGovernment(tribe: string, newType: GovType): boolean {
    // Can't transition to same type
    const current = this.tribalGovernments.get(tribe);
    if (!current || current.type === newType) return false;

    // Some transitions require conditions
    if (!this.canTransitionToType(current.type, newType, current.approvalRating)) {
      return false;
    }

    // Apply transition penalty
    const newGov = this.getGovernmentDefaults(newType);
    newGov.lastElectionDay = current.lastElectionDay || 0;
    newGov.approvalRating = Math.max(40, current.approvalRating - 20); // Transition penalty
    newGov.policies = []; // Reset policies on transition
    newGov.stability = Math.max(30, newGov.stability - 20); // Stability drop during transition

    this.tribalGovernments.set(tribe, newGov);
    return true;
  }

  private canTransitionToType(fromType: GovType, toType: GovType, approval: number): boolean {
    // Certain transitions require high approval
    if (toType === 'democracy' || toType === 'republic') {
      return approval >= 50;
    }

    if (toType === 'dictatorship') {
      return approval >= 30; // Easier to become a dictatorship
    }

    // Can always transition to anarchy
    if (toType === 'anarchy') {
      return true;
    }

    // Other transitions have moderate requirements
    return approval >= 40;
  }

  // Enact a policy
  enactPolicy(tribe: string, policyId: string): boolean {
    const gov = this.tribalGovernments.get(tribe);
    const policy = this.availablePolicies.get(policyId);

    if (!gov || !policy) return false;

    // Check if support is sufficient
    if (gov.approvalRating < policy.supportRequired) return false;

    // Add policy and apply effects
    gov.policies.push(policyId);
    gov.approvalRating = Math.min(100, gov.approvalRating + 5);

    return true;
  }

  // Remove a policy
  removePolicy(tribe: string, policyId: string): boolean {
    const gov = this.tribalGovernments.get(tribe);
    if (!gov) return false;

    const index = gov.policies.indexOf(policyId);
    if (index === -1) return false;

    gov.policies.splice(index, 1);
    gov.approvalRating = Math.max(0, gov.approvalRating - 5);

    return true;
  }

  // Calculate total effects including government and policies
  getEffects(tribe: string): Government['effects'] {
    const gov = this.tribalGovernments.get(tribe);
    if (!gov) return this.getGovernmentDefaults('tribal').effects;

    let effects = { ...gov.effects };

    // Apply policy effects
    for (const policyId of gov.policies) {
      const policy = this.availablePolicies.get(policyId);
      if (policy && policy.effects) {
        for (const [key, value] of Object.entries(policy.effects)) {
          if (key in effects && typeof effects[key as keyof typeof effects] === 'number') {
            (effects[key as keyof typeof effects] as number) *= value;
          }
        }
      }
    }

    return effects;
  }

  // Update approval rating based on game state
  updateApproval(tribe: string, prosperity: number, security: number): void {
    const gov = this.tribalGovernments.get(tribe);
    if (!gov) return;

    // Base approval changes slowly based on conditions
    let targetApproval = 50;

    if (prosperity > 0.7) {
      targetApproval += 20;
    } else if (prosperity < 0.3) {
      targetApproval -= 20;
    }

    if (security > 0.8) {
      targetApproval += 10;
    } else if (security < 0.4) {
      targetApproval -= 30;
    }

    // Government type affects approval volatility
    const volatility = {
      tribal: 0.05,
      chiefdom: 0.04,
      democracy: 0.08,
      republic: 0.06,
      technocracy: 0.07,
      dictatorship: 0.03,
      monarchy: 0.02,
      anarchy: 0.15
    };

    // Move current approval toward target
    const diff = targetApproval - gov.approvalRating;
    gov.approvalRating += diff * (volatility[gov.type] || 0.05);
    gov.approvalRating = Math.max(0, Math.min(100, gov.approvalRating));

    // Update stability based on approval
    const approvalGap = Math.abs(gov.approvalRating - 50);
    const stabilityEffect = approvalGap * 0.5;
    gov.stability = Math.max(0, Math.min(100, gov.stability - stabilityEffect));

    // Update revolution risk
    if (gov.approvalRating < 20 && gov.type !== 'anarchy') {
      gov.revolutionRisk = Math.min(100, gov.revolutionRisk + 5);
    } else if (gov.approvalRating > 70) {
      gov.revolutionRisk = Math.max(0, gov.revolutionRisk - 5);
    }

    // Anarchy has different rules
    if (gov.type === 'anarchy') {
      gov.stability = Math.max(20, gov.stability + prosperity * 20);
      if (gov.stability > 60) {
        // Spontaneous formation of new government
        this.formGovernmentFromAnarchy(tribe);
      }
    }

    // Check for revolution
    if (gov.revolutionRisk > 70 && Math.random() < 0.1) {
      this.triggerRevolution(tribe);
    }
  }

  private formGovernmentFromAnarchy(tribe: string): void {
    const possibleGovs: GovType[] = ['chiefdom', 'democracy', 'republic', 'technocracy'];
    const newType = possibleGovs[Math.floor(Math.random() * possibleGovs.length)];

    const newGov = this.getGovernmentDefaults(newType);
    this.tribalGovernments.set(tribe, newGov);
  }

  private triggerRevolution(tribe: string): void {
    const current = this.tribalGovernments.get(tribe);
    if (!current) return;

    // Dictatorships often become democracies
    // Democracies can become dictatorships
    // Monarchies can become republics
    // etc.

    const transitions: { [key: string]: GovType[] } = {
      dictatorship: ['democracy', 'republic', 'anarchy'],
      democracy: ['dictatorship', 'anarchy'],
      republic: ['monarchy', 'technocracy'],
      monarchy: ['republic', 'democracy'],
      chiefdom: ['monarchy', 'dictatorship'],
      tribal: ['chiefdom', 'anarchy']
    };

    const possible = transitions[current.type] || ['democracy', 'anarchy'];
    const newType = possible[Math.floor(Math.random() * possible.length)];

    this.transitionGovernment(tribe, newType);
  }

  // Hold elections for democracies and republics
  holdElections(tribe: string): { winner?: string; governmentChanged: boolean } | null {
    const gov = this.tribalGovernments.get(tribe);
    if (!gov) return null;
    if (gov.type !== 'democracy' && gov.type !== 'republic') return null;

    gov.lastElectionDay = Date.now();

    // 30% chance of government change if approval is low
    if (gov.approvalRating < 40 && Math.random() < 0.3) {
      // Change to different government type
      const alternatives = gov.type === 'democracy' ? ['republic', 'technocracy'] : ['democracy', 'monarchy'];
      const newType = alternatives[Math.floor(Math.random() * alternatives.length)];
      this.transitionGovernment(tribe, newType);
      return { governmentChanged: true };
    }

    // Otherwise same government continues
    return { winner: 'incumbent', governmentChanged: false };
  }

  // Collect taxes (reduces agent resources, increases treasury)
  collectTaxes(tribe: string, agents: any[]): { collected: { [key: string]: number } } {
    const gov = this.tribalGovernments.get(tribe);
    if (!gov) return { collected: {} };

    const taxRate = gov.effects.taxRate;
    const collected: { [key: string]: number } = {
      food: 0,
      materials: 0,
      knowledge: 0
    };

    for (const agent of agents) {
      if (agent.tribe !== tribe || !agent.alive) continue;

      // Collect from resources
      const foodTax = Math.floor(agent.resources.food * taxRate);
      const materialsTax = Math.floor(agent.resources.materials * taxRate);
      const knowledgeTax = Math.floor((agent.resources.knowledge || 0) * taxRate);

      agent.resources.food -= foodTax;
      agent.resources.materials -= materialsTax;
      agent.resources.knowledge = (agent.resources.knowledge || 0) - knowledgeTax;

      collected.food += foodTax;
      collected.materials += materialsTax;
      collected.knowledge += knowledgeTax;
    }

    // Low taxation increases approval
    if (taxRate < 0.1) {
      gov.approvalRating = Math.min(100, gov.approvalRating + 2);
    }

    return { collected };
  }

  // Get available policies
  getAvailablePolicies(): Policy[] {
    return Array.from(this.availablePolicies.values());
  }

  // Get enacted policies for a tribe
  getEnactedPolicies(tribe: string): string[] {
    const gov = this.tribalGovernments.get(tribe);
    return gov ? gov.policies : [];
  }

  // Can this government transition to another type?
  canTransitionTo(tribe: string, targetType: GovType): boolean {
    const current = this.tribalGovernments.get(tribe);
    if (!current) return false;

    return this.canTransitionToType(current.type, targetType, current.approvalRating);
  }

  // Get government evolution options based on current state
  getEvolutionOptions(tribe: string): { type: GovType; chance: number; requires: string[] }[] {
    const current = this.tribalGovernments.get(tribe);
    if (!current) return [];

    const options: { type: GovType; chance: number; requires: string[] }[] = [];

    // Democracy/Republic options
    if (current.type !== 'democracy' && current.type !== 'republic') {
      if (current.approvalRating >= 50) {
        options.push({ type: 'democracy', chance: 30, requires: ['50+ approval'] });
      }
      if (current.approvalRating >= 55) {
        options.push({ type: 'republic', chance: 25, requires: ['55+ approval'] });
      }
    }

    // Dictatorship option
    if (current.type !== 'dictatorship' && current.approvalRating < 40) {
      options.push({ type: 'dictatorship', chance: 20, requires: ['<40 approval'] });
    }

    // Monarchy option
    if (current.type !== 'monarchy' && current.approvalRating >= 45) {
      options.push({ type: 'monarchy', chance: 15, requires: ['45+ approval'] });
    }

    // Technocracy option
    if (current.type !== 'technocracy') {
      options.push({ type: 'technocracy', chance: 10, requires: [] });
    }

    // Anarchy option (always available but risky)
    options.push({ type: 'anarchy', chance: 5, requires: ['High risk'] });

    return options;
  }

  public serialize(): any {
    return {
      governments: Array.from(this.tribalGovernments.entries()),
      policies: Array.from(this.availablePolicies.entries())
    };
  }

  public deserialize(data: any): void {
    this.tribalGovernments = new Map(data.governments || []);
    this.availablePolicies = new Map(data.policies || []);
  }
}
