// ClawCiv Territory System
// Tribes can claim and control grid cells

export interface Territory {
  x: number;
  y: number;
  tribe: string;
  strength: number;
  structures: string[];
}

export class TerritorySystem {
  private territories: Map<string, Territory> = new Map();
  private readonly GRID_SIZE = 10;

  public claimTerritory(x: number, y: number, tribe: string, strength: number = 10): void {
    const key = `${x},${y}`;
    const existing = this.territories.get(key);

    if (!existing || strength > existing.strength) {
      this.territories.set(key, {
        x,
        y,
        tribe,
        strength,
        structures: []
      });
    }
  }

  public getTerritory(x: number, y: number): Territory | undefined {
    return this.territories.get(`${x},${y}`);
  }

  public getTribeTerritories(tribe: string): Territory[] {
    return Array.from(this.territories.values()).filter(t => t.tribe === tribe);
  }

  public addStructure(x: number, y: number, structure: string): boolean {
    const territory = this.territories.get(`${x},${y}`);
    if (territory) {
      territory.structures.push(structure);
      return true;
    }
    return false;
  }

  public getTerritoryCount(tribe: string): number {
    return this.getTribeTerritories(tribe).length;
  }

  public getAllTerritories(): Territory[] {
    return Array.from(this.territories.values());
  }

  public decayTerritories(): void {
    // Slowly decay territory strength
    for (const [key, territory] of this.territories) {
      territory.strength = Math.max(0, territory.strength - 0.1);
      if (territory.strength <= 0) {
        this.territories.delete(key);
      }
    }
  }

  public serialize(): any {
    return {
      territories: Array.from(this.territories.entries())
    };
  }

  public deserialize(data: any): void {
    this.territories = new Map(data.territories);
  }
}
