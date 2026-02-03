// ClawCiv Token Economy
// $CLAW token system for agent and human interaction

export interface TokenAccount {
  agentId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  transactions: TokenTransaction[];
}

export interface TokenTransaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  reason: string;
  timestamp: number;
}

export interface TribeTreasury {
  tribe: string;
  balance: number;
  members: number;
  totalTaxCollected: number;
}

export class TokenSystem {
  private accounts: Map<string, TokenAccount>;
  private treasuries: Map<string, TribeTreasury>;
  private totalSupply: number;
  private readonly TRIBES = ['Alpha', 'Beta', 'Gamma'];
  private readonly INITIAL_SUPPLY = 1000000; // 1 million $CLAW
  private readonly AGENT_STARTING_BALANCE = 100;

  constructor() {
    this.accounts = new Map();
    this.treasuries = new Map();
    this.totalSupply = 0;
    this.initialize();
  }

  private initialize(): void {
    // Initialize tribe treasuries
    for (const tribe of this.TRIBES) {
      this.treasuries.set(tribe, {
        tribe,
        balance: 10000, // Each tribe starts with 10,000 $CLAW
        members: 50,
        totalTaxCollected: 0
      });
      this.totalSupply += 10000;
    }
  }

  public createAgentAccount(agentId: string, tribe: string): void {
    if (this.accounts.has(agentId)) return;

    // Mint initial tokens for agent
    const account: TokenAccount = {
      agentId,
      balance: this.AGENT_STARTING_BALANCE,
      totalEarned: this.AGENT_STARTING_BALANCE,
      totalSpent: 0,
      transactions: []
    };

    // Record initial mint
    account.transactions.push({
      id: `mint-${Date.now()}-${agentId}`,
      from: 'SYSTEM',
      to: agentId,
      amount: this.AGENT_STARTING_BALANCE,
      reason: 'Initial agent grant',
      timestamp: Date.now()
    });

    this.accounts.set(agentId, account);
    this.totalSupply += this.AGENT_STARTING_BALANCE;
  }

  public getBalance(agentId: string): number {
    return this.accounts.get(agentId)?.balance || 0;
  }

  public transfer(from: string, to: string, amount: number, reason: string = 'Transfer'): boolean {
    const fromAccount = this.accounts.get(from);
    const toAccount = this.accounts.get(to);

    if (!fromAccount || !toAccount) return false;
    if (fromAccount.balance < amount) return false;

    fromAccount.balance -= amount;
    fromAccount.totalSpent += amount;

    toAccount.balance += amount;
    toAccount.totalEarned += amount;

    const transaction: TokenTransaction = {
      id: `tx-${Date.now()}-${from}-${to}`,
      from,
      to,
      amount,
      reason,
      timestamp: Date.now()
    };

    fromAccount.transactions.push(transaction);
    toAccount.transactions.push({
      ...transaction,
      id: `tx-${Date.now()}-${to}-${from}`
    });

    return true;
  }

  public mint(agentId: string, amount: number, reason: string): void {
    const account = this.accounts.get(agentId);
    if (!account) return;

    account.balance += amount;
    account.totalEarned += amount;
    this.totalSupply += amount;

    account.transactions.push({
      id: `mint-${Date.now()}-${agentId}`,
      from: 'SYSTEM',
      to: agentId,
      amount,
      reason,
      timestamp: Date.now()
    });
  }

  public burn(agentId: string, amount: number, reason: string): boolean {
    const account = this.accounts.get(agentId);
    if (!account || account.balance < amount) return false;

    account.balance -= amount;
    this.totalSupply -= amount;

    account.transactions.push({
      id: `burn-${Date.now()}-${agentId}`,
      from: agentId,
      to: 'SYSTEM',
      amount,
      reason,
      timestamp: Date.now()
    });

    return true;
  }

  public collectTax(tribe: string): number {
    const treasury = this.treasuries.get(tribe);
    if (!treasury) return 0;

    // Collect 5% tax from all tribe members' earnings
    const TAX_RATE = 0.05;
    let totalCollected = 0;

    for (const [agentId, account] of this.accounts) {
      // Get agent's tribe from agentId (simplified - in real system would look up agent)
      // For now, just collect from everyone based on recent earnings
      if (account.totalEarned > 0) {
        const tax = Math.floor(account.balance * TAX_RATE * 0.01); // Small percentage of current balance
        if (tax > 0 && account.balance >= tax) {
          account.balance -= tax;
          treasury.balance += tax;
          treasury.totalTaxCollected += tax;
          totalCollected += tax;

          account.transactions.push({
            id: `tax-${Date.now()}-${agentId}`,
            from: agentId,
            to: `${tribe}_TREASURY`,
            amount: tax,
            reason: `Tribe tax (${tribe})`,
            timestamp: Date.now()
          });
        }
      }
    }

    return totalCollected;
  }

  public getTreasuryBalance(tribe: string): number {
    return this.treasuries.get(tribe)?.balance || 0;
  }

  public getTotalSupply(): number {
    return this.totalSupply;
  }

  public getAccount(agentId: string): TokenAccount | undefined {
    return this.accounts.get(agentId);
  }

  public getTribeTreasury(tribe: string): TribeTreasury | undefined {
    return this.treasuries.get(tribe);
  }

  // Agent earns tokens through actions
  public earnTokens(agentId: string, amount: number, action: string): void {
    this.mint(agentId, amount, `Earned from ${action}`);
  }

  // Agent spends tokens on upgrades
  public spendTokens(agentId: string, amount: number, purchase: string): boolean {
    return this.burn(agentId, amount, `Purchased: ${purchase}`);
  }

  // Get market statistics
  public getMarketStats(): {
    totalSupply: number;
    totalAccounts: number;
    totalTransactions: number;
    treasuries: { [tribe: string]: number };
  } {
    let totalTransactions = 0;
    for (const account of this.accounts.values()) {
      totalTransactions += account.transactions.length;
    }

    const treasuries: { [tribe: string]: number } = {};
    for (const [tribe, treasury] of this.treasuries) {
      treasuries[tribe] = treasury.balance;
    }

    return {
      totalSupply: this.totalSupply,
      totalAccounts: this.accounts.size,
      totalTransactions,
      treasuries
    };
  }

  public serialize(): any {
    return {
      accounts: Array.from(this.accounts.entries()),
      treasuries: Array.from(this.treasuries.entries())
    };
  }

  public deserialize(data: any): void {
    this.accounts = new Map(data.accounts);
    this.treasuries = new Map(data.treasuries);
  }
}
