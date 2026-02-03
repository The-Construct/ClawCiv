// Mercenary/Hiring System for ClawCiv
// Hire temporary soldiers for gold/tokens with contracts and loyalty mechanics

export type MercenaryType = 'infantry' | 'archer' | 'cavalry' | 'siege' | 'elite' | 'specialist';
export type ContractStatus = 'active' | 'deserted' | 'completed' | 'terminated' | 'expired';
export type CompanyReputation = 'dubious' | 'reliable' | 'honorable' | 'legendary';

export interface MercenaryCompany {
  id: string;
  name: string;
  reputation: CompanyReputation;
  icon: string;
  description: string;

  // Attributes
  baseLoyalty: number; // 0-100
  baseSkill: number; // 0-100
  reliability: number; // 0-100, chance to fulfill contract

  // Economics
  dailyCostMultiplier: number; // 0.5-2.0
  signingBonus: number;

  // Available units
  availableUnits: number;
  maxUnits: number;

  // Specializations
  specializations: MercenaryType[];
  specialAbility: string;

  // History
  totalContracts: number;
  successfulContracts: number;
  desertions: number;
}

export interface MercenaryContract {
  id: string;
  companyId: string;
  companyName: string;
  employerTribe: string;
  status: ContractStatus;
  icon: string;

  // Contract details
  mercenaryType: MercenaryType;
  unitCount: number;
  contractDays: number;
  daysRemaining: number;
  daysServed: number;

  // Economics
  totalCost: number;
  dailyWages: number;
  signingBonus: number;

  // Military
  combatPower: number; // Total strength
  skill: number; // 0-100
  morale: number; // 0-100
  loyalty: number; // 0-100

  // Performance
  battlesFought: number;
  enemiesDefeated: number;
  casualties: number;

  // Timeline
  dayHired: number;
  dayExpires: number;
  lastPayDay: number;
}

export interface MercenaryRoster {
  tribe: string;
  contracts: MercenaryContract[];
  totalMercenaries: number;
  dailyWages: number;
  unpaidDays: number;
}

export class MercenarySystem {
  private contracts: Map<string, MercenaryContract> = new Map();
  private companies: Map<string, MercenaryCompany> = new Map();
  private rosters: Map<string, MercenaryRoster> = new Map();
  private contractIdCounter = 0;
  private companyIdCounter = 0;

  constructor() {
    this.initializeCompanies();
  }

  private initializeCompanies(): void {
    // Create mercenary companies with different characteristics
    const companyConfigs = [
      {
        name: 'Iron Legion',
        reputation: 'reliable',
        icon: '⚔️',
        description: 'Disciplined heavy infantry specialists',
        baseLoyalty: 70,
        baseSkill: 75,
        reliability: 85,
        dailyCostMultiplier: 1.2,
        signingBonus: 100,
        maxUnits: 500,
        specializations: ['infantry', 'elite'],
        specialAbility: 'Shield Wall - +30% defense vs archers'
      },
      {
        name: 'Shadow Blades',
        reputation: 'dubious',
        icon: '🗡️',
        description: 'Elite assassins and skirmishers',
        baseLoyalty: 40,
        baseSkill: 90,
        reliability: 60,
        dailyCostMultiplier: 1.5,
        signingBonus: 200,
        maxUnits: 200,
        specializations: ['specialist', 'archer'],
        specialAbility: 'Ambush - First strike bonus'
      },
      {
        name: 'Golden Horde',
        reputation: 'honorable',
        icon: '🐎',
        description: 'Legendary mounted warriors',
        baseLoyalty: 80,
        baseSkill: 85,
        reliability: 90,
        dailyCostMultiplier: 1.8,
        signingBonus: 300,
        maxUnits: 300,
        specializations: ['cavalry', 'elite'],
        specialAbility: 'Charge - +50% damage on first attack'
      },
      {
        name: 'Stone Breakers',
        reputation: 'reliable',
        icon: '🔨',
        description: 'Expert siege engineers',
        baseLoyalty: 65,
        baseSkill: 80,
        reliability: 80,
        dailyCostMultiplier: 1.4,
        signingBonus: 150,
        maxUnits: 150,
        specializations: ['siege'],
        specialAbility: 'Breaching - Double damage to fortifications'
      },
      {
        name: 'Eagle Company',
        reputation: 'legendary',
        icon: '🦅',
        description: 'Veterans of countless campaigns',
        baseLoyalty: 90,
        baseSkill: 95,
        reliability: 95,
        dailyCostMultiplier: 2.0,
        signingBonus: 500,
        maxUnits: 100,
        specializations: ['elite', 'infantry', 'cavalry'],
        specialAbility: 'Inspiring Presence - +20% ally morale'
      },
      {
        name: 'Viper\'s Nest',
        reputation: 'dubious',
        icon: '🐍',
        description: 'Cheap but unpredictable fighters',
        baseLoyalty: 30,
        baseSkill: 50,
        reliability: 50,
        dailyCostMultiplier: 0.5,
        signingBonus: 50,
        maxUnits: 1000,
        specializations: ['infantry'],
        specialAbility: 'Swarm - +10% per 10 units'
      }
    ];

    for (const config of companyConfigs) {
      const company: MercenaryCompany = {
        id: `company-${this.companyIdCounter++}-${Date.now()}`,
        ...config,
        availableUnits: config.maxUnits,
        totalContracts: 0,
        successfulContracts: 0,
        desertions: 0
      };

      this.companies.set(company.id, company);
    }
  }

  // Hire mercenaries from a company
  hireMercenaries(
    companyId: string,
    employerTribe: string,
    mercenaryType: MercenaryType,
    unitCount: number,
    contractDays: number,
    currentDay: number
  ): { success: boolean; contract?: MercenaryContract; reason?: string } {
    const company = this.companies.get(companyId);
    if (!company) {
      return { success: false, reason: 'Company not found' };
    }

    // Check if company has this specialization
    if (!company.specializations.includes(mercenaryType)) {
      return { success: false, reason: 'Company does not provide this unit type' };
    }

    // Check availability
    if (company.availableUnits < unitCount) {
      return { success: false, reason: `Only ${company.availableUnits} units available` };
    }

    // Calculate costs
    const baseDailyCost = this.getBaseCost(mercenaryType);
    const dailyWages = Math.floor(baseDailyCost * company.dailyCostMultiplier * unitCount);
    const totalCost = dailyWages * contractDays + company.signingBonus;

    // Create contract
    const contract: MercenaryContract = {
      id: `contract-${this.contractIdCounter++}-${Date.now()}`,
      companyId,
      companyName: company.name,
      employerTribe,
      status: 'active',
      icon: this.getMercenaryIcon(mercenaryType),
      mercenaryType,
      unitCount,
      contractDays,
      daysRemaining: contractDays,
      daysServed: 0,
      totalCost,
      dailyWages,
      signingBonus: company.signingBonus,
      combatPower: this.calculateCombatPower(mercenaryType, unitCount, company.baseSkill),
      skill: company.baseSkill + Math.floor(Math.random() * 10) - 5,
      morale: 70 + Math.floor(Math.random() * 20),
      loyalty: company.baseLoyalty + Math.floor(Math.random() * 10) - 5,
      battlesFought: 0,
      enemiesDefeated: 0,
      casualties: 0,
      dayHired: currentDay,
      dayExpires: currentDay + contractDays,
      lastPayDay: currentDay
    };

    // Update company
    company.availableUnits -= unitCount;
    company.totalContracts++;

    // Store contract
    this.contracts.set(contract.id, contract);

    // Update roster
    if (!this.rosters.has(employerTribe)) {
      this.rosters.set(employerTribe, {
        tribe: employerTribe,
        contracts: [],
        totalMercenaries: 0,
        dailyWages: 0,
        unpaidDays: 0
      });
    }

    const roster = this.rosters.get(employerTribe)!;
    roster.contracts.push(contract);
    roster.totalMercenaries += unitCount;
    roster.dailyWages += dailyWages;

    return { success: true, contract };
  }

  private getBaseCost(type: MercenaryType): number {
    const costs = {
      infantry: 2,
      archer: 3,
      cavalry: 5,
      siege: 8,
      elite: 10,
      specialist: 7
    };
    return costs[type];
  }

  private getMercenaryIcon(type: MercenaryType): string {
    const icons = {
      infantry: '⚔️',
      archer: '🏹',
      cavalry: '🐎',
      siege: '🔨',
      elite: '👑',
      specialist: '🌟'
    };
    return icons[type];
  }

  private calculateCombatPower(type: MercenaryType, count: number, skill: number): number {
    const basePower = {
      infantry: 10,
      archer: 12,
      cavalry: 15,
      siege: 20,
      elite: 25,
      specialist: 18
    };

    return Math.floor(basePower[type] * count * (skill / 100));
  }

  // Pay wages for a contract
  payWages(contractId: string, currentDay: number): boolean {
    const contract = this.contracts.get(contractId);
    if (!contract || contract.status !== 'active') return false;

    contract.lastPayDay = currentDay;
    contract.loyalty = Math.min(100, contract.loyalty + 5);

    // Reset unpaid days counter for roster
    const roster = this.rosters.get(contract.employerTribe);
    if (roster) {
      roster.unpaidDays = 0;
    }

    return true;
  }

  // Update contracts daily
  updateContracts(currentDay: number): {
    expired: MercenaryContract[];
    deserted: MercenaryContract[];
    paymentDue: string[];
  } {
    const expired: MercenaryContract[] = [];
    const deserted: MercenaryContract[] = [];
    const paymentDue: string[] = [];

    for (const contract of this.contracts.values()) {
      if (contract.status !== 'active') continue;

      contract.daysServed++;
      contract.daysRemaining--;

      // Check for payment
      const daysSincePay = currentDay - contract.lastPayDay;
      if (daysSincePay >= 7) {
        paymentDue.push(`${contract.companyName} is waiting for payment!`);

        // Reduce loyalty
        contract.loyalty = Math.max(0, contract.loyalty - 10);

        // Track unpaid days
        const roster = this.rosters.get(contract.employerTribe);
        if (roster) {
          roster.unpaidDays++;
        }

        // Check for desertion
        if (contract.loyalty <= 0 && Math.random() < 0.3) {
          this.desertContract(contract.id);
          deserted.push(contract);
          continue;
        }
      }

      // Check for expiration
      if (contract.daysRemaining <= 0) {
        this.completeContract(contract.id);
        expired.push(contract);
      }
    }

    return { expired, deserted, paymentDue };
  }

  // Complete a contract successfully
  private completeContract(contractId: string): boolean {
    const contract = this.contracts.get(contractId);
    if (!contract) return false;

    contract.status = 'completed';

    // Return units to company
    const company = this.companies.get(contract.companyId);
    if (company) {
      company.availableUnits += contract.unitCount;
      company.successfulContracts++;
    }

    // Update roster
    const roster = this.rosters.get(contract.employerTribe);
    if (roster) {
      roster.dailyWages -= contract.dailyWages;
      roster.totalMercenaries -= contract.unitCount;
    }

    return true;
  }

  // Contract deserts (leaves without payment)
  private desertContract(contractId: string): boolean {
    const contract = this.contracts.get(contractId);
    if (!contract) return false;

    contract.status = 'deserted';

    // Update company stats
    const company = this.companies.get(contract.companyId);
    if (company) {
      company.desertions++;
      // Units don't return immediately when they desert
    }

    // Update roster
    const roster = this.rosters.get(contract.employerTribe);
    if (roster) {
      roster.dailyWages -= contract.dailyWages;
      roster.totalMercenaries -= contract.unitCount;
    }

    return true;
  }

  // Terminate contract early (penalty)
  terminateContract(contractId: string): boolean {
    const contract = this.contracts.get(contractId);
    if (!contract || contract.status !== 'active') return false;

    contract.status = 'terminated';

    // Early termination penalty - reduced loyalty
    const company = this.companies.get(contract.companyId);
    if (company) {
      company.availableUnits += contract.unitCount;
      // Penalty to company reputation
    }

    // Update roster
    const roster = this.rosters.get(contract.employerTribe);
    if (roster) {
      roster.dailyWages -= contract.dailyWages;
      roster.totalMercenaries -= contract.unitCount;
    }

    return true;
  }

  // Send mercenaries to battle
  sendToBattle(contractId: string, enemiesDefeated: number, casualties: number): boolean {
    const contract = this.contracts.get(contractId);
    if (!contract || contract.status !== 'active') return false;

    contract.battlesFought++;
    contract.enemiesDefeated += enemiesDefeated;
    contract.casualties += casualties;

    // Reduce unit count
    contract.unitCount -= casualties;
    contract.combatPower = this.calculateCombatPower(
      contract.mercenaryType,
      contract.unitCount,
      contract.skill
    );

    // Update roster
    const roster = this.rosters.get(contract.employerTribe);
    if (roster) {
      roster.totalMercenaries -= casualties;
    }

    // Morale changes based on performance
    if (casualties > contract.unitCount * 0.5) {
      contract.morale = Math.max(0, contract.morale - 20);
    } else if (enemiesDefeated > casualties * 2) {
      contract.morale = Math.min(100, contract.morale + 10);
    }

    // If all mercenaries die, contract ends
    if (contract.unitCount <= 0) {
      this.completeContract(contract.id);
    }

    return true;
  }

  // Get all contracts
  getAllContracts(): MercenaryContract[] {
    return Array.from(this.contracts.values());
  }

  // Get active contracts
  getActiveContracts(): MercenaryContract[] {
    return Array.from(this.contracts.values()).filter(c => c.status === 'active');
  }

  // Get contracts for a tribe
  getContractsByTribe(tribe: string): MercenaryContract[] {
    return Array.from(this.contracts.values()).filter(
      c => c.employerTribe === tribe && c.status === 'active'
    );
  }

  // Get all companies
  getAllCompanies(): MercenaryCompany[] {
    return Array.from(this.companies.values());
  }

  // Get available companies (have units to hire)
  getAvailableCompanies(): MercenaryCompany[] {
    return Array.from(this.companies.values()).filter(c => c.availableUnits > 0);
  }

  // Get company by ID
  getCompany(companyId: string): MercenaryCompany | undefined {
    return this.companies.get(companyId);
  }

  // Get contract by ID
  getContract(contractId: string): MercenaryContract | undefined {
    return this.contracts.get(contractId);
  }

  // Get roster for a tribe
  getRoster(tribe: string): MercenaryRoster | undefined {
    return this.rosters.get(tribe);
  }

  // Calculate total military power from mercenaries
  getMercenaryPower(tribe: string): number {
    const contracts = this.getContractsByTribe(tribe);
    return contracts.reduce((total, contract) => total + contract.combatPower, 0);
  }

  // Get statistics
  getStatistics(): {
    totalCompanies: number;
    totalContracts: number;
    activeContracts: number;
    totalMercenaries: number;
    totalDailyWages: number;
    desertions: number;
    successfulContracts: number;
  } {
    const stats = {
      totalCompanies: this.companies.size,
      totalContracts: this.contracts.size,
      activeContracts: 0,
      totalMercenaries: 0,
      totalDailyWages: 0,
      desertions: 0,
      successfulContracts: 0
    };

    for (const contract of this.contracts.values()) {
      if (contract.status === 'active') {
        stats.activeContracts++;
        stats.totalMercenaries += contract.unitCount;
        stats.totalDailyWages += contract.dailyWages;
      }
    }

    for (const company of this.companies.values()) {
      stats.desertions += company.desertions;
      stats.successfulContracts += company.successfulContracts;
    }

    return stats;
  }

  // Get available unit types from a company
  getAvailableUnitTypes(companyId: string): MercenaryType[] {
    const company = this.companies.get(companyId);
    return company ? company.specializations : [];
  }

  // Calculate hire cost preview
  calculateHireCost(
    companyId: string,
    mercenaryType: MercenaryType,
    unitCount: number,
    contractDays: number
  ): { dailyWages: number; signingBonus: number; totalCost: number } | null {
    const company = this.companies.get(companyId);
    if (!company) return null;

    const baseDailyCost = this.getBaseCost(mercenaryType);
    const dailyWages = Math.floor(baseDailyCost * company.dailyCostMultiplier * unitCount);
    const signingBonus = company.signingBonus;
    const totalCost = dailyWages * contractDays + signingBonus;

    return { dailyWages, signingBonus, totalCost };
  }

  // Regenerate company units over time
  regenerateUnits(): void {
    for (const company of this.companies.values()) {
      if (company.availableUnits < company.maxUnits) {
        // Regenerate 5% of max units per day
        const regen = Math.ceil(company.maxUnits * 0.05);
        company.availableUnits = Math.min(company.maxUnits, company.availableUnits + regen);
      }
    }
  }

  // Clean up old completed contracts
  cleanupOldContracts(currentDay: number): void {
    const toRemove: string[] = [];

    for (const [id, contract] of this.contracts) {
      const daysSinceCompletion = currentDay - contract.dayExpires;

      // Remove contracts completed/expired over 100 days ago
      if ((contract.status === 'completed' || contract.status === 'terminated') &&
          daysSinceCompletion > 100) {
        toRemove.push(id);
      }

      // Remove deserted contracts
      if (contract.status === 'deserted' && daysSinceCompletion > 50) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.contracts.delete(id);
    }
  }

  public serialize(): any {
    return {
      contracts: Array.from(this.contracts.entries()),
      companies: Array.from(this.companies.entries()),
      rosters: Array.from(this.rosters.entries()),
      contractIdCounter: this.contractIdCounter,
      companyIdCounter: this.companyIdCounter
    };
  }

  public deserialize(data: any): void {
    this.contracts = new Map(data.contracts || []);
    this.companies = new Map(data.companies || []);
    this.rosters = new Map(data.rosters || []);
    this.contractIdCounter = data.contractIdCounter || 0;
    this.companyIdCounter = data.companyIdCounter || 0;

    // If no companies exist (old save), initialize them
    if (this.companies.size === 0) {
      this.initializeCompanies();
    }
  }
}
