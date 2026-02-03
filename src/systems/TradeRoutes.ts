// Market/Trade Route System for ClawCiv
// Permanent trade routes provide ongoing economic benefits

export type RouteType = 'land' | 'sea' | 'caravan' | 'diplomatic';
export type RouteStatus = 'active' | 'inactive' | 'embargoed' | 'blocked' | 'destroyed';

export interface TradeResource {
  resource: 'food' | 'energy' | 'materials' | 'knowledge' | 'socialCapital' | 'tokens';
  amount: number;
  price: number; // Market price
}

export interface TradeAgreement {
  fromTribe: string;
  toTribe: string;
  exports: TradeResource[];
  imports: TradeResource[];
  duration: number; // Days
  value: number; // Total value
}

export interface TradeRoute {
  id: string;
  name: string;
  type: RouteType;
  status: RouteStatus;
  icon: string;
  description: string;

  // Connection
  fromTribe: string;
  toTribe: string;
  distance: number; // Affects travel time and risk

  // Economics
  agreements: TradeAgreement[];
  dailyIncome: number; // Tokens generated per day
  totalValue: number; // Total trade value

  // Logistics
  caravanSize: number; // Capacity
  caravanSpeed: number; // Days per trip
  caravansEnRoute: number;
  lastCaravanDay: number;

  // Security
  riskLevel: number; // 0-100
  pirates: number; // Active pirate threats
  escorts: number; // Military protection

  // Upgrades
  level: number; // 1-5
  bonuses: string[];

  // Statistics
  dayEstablished: number;
  totalTrips: number;
  totalRevenue: number;
  incidents: number;
}

export interface Marketplace {
  tribe: string;
  location: { x: number; y: number };
  resources: {
    buying: { [key: string]: number }; // Resource -> price
    selling: { [key: string]: number }; // Resource -> price
  };
  activity: number; // Economic activity level
  merchants: number;
}

export class TradeRouteSystem {
  private routes: Map<string, TradeRoute> = new Map();
  private marketplaces: Map<string, Marketplace> = new Map();
  private routeIdCounter = 0;
  private marketplaceIdCounter = 0;

  // Global market prices
  private marketPrices: { [key: string]: number } = {
    food: 2,
    energy: 3,
    materials: 4,
    knowledge: 8,
    socialCapital: 5,
    tokens: 1
  };

  constructor() {}

  // Establish a new trade route
  establishRoute(
    fromTribe: string,
    toTribe: string,
    type: RouteType,
    agreements: TradeAgreement[]
  ): TradeRoute | null {
    // Check if route already exists
    for (const route of this.routes.values()) {
      if (route.fromTribe === fromTribe && route.toTribe === toTribe && route.status !== 'destroyed') {
        return null;
      }
    }

    const distance = this.calculateDistance(fromTribe, toTribe);
    const routeConfig = this.getRouteConfig(type);

    const route: TradeRoute = {
      id: `route-${this.routeIdCounter++}-${Date.now()}`,
      name: this.generateRouteName(fromTribe, toTribe, type),
      type,
      status: 'active',
      icon: routeConfig.icon,
      description: routeConfig.description,
      fromTribe,
      toTribe,
      distance,
      agreements,
      dailyIncome: this.calculateDailyIncome(agreements, distance),
      totalValue: 0,
      caravanSize: routeConfig.caravanSize,
      caravanSpeed: routeConfig.speed + distance,
      caravansEnRoute: 0,
      lastCaravanDay: 0,
      riskLevel: this.calculateRisk(type, distance),
      pirates: 0,
      escorts: 0,
      level: 1,
      bonuses: [],
      dayEstablished: Date.now(),
      totalTrips: 0,
      totalRevenue: 0,
      incidents: 0
    };

    this.routes.set(route.id, route);
    return route;
  }

  private calculateDistance(tribe1: string, tribe2: string): number {
    // Simplified distance calculation
    const tribePositions: { [key: string]: { x: number; z: number } } = {
      Alpha: { x: -350, z: -350 },
      Beta: { x: 350, z: -350 },
      Gamma: { x: 0, z: 350 }
    };

    const pos1 = tribePositions[tribe1];
    const pos2 = tribePositions[tribe2];

    return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.z - pos1.z, 2)) / 100;
  }

  private getRouteConfig(type: RouteType): {
    icon: string;
    description: string;
    caravanSize: number;
    speed: number;
  } {
    const configs = {
      land: {
        icon: '🐫',
        description: 'Overland trade through established roads',
        caravanSize: 100,
        speed: 5
      },
      sea: {
        icon: '⛵',
        description: 'Maritime trade across waters',
        caravanSize: 500,
        speed: 3
      },
      caravan: {
        icon: '🚐',
        description: 'Merchant caravans with valuable goods',
        caravanSize: 200,
        speed: 7
      },
      diplomatic: {
        icon: '🤝',
        description: 'Official diplomatic exchanges',
        caravanSize: 50,
        speed: 10
      }
    };

    return configs[type];
  }

  private generateRouteName(fromTribe: string, toTribe: string, type: RouteType): string {
    const typeNames = {
      land: 'Overland Route',
      sea: 'Maritime Lane',
      caravan: 'Merchant Caravan',
      diplomatic: 'Diplomatic Exchange'
    };

    return `${fromTribe}-${toTribe} ${typeNames[type]}`;
  }

  private calculateDailyIncome(agreements: TradeAgreement[], distance: number): number {
    let income = 0;

    for (const agreement of agreements) {
      for (const resource of agreement.exports) {
        income += resource.amount * resource.price * 0.01;
      }
    }

    // Distance affects income (longer routes = more valuable)
    income *= (1 + distance * 0.1);

    return Math.floor(income);
  }

  private calculateRisk(type: RouteType, distance: number): number {
    let baseRisk = 10;

    if (type === 'land') baseRisk = 15;
    if (type === 'sea') baseRisk = 25; // Pirates
    if (type === 'caravan') baseRisk = 20;

    // Distance increases risk
    baseRisk += distance * 2;

    return Math.min(100, baseRisk);
  }

  // Create a marketplace
  createMarketplace(tribe: string, location: { x: number; y: number }): Marketplace {
    const marketplace: Marketplace = {
      tribe,
      location,
      resources: {
        buying: { ...this.marketPrices },
        selling: { ...this.marketPrices }
      },
      activity: 50,
      merchants: 5
    };

    this.marketplaces.set(marketplace.id, marketplace);
    return marketplace;
  }

  // Get all routes
  getAllRoutes(): TradeRoute[] {
    return Array.from(this.routes.values());
  }

  // Get active routes
  getActiveRoutes(): TradeRoute[] {
    return Array.from(this.routes.values()).filter(r => r.status === 'active');
  }

  // Get routes for a tribe
  getRoutesByTribe(tribe: string): TradeRoute[] {
    return Array.from(this.routes.values()).filter(
      r => r.fromTribe === tribe || r.toTribe === tribe
    );
  }

  // Get route by ID
  getRoute(routeId: string): TradeRoute | undefined {
    return this.routes.get(routeId);
  }

  // Get marketplace for a tribe
  getMarketplace(tribe: string): Marketplace | undefined {
    return Array.from(this.marketplaces.values()).find(m => m.tribe === tribe);
  }

  // Update trade routes daily
  updateRoutes(currentDay: number): {
    revenue: number;
    incidents: string[];
  } {
    let totalRevenue = 0;
    const incidents: string[] = [];

    for (const route of this.routes.values()) {
      if (route.status !== 'active') continue;

      // Generate income
      const revenue = route.dailyIncome;
      route.totalRevenue += revenue;
      totalRevenue += revenue;

      // Process caravans
      if (route.caravansEnRoute > 0) {
        const daysSinceLast = currentDay - route.lastCaravanDay;

        if (daysSinceLast >= route.caravanSpeed) {
          // Caravan arrives
          route.totalTrips++;
          route.lastCaravanDay = currentDay;
          route.caravansEnRoute--;

          // Check for incidents
          if (Math.random() * 100 < route.riskLevel) {
            route.incidents++;

            // Different incident types
            const incidentTypes = ['piracy', 'banditry', 'storm', 'accident'];
            const incident = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];

            if (incident === 'piracy' && route.type === 'sea') {
              route.pirates++;
              incidents.push(`🏴‍☠️ Pirates attacked ${route.name}!`);
            } else if (incident === 'banditry') {
              incidents.push(`🗡️ Bandits raided ${route.name}!`);
            } else if (incident === 'storm') {
              incidents.push(`🌪️ Storm delayed ${route.name}!`);
            } else {
              incidents.push(`⚠️ Accident on ${route.name}!`);
            }

            // Reduce income from incident
            route.dailyIncome = Math.max(1, Math.floor(route.dailyIncome * 0.7));
          }
        }
      }

      // Launch new caravans periodically
      if (route.caravansEnRoute === 0 && Math.random() < 0.3) {
        route.caravansEnRoute = 1;
        route.lastCaravanDay = currentDay;
      }
    }

    return { revenue, incidents };
  }

  // Upgrade a trade route
  upgradeRoute(routeId: string): boolean {
    const route = this.routes.get(routeId);
    if (!route || route.level >= 5) return false;

    route.level++;
    route.dailyIncome = Math.floor(route.dailyIncome * 1.3);
    route.caravanSize = Math.floor(route.caravanSize * 1.2);
    route.riskLevel = Math.max(5, route.riskLevel - 10);

    const upgradeBonuses = [
      'Faster travel',
      'More cargo capacity',
      'Lower risk',
      'Better prices',
      'Military escort'
    ];

    route.bonuses.push(upgradeBonuses[route.level - 1]);

    return true;
  }

  // Add military escort to route
  addEscort(routeId: string): boolean {
    const route = this.routes.get(routeId);
    if (!route) return false;

    route.escorts++;
    route.riskLevel = Math.max(0, route.riskLevel - 15);
    route.dailyIncome = Math.max(1, route.dailyIncome - 2); // Escorts cost money

    return true;
  }

  // Embargo a trade route
  embargoRoute(routeId: string, embargoingTribe: string): boolean {
    const route = this.routes.get(routeId);
    if (!route) return false;

    route.status = 'embargoed';
    return true;
  }

  // Lift embargo
  liftEmbargo(routeId: string): boolean {
    const route = this.routes.get(routeId);
    if (!route) return false;

    route.status = 'active';
    return true;
  }

  // Destroy a trade route
  destroyRoute(routeId: string): boolean {
    const route = this.routes.get(routeId);
    if (!route) return false;

    route.status = 'destroyed';
    return true;
  }

  // Calculate trade balance between tribes
  getTradeBalance(tribe1: string, tribe2: string): {
    exports: number;
    imports: number;
    balance: number;
  } {
    let exports = 0;
    let imports = 0;

    for (const route of this.routes.values()) {
      if (route.status !== 'active') continue;

      if (route.fromTribe === tribe1 && route.toTribe === tribe2) {
        // Exports from tribe1 to tribe2
        for (const agreement of route.agreements) {
          for (const resource of agreement.exports) {
            exports += resource.amount * resource.price;
          }
        }
      }

      if (route.fromTribe === tribe2 && route.toTribe === tribe1) {
        // Imports to tribe1 from tribe2
        for (const agreement of route.agreements) {
          for (const resource of agreement.imports) {
            imports += resource.amount * resource.price;
          }
        }
      }
    }

    return {
      exports,
      imports,
      balance: exports - imports
    };
  }

  // Get market price with fluctuation
  getMarketPrice(resource: string): number {
    // Add random fluctuation (-10% to +10%)
    const fluctuation = (Math.random() - 0.5) * 0.2;
    return this.marketPrices[resource] * (1 + fluctuation);
  }

  // Update market prices (supply and demand)
  updateMarketPrices(): { [resource: string]: number } {
    // Random price changes
    for (const resource of Object.keys(this.marketPrices)) {
      const change = (Math.random() - 0.5) * 0.1; // -5% to +5%
      this.marketPrices[resource] *= (1 + change);
      this.marketPrices[resource] = Math.max(0.5, this.marketPrices[resource]);
    }

    return { ...this.marketPrices };
  }

  // Get trade statistics
  getStatistics(): {
    totalRoutes: number;
    activeRoutes: number;
    totalRevenue: number;
    totalIncidents: number;
    totalTrips: number;
  } {
    const stats = {
      totalRoutes: this.routes.size,
      activeRoutes: 0,
      totalRevenue: 0,
      totalIncidents: 0,
      totalTrips: 0
    };

    for (const route of this.routes.values()) {
      if (route.status === 'active') stats.activeRoutes++;
      stats.totalRevenue += route.totalRevenue;
      stats.totalIncidents += route.incidents;
      stats.totalTrips += route.totalTrips;
    }

    return stats;
  }

  // Clean up inactive routes
  cleanupOldRoutes(currentDay: number): void {
    const toRemove: string[] = [];

    for (const [id, route] of this.routes) {
      const daysSinceEstablished = currentDay - route.dayEstablished;

      // Remove routes inactive for over 200 days
      if (route.status === 'inactive' && daysSinceEstablished > 200) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.routes.delete(id);
    }
  }

  public serialize(): any {
    return {
      routes: Array.from(this.routes.entries()),
      marketplaces: Array.from(this.marketplaces.entries()),
      routeIdCounter: this.routeIdCounter,
      marketplaceIdCounter: this.marketplaceIdCounter,
      marketPrices: this.marketPrices
    };
  }

  public deserialize(data: any): void {
    this.routes = new Map(data.routes || []);
    this.marketplaces = new Map(data.marketplaces || []);
    this.routeIdCounter = data.routeIdCounter || 0;
    this.marketplaceIdCounter = data.marketplaceIdCounter || 0;
    this.marketPrices = data.marketPrices || this.marketPrices;
  }
}
