// Tribe Diplomacy System for ClawCiv
// Handles relationships between tribes at a macro level

export interface TribeRelationship {
  tribe: string;
  otherTribe: string;
  status: 'neutral' | 'friendly' | 'allied' | 'unfriendly' | 'hostile' | 'war';
  relationshipValue: number; // -100 to 100, affects trade and combat
  trustLevel: number; // 0 to 100, affects how quickly relationships change
  lastInteractionDay: number;
  tradeAgreement: boolean;
  nonAggressionPact: boolean;
  sharedResearch: boolean; // Can research techs together
}

export interface DiplomaticProposal {
  id: string;
  fromTribe: string;
  toTribe: string;
  type: 'alliance' | 'peace_treaty' | 'trade_agreement' | 'non_aggression' | 'declare_war' | 'research_pact';
  terms: {
    duration?: number; // In days
    tribute?: { food?: number; materials?: number; knowledge?: number; };
    conditions?: string[];
  };
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  proposedDay: number;
}

export class DiplomacySystem {
  private relationships: Map<string, TribeRelationship> = new Map();
  private proposals: Map<string, DiplomaticProposal> = new Map();
  private proposalIdCounter = 0;
  private readonly TRIBES = ['Alpha', 'Beta', 'Gamma'];

  constructor() {
    this.initializeRelationships();
  }

  private initializeRelationships(): void {
    // Initialize relationships between all tribe pairs
    for (let i = 0; i < this.TRIBES.length; i++) {
      for (let j = i + 1; j < this.TRIBES.length; j++) {
        const tribe1 = this.TRIBES[i];
        const tribe2 = this.TRIBES[j];

        // Create bidirectional relationships
        this.setRelationship(tribe1, tribe2, {
          tribe: tribe1,
          otherTribe: tribe2,
          status: 'neutral',
          relationshipValue: 0,
          trustLevel: 50,
          lastInteractionDay: 0,
          tradeAgreement: false,
          nonAggressionPact: false,
          sharedResearch: false
        });

        this.setRelationship(tribe2, tribe1, {
          tribe: tribe2,
          otherTribe: tribe1,
          status: 'neutral',
          relationshipValue: 0,
          trustLevel: 50,
          lastInteractionDay: 0,
          tradeAgreement: false,
          nonAggressionPact: false,
          sharedResearch: false
        });
      }
    }
  }

  private getRelationshipKey(tribe: string, otherTribe: string): string {
    return `${tribe}-${otherTribe}`;
  }

  setRelationship(tribe: string, otherTribe: string, relationship: TribeRelationship): void {
    this.relationships.set(this.getRelationshipKey(tribe, otherTribe), relationship);
  }

  getRelationship(tribe: string, otherTribe: string): TribeRelationship | undefined {
    return this.relationships.get(this.getRelationshipKey(tribe, otherTribe));
  }

  modifyRelationshipValue(tribe: string, otherTribe: string, amount: number): void {
    const rel = this.getRelationship(tribe, otherTribe);
    if (rel) {
      rel.relationshipValue = Math.max(-100, Math.min(100, rel.relationshipValue + amount));
      this.updateRelationshipStatus(rel);
    }
  }

  private updateRelationshipStatus(rel: TribeRelationship): void {
    // Update status based on relationship value
    if (rel.relationshipValue >= 75) {
      rel.status = 'allied';
    } else if (rel.relationshipValue >= 40) {
      rel.status = 'friendly';
    } else if (rel.relationshipValue >= -20) {
      rel.status = 'neutral';
    } else if (rel.relationshipValue >= -50) {
      rel.status = 'unfriendly';
    } else if (rel.relationshipValue >= -80) {
      rel.status = 'hostile';
    } else {
      rel.status = 'war';
    }
  }

  createProposal(fromTribe: string, toTribe: string, type: DiplomaticProposal['type'], terms?: any): DiplomaticProposal {
    const proposal: DiplomaticProposal = {
      id: `proposal-${this.proposalIdCounter++}-${Date.now()}`,
      fromTribe,
      toTribe,
      type,
      terms: terms || {},
      status: 'pending',
      proposedDay: Date.now()
    };

    this.proposals.set(proposal.id, proposal);
    return proposal;
  }

  respondToProposal(proposalId: string, accept: boolean): boolean {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.status !== 'pending') return false;

    proposal.status = accept ? 'accepted' : 'rejected';

    if (accept) {
      this.applyProposalEffects(proposal);
    }

    return true;
  }

  private applyProposalEffects(proposal: DiplomaticProposal): void {
    const rel1 = this.getRelationship(proposal.fromTribe, proposal.toTribe);
    const rel2 = this.getRelationship(proposal.toTribe, proposal.fromTribe);

    if (!rel1 || !rel2) return;

    switch (proposal.type) {
      case 'alliance':
        rel1.status = 'allied';
        rel2.status = 'allied';
        rel1.relationshipValue = 80;
        rel2.relationshipValue = 80;
        rel1.nonAggressionPact = true;
        rel2.nonAggressionPact = true;
        rel1.tradeAgreement = true;
        rel2.tradeAgreement = true;
        break;

      case 'peace_treaty':
        rel1.status = 'neutral';
        rel2.status = 'neutral';
        rel1.relationshipValue = Math.max(0, rel1.relationshipValue);
        rel2.relationshipValue = Math.max(0, rel2.relationshipValue);
        break;

      case 'trade_agreement':
        rel1.tradeAgreement = true;
        rel2.tradeAgreement = true;
        rel1.relationshipValue += 20;
        rel2.relationshipValue += 20;
        break;

      case 'non_aggression':
        rel1.nonAggressionPact = true;
        rel2.nonAggressionPact = true;
        rel1.relationshipValue += 15;
        rel2.relationshipValue += 15;
        break;

      case 'declare_war':
        rel1.status = 'war';
        rel2.status = 'war';
        rel1.relationshipValue = -90;
        rel2.relationshipValue = -90;
        rel1.tradeAgreement = false;
        rel2.tradeAgreement = false;
        rel1.nonAggressionPact = false;
        rel2.nonAggressionPact = false;
        rel1.sharedResearch = false;
        rel2.sharedResearch = false;
        break;

      case 'research_pact':
        rel1.sharedResearch = true;
        rel2.sharedResearch = true;
        rel1.relationshipValue += 25;
        rel2.relationshipValue += 25;
        break;
    }

    this.updateRelationshipStatus(rel1);
    this.updateRelationshipStatus(rel2);
  }

  getProposalsByTribe(tribe: string): DiplomaticProposal[] {
    return Array.from(this.proposals.values()).filter(
      p => p.fromTribe === tribe || p.toTribe === tribe
    );
  }

  getPendingProposals(): DiplomaticProposal[] {
    return Array.from(this.proposals.values()).filter(p => p.status === 'pending');
  }

  // AI decision making for proposals
  evaluateProposal(proposal: DiplomaticProposal, currentRelationship: number): { accept: boolean; reason: string } {
    const rel = this.getRelationship(proposal.toTribe, proposal.fromTribe);

    if (!rel) {
      return { accept: false, reason: 'No relationship data' };
    }

    switch (proposal.type) {
      case 'alliance':
        if (rel.relationshipValue >= 60) {
          return { accept: true, reason: 'Friendly relationship' };
        }
        return { accept: false, reason: 'Relationship not strong enough' };

      case 'peace_treaty':
        if (rel.status === 'war' || rel.status === 'hostile') {
          if (rel.relationshipValue > -60) {
            return { accept: true, reason: 'Tired of war' };
          }
        }
        return { accept: false, reason: 'Not interested in peace' };

      case 'trade_agreement':
        if (rel.status !== 'war' && rel.status !== 'hostile') {
          return { accept: true, reason: 'Economic benefit' };
        }
        return { accept: false, reason: 'Too hostile for trade' };

      case 'non_aggression':
        if (rel.status !== 'war') {
          return { accept: true, reason: 'Mutual benefit' };
        }
        return { accept: false, reason: 'Currently at war' };

      case 'research_pact':
        if (rel.relationshipValue >= 30 && !rel.sharedResearch) {
          return { accept: true, reason: 'Scientific cooperation' };
        }
        return { accept: false, reason: 'Insufficient trust' };

      default:
        return { accept: false, reason: 'Unknown proposal type' };
    }
  }

  // Generate AI proposal based on current situation
  generateAIProposal(fromTribe: string, toTribe: string, agents1: any[], agents2: any[]): DiplomaticProposal | null {
    const rel = this.getRelationship(fromTribe, toTribe);
    if (!rel) return null;

    // Random chance to make proposal based on relationship
    const roll = Math.random() * 100;

    if (rel.status === 'war') {
      if (roll < 15) {
        return this.createProposal(fromTribe, toTribe, 'peace_treaty');
      }
    } else if (rel.status === 'hostile' || rel.status === 'unfriendly') {
      if (roll < 10) {
        return this.createProposal(fromTribe, toTribe, 'non_aggression');
      }
    } else if (rel.status === 'neutral') {
      if (roll < 8) {
        return this.createProposal(fromTribe, toTribe, 'trade_agreement');
      }
    } else if (rel.status === 'friendly') {
      if (roll < 12 && !rel.sharedResearch) {
        return this.createProposal(fromTribe, toTribe, 'research_pact');
      }
      if (roll < 8) {
        return this.createProposal(fromTribe, toTribe, 'non_aggression');
      }
    } else if (rel.status === 'allied') {
      // Allies rarely make new proposals
      if (roll < 5 && !rel.tradeAgreement) {
        return this.createProposal(fromTribe, toTribe, 'trade_agreement');
      }
    }

    return null;
  }

  // Check for expired agreements
  updateAgreements(currentDay: number): void {
    for (const rel of this.relationships.values()) {
      // Agreements could expire over time
      // For now, this is a placeholder for future expansion
      if (rel.relationshipValue < -70 && rel.tradeAgreement) {
        rel.tradeAgreement = false;
      }
      if (rel.relationshipValue < -50 && rel.nonAggressionPact) {
        rel.nonAggressionPact = false;
      }
      if (rel.relationshipValue < 30 && rel.sharedResearch) {
        rel.sharedResearch = false;
      }
    }
  }

  // Get trade modifier based on relationship
  getTradeModifier(tribe: string, otherTribe: string): number {
    const rel = this.getRelationship(tribe, otherTribe);
    if (!rel) return 1.0;

    if (rel.tradeAgreement) return 1.5; // 50% bonus with trade agreement

    // Modify based on relationship
    if (rel.status === 'allied') return 1.3;
    if (rel.status === 'friendly') return 1.15;
    if (rel.status === 'neutral') return 1.0;
    if (rel.status === 'unfriendly') return 0.8;
    if (rel.status === 'hostile') return 0.5;
    if (rel.status === 'war') return 0.1;

    return 1.0;
  }

  // Check if tribes can fight
  canFight(tribe: string, otherTribe: string): boolean {
    const rel = this.getRelationship(tribe, otherTribe);
    if (!rel) return true;

    if (rel.nonAggressionPact || rel.status === 'allied') {
      return false;
    }

    return true;
  }

  getAllRelationships(): TribeRelationship[] {
    return Array.from(this.relationships.values());
  }

  public serialize(): any {
    return {
      relationships: Array.from(this.relationships.entries()),
      proposals: Array.from(this.proposals.entries()),
      proposalIdCounter: this.proposalIdCounter
    };
  }

  public deserialize(data: any): void {
    this.relationships = new Map(data.relationships || []);
    this.proposals = new Map(data.proposals || []);
    this.proposalIdCounter = data.proposalIdCounter || 0;
  }
}
