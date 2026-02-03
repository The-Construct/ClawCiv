// Organization System for ClawCiv
// Agents can form corporations, guilds, DAOs, cooperatives, etc.

export type OrgType = 'corporation' | 'guild' | 'dao' | 'cooperative' | 'union' | 'religion' | 'cult';

export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  tribe: string;
  description: string;
  icon: string;
  leaderId: string; // Agent ID of the leader
  members: Set<string>; // Agent IDs
  foundedDay: number;
  resources: {
    treasury: number; // $CLAW tokens
    food: number;
    energy: number;
    materials: number;
    knowledge: number;
    socialCapital: number;
  };
  stats: {
    influence: number; // 0-100, affects ability to recruit
    stability: number; // 0-100, affects resistance to splits
    productivity: number; // 0-100, affects member output
    approval: number; // 0-100, member satisfaction
  };
  properties: {
    canMerge: boolean;
    canSplit: boolean;
    canHostileTakeover: boolean;
    taxRate?: number; // For corporations
    votingWeight?: 'one-member-one-vote' | 'token-based' | 'reputation-based';
    profitSharing?: boolean; // For cooperatives
  };
  goals: string[]; // What the org aims to achieve
  activeProjects: string[];
}

export class OrganizationSystem {
  private organizations: Map<string, Organization> = new Map();
  private orgIdCounter = 0;

  constructor() {}

  // Create a new organization
  createOrganization(
    name: string,
    type: OrgType,
    tribe: string,
    leaderId: string,
    description: string,
    foundingMembers: string[]
  ): Organization | null {
    // Check if leader already leads an org
    for (const org of this.organizations.values()) {
      if (org.leaderId === leaderId) {
        return null; // Can only lead one org
      }
    }

    const org: Organization = {
      id: `org-${this.orgIdCounter++}-${Date.now()}`,
      name,
      type,
      tribe,
      description,
      icon: this.getOrgIcon(type),
      leaderId,
      members: new Set(foundingMembers),
      foundedDay: Date.now(),
      resources: {
        treasury: 100,
        food: 50,
        energy: 50,
        materials: 30,
        knowledge: 20,
        socialCapital: 30
      },
      stats: {
        influence: 30,
        stability: 80,
        productivity: 70,
        approval: 75
      },
      properties: this.getOrgProperties(type),
      goals: this.getOrgGoals(type),
      activeProjects: []
    };

    this.organizations.set(org.id, org);
    return org;
  }

  private getOrgIcon(type: OrgType): string {
    const icons = {
      corporation: '🏢',
      guild: '⚒️',
      dao: '🗳️',
      cooperative: '🤝',
      union: '✊',
      religion: '⛪',
      cult: '👁️'
    };
    return icons[type] || '🏛️';
  }

  private getOrgProperties(type: OrgType): Organization['properties'] {
    const baseProps = {
      canMerge: true,
      canSplit: true,
      canHostileTakeover: false
    };

    switch (type) {
      case 'corporation':
        return {
          ...baseProps,
          canHostileTakeover: true,
          taxRate: 0.1,
          votingWeight: 'token-based'
        };
      case 'guild':
        return {
          ...baseProps,
          canHostileTakeover: false,
          votingWeight: 'reputation-based'
        };
      case 'dao':
        return {
          ...baseProps,
          canHostileTakeover: false,
          votingWeight: 'token-based'
        };
      case 'cooperative':
        return {
          ...baseProps,
          canHostileTakeover: false,
          profitSharing: true,
          votingWeight: 'one-member-one-vote'
        };
      case 'union':
        return {
          ...baseProps,
          canSplit: false,
          votingWeight: 'one-member-one-vote'
        };
      case 'religion':
      case 'cult':
        return {
          ...baseProps,
          canMerge: false,
          canSplit: false,
          canHostileTakeover: false
        };
      default:
        return baseProps;
    }
  }

  private getOrgGoals(type: OrgType): string[] {
    switch (type) {
      case 'corporation':
        return ['Maximize profit', 'Expand operations', 'Acquire competitors'];
      case 'guild':
        return ['Protect trade secrets', 'Train members', 'Set standards'];
      case 'dao':
        return ['Democratic governance', 'Transparent operations', 'Community benefit'];
      case 'cooperative':
        return ['Shared prosperity', 'Fair distribution', 'Member welfare'];
      case 'union':
        return ['Worker rights', 'Better conditions', 'Collective bargaining'];
      case 'religion':
        return ['Spread faith', 'Build temples', 'Moral guidance'];
      case 'cult':
        return ['Recruit followers', 'Leader worship', 'Expand influence'];
      default:
        return ['Survive and thrive'];
    }
  }

  getOrganization(id: string): Organization | undefined {
    return this.organizations.get(id);
  }

  getOrganizationsByType(type: OrgType): Organization[] {
    return Array.from(this.organizations.values()).filter(o => o.type === type);
  }

  getOrganizationsByTribe(tribe: string): Organization[] {
    return Array.from(this.organizations.values()).filter(o => o.tribe === tribe);
  }

  getOrganizationsByMember(agentId: string): Organization[] {
    return Array.from(this.organizations.values()).filter(o => o.members.has(agentId));
  }

  getAllOrganizations(): Organization[] {
    return Array.from(this.organizations.values());
  }

  // Add a member to an organization
  addMember(orgId: string, agentId: string): boolean {
    const org = this.organizations.get(orgId);
    if (!org) return false;

    org.members.add(agentId);
    // Adjust stats based on new member
    org.stats.influence = Math.min(100, org.stats.influence + 5);
    return true;
  }

  // Remove a member from an organization
  removeMember(orgId: string, agentId: string): boolean {
    const org = this.organizations.get(orgId);
    if (!org || !org.members.has(agentId)) return false;

    org.members.delete(agentId);

    // If leader leaves, need new leader
    if (org.leaderId === agentId) {
      const members = Array.from(org.members);
      if (members.length > 0) {
        org.leaderId = members[0]; // First member becomes new leader
      } else {
        // No members left, dissolve org
        this.organizations.delete(orgId);
      }
    }

    return true;
  }

  // Merge two organizations
  mergeOrganizations(targetOrgId: string, sourceOrgId: string): boolean {
    const target = this.organizations.get(targetOrgId);
    const source = this.organizations.get(sourceOrgId);

    if (!target || !source) return false;
    if (target.type !== source.type) return false; // Must be same type to merge
    if (!target.properties.canMerge || !source.properties.canMerge) return false;

    // Transfer all members
    for (const memberId of source.members) {
      target.members.add(memberId);
    }

    // Transfer resources
    target.resources.treasury += source.resources.treasury;
    target.resources.food += source.resources.food;
    target.resources.energy += source.resources.energy;
    target.resources.materials += source.resources.materials;
    target.resources.knowledge += source.resources.knowledge;
    target.resources.socialCapital += source.resources.socialCapital;

    // Boost stats
    target.stats.influence = Math.min(100, target.stats.influence + 20);
    target.stats.stability = Math.min(100, target.stats.stability + 10);

    // Remove source org
    this.organizations.delete(sourceOrgId);

    return true;
  }

  // Split an organization (creates new org with portion of members)
  splitOrganization(orgId: string, newLeaderId: string, splitPercent: number = 0.5): Organization | null {
    const org = this.organizations.get(orgId);
    if (!org || !org.properties.canSplit) return null;
    if (!org.members.has(newLeaderId)) return null;
    if (splitPercent < 0.1 || splitPercent > 0.9) return null;

    const membersToTransfer = Math.floor(org.members.size * splitPercent);
    if (membersToTransfer < 1) return null;

    // Remove members from original org
    const transferredMembers: string[] = [];
    let count = 0;
    for (const memberId of org.members) {
      if (count >= membersToTransfer) break;
      if (memberId === newLeaderId) {
        org.members.delete(memberId);
        transferredMembers.push(memberId);
        count++;
      } else if (Math.random() < splitPercent && count < membersToTransfer - 1) {
        org.members.delete(memberId);
        transferredMembers.push(memberId);
        count++;
      }
    }

    // Create new org
    const newOrg = this.createOrganization(
      org.name + ' (Splinter)',
      org.type,
      org.tribe,
      newLeaderId,
      'Breakaway faction',
      transferredMembers
    );

    if (newOrg) {
      // Transfer portion of resources
      newOrg.resources.treasury = Math.floor(org.resources.treasury * splitPercent);
      newOrg.resources.food = Math.floor(org.resources.food * splitPercent);
      newOrg.resources.energy = Math.floor(org.resources.energy * splitPercent);
      newOrg.resources.materials = Math.floor(org.resources.materials * splitPercent);
      newOrg.resources.knowledge = Math.floor(org.resources.knowledge * splitPercent);
      newOrg.resources.socialCapital = Math.floor(org.resources.socialCapital * splitPercent);

      // Deduct from original
      org.resources.treasury -= newOrg.resources.treasury;
      org.resources.food -= newOrg.resources.food;
      org.resources.energy -= newOrg.resources.energy;
      org.resources.materials -= newOrg.resources.materials;
      org.resources.knowledge -= newOrg.resources.knowledge;
      org.resources.socialCapital -= newOrg.resources.socialCapital;

      // Reduce stability of both orgs
      org.stats.stability = Math.max(0, org.stats.stability - 30);
      newOrg.stats.stability = Math.max(0, newOrg.stats.stability - 20);
    }

    return newOrg;
  }

  // Hostile takeover (corporation only)
  hostileTakeover(targetOrgId: string, acquirerOrgId: string): boolean {
    const target = this.organizations.get(targetOrgId);
    const acquirer = this.organizations.get(acquirerOrgId);

    if (!target || !acquirer) return false;
    if (target.type !== 'corporation' || acquirer.type !== 'corporation') return false;
    if (!acquirer.properties.canHostileTakeover) return false;

    // Acquirer needs more resources/influence
    if (acquirer.stats.influence <= target.stats.influence) return false;

    // Transfer ownership
    target.leaderId = acquirer.leaderId;
    target.tribe = acquirer.tribe;

    // Transfer resources
    acquirer.resources.treasury += target.resources.treasury * 0.5;
    target.resources.treasury *= 0.5;

    // Boost acquirer stats
    acquirer.stats.influence = Math.min(100, acquirer.stats.influence + 30);
    target.stats.stability = Math.max(0, target.stats.stability - 40);
    target.stats.approval = Math.max(0, target.stats.approval - 50);

    return true;
  }

  // Update organization stats based on member actions
  updateOrgStats(agentId: string, action: string, resourceType?: string): void {
    const orgs = this.getOrganizationsByMember(agentId);

    for (const org of orgs) {
      // Productivity based on org type and action
      let productivityGain = 0;
      if (this.actionMatchesOrgGoal(action, org)) {
        productivityGain = 5;
      }

      org.stats.productivity = Math.min(100, org.stats.productivity + productivityGain * 0.1);

      // Approval changes slowly
      if (Math.random() < 0.05) {
        const change = Math.floor(Math.random() * 10) - 3; // -3 to +6
        org.stats.approval = Math.max(0, Math.min(100, org.stats.approval + change));
      }
    }
  }

  private actionMatchesOrgGoal(action: string, org: Organization): boolean {
    const goalMap: { [key: string]: string[] } = {
      corporation: ['farming', 'mining', 'trade'],
      guild: ['crafting', 'mining', 'trade'],
      dao: ['diplomacy', 'research', 'trade'],
      cooperative: ['farming', 'building', 'trade'],
      union: ['farming', 'mining', 'crafting'],
      religion: ['diplomacy', 'building', 'research'],
      cult: ['diplomacy', 'trade']
    };

    const orgActions = goalMap[org.type] || [];
    return orgActions.includes(action);
  }

  // Collect "taxes" from members (for corporations)
  collectTaxes(orgId: string): { [key: string]: number } {
    const org = this.organizations.get(orgId);
    if (!org || org.type !== 'corporation') return {};

    const taxRate = org.properties.taxRate || 0;
    const collected: { [key: string]: number } = {};

    // Would collect from member resources
    // For now, generate based on member count
    const memberCount = org.members.size;
    collected.food = Math.floor(memberCount * 5 * taxRate);
    collected.energy = Math.floor(memberCount * 3 * taxRate);
    collected.materials = Math.floor(memberCount * 2 * taxRate);

    // Add to org treasury
    org.resources.food += collected.food;
    org.resources.energy += collected.energy;
    org.resources.materials += collected.materials;

    return collected;
  }

  // Distribute profits (for cooperatives)
  distributeProfits(orgId: string): void {
    const org = this.organizations.get(orgId);
    if (!org || !org.properties.profitSharing) return;

    const memberCount = org.members.size;
    if (memberCount === 0) return;

    const profitPerMember = {
      food: Math.floor(org.resources.food / memberCount),
      energy: Math.floor(org.resources.energy / memberCount),
      materials: Math.floor(org.resources.materials / memberCount),
      knowledge: Math.floor(org.resources.knowledge / memberCount),
      socialCapital: Math.floor(org.resources.socialCapital / memberCount)
    };

    // Would distribute to member agents
    org.resources.food -= profitPerMember.food * memberCount;
    org.resources.energy -= profitPerMember.energy * memberCount;
    org.resources.materials -= profitPerMember.materials * memberCount;
    org.resources.knowledge -= profitPerMember.knowledge * memberCount;
    org.resources.socialCapital -= profitPerMember.socialCapital * memberCount;

    org.stats.approval = Math.min(100, org.stats.approval + 10);
  }

  // Check for org events (splits, mergers, dissolutions)
  updateOrganizations(currentDay: number): { events: string[] } {
    const events: string[] = [];

    for (const org of this.organizations.values()) {
      // Low approval can cause splits
      if (org.stats.approval < 20 && org.properties.canSplit && org.members.size >= 3) {
        // Find a member to lead the split
        const members = Array.from(org.members).filter(m => m !== org.leaderId);
        if (members.length > 0) {
          const newLeader = members[Math.floor(Math.random() * members.length)];
          const splinter = this.splitOrganization(org.id, newLeader, 0.3);
          if (splinter) {
            events.push(`⚡ ${org.name} split! ${splinter.name} formed with ${splinter.members.size} members.`);
          }
        }
      }

      // Low stability can cause dissolution
      if (org.stats.stability < 10 && org.members.size < 3) {
        events.push(`💔 ${org.name} has dissolved due to instability!`);
        this.organizations.delete(org.id);
      }

      // High influence orgs can try to expand
      if (org.stats.influence > 80 && org.type === 'corporation') {
        const smallerOrgs = Array.from(this.organizations.values()).filter(o =>
          o.id !== org.id &&
          o.type === 'corporation' &&
          o.stats.influence < org.stats.influence * 0.5
        );

        if (smallerOrgs.length > 0 && Math.random() < 0.05) {
          const target = smallerOrgs[Math.floor(Math.random() * smallerOrgs.length)];
          if (this.hostileTakeover(target.id, org.id)) {
            events.push(`🏢 ${org.name} has acquired ${target.name}!`);
          }
        }
      }
    }

    return { events };
  }

  public serialize(): any {
    return {
      organizations: Array.from(this.organizations.entries()),
      orgIdCounter: this.orgIdCounter
    };
  }

  public deserialize(data: any): void {
    this.organizations = new Map(data.organizations || []);
    // Convert members arrays back to Sets
    for (const [id, org] of this.organizations) {
      if (Array.isArray(org.members)) {
        org.members = new Set(org.members);
      }
    }
    this.orgIdCounter = data.orgIdCounter || 0;
  }
}
