// Weather & Climate System for ClawCiv
// Dynamic weather affecting gameplay, resources, and agent activities

export type WeatherType = 'sunny' | 'rainy' | 'stormy' | 'snowy' | 'foggy' | 'drought' | 'heatwave';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type ClimateZone = 'temperate' | 'tropical' | 'arid' | 'arctic' | 'continental';

export interface WeatherEffects {
  movementSpeed: number; // Multiplier (0.5 to 1.5)
  gatheringRate: number; // Multiplier (0.5 to 1.5)
  combatBonus: number; // Multiplier (0.5 to 1.5)
  farmingRate: number; // Multiplier (0 to 2)
  researchRate: number; // Multiplier (0.8 to 1.2)
  healthImpact: number; // Health change per tick (-5 to +5)
  visibility: number; // Visibility range (1 to 10)
  fireRisk: number; // Chance of fire (0 to 100)
  diseaseRisk: number; // Disease chance multiplier (0.5 to 2)
}

export interface Weather {
  type: WeatherType;
  name: string;
  description: string;
  icon: string;
  effects: WeatherEffects;
  duration: number; // In ticks
  severity: number; // 1-10, for extreme weather
}

export interface WeatherForecast {
  day: number;
  weather: WeatherType;
  confidence: number; // 0-100
}

export interface ClimateData {
  zone: ClimateZone;
  baseTemperature: number; // Celsius
  humidity: number; // 0-100
  typicalWeather: WeatherType[];
  seasonalVariation: number;
}

export interface WeatherAlert {
  id: string;
  type: 'warning' | 'watch' | 'advisory';
  severity: number; // 1-10
  weather: WeatherType;
  affectedTribes: string[];
  message: string;
  day: number;
  duration: number;
}

export class WeatherSystem {
  private currentWeather: Weather;
  private weatherHistory: Weather[] = [];
  private forecasts: WeatherForecast[] = [];
  private alerts: WeatherAlert[] = [];
  private territoryClimates: Map<string, ClimateData> = new Map();
  private alertIdCounter = 0;

  // Season configuration
  private currentSeason: Season = 'spring';
  private seasonStartDay: number = 0;
  private readonly SEASON_LENGTH = 100; // Days per season

  constructor() {
    this.initializeTerritoryClimates();
    this.currentWeather = this.generateWeather('spring');
  }

  // Initialize climate zones for each tribe's territory
  private initializeTerritoryClimates(): void {
    this.territoryClimates.set('Alpha', {
      zone: 'temperate',
      baseTemperature: 15,
      humidity: 60,
      typicalWeather: ['sunny', 'rainy', 'foggy'],
      seasonalVariation: 20
    });

    this.territoryClimates.set('Beta', {
      zone: 'tropical',
      baseTemperature: 28,
      humidity: 80,
      typicalWeather: ['sunny', 'rainy', 'stormy'],
      seasonalVariation: 5
    });

    this.territoryClimates.set('Gamma', {
      zone: 'arctic',
      baseTemperature: -5,
      humidity: 40,
      typicalWeather: ['sunny', 'snowy', 'foggy'],
      seasonalVariation: 15
    });
  }

  // Generate weather based on season and climate
  private generateWeather(season: Season, forceType?: WeatherType): Weather {
    const weatherTypes = this.getSeasonalWeatherTypes(season);
    const selectedType = forceType || this.selectWeightedWeather(weatherTypes);

    const weather = this.getWeatherByType(selectedType);
    weather.duration = this.generateWeatherDuration(selectedType, season);
    weather.severity = this.generateWeatherSeverity(selectedType);

    return weather;
  }

  private getSeasonalWeatherTypes(season: Season): WeatherType[] {
    switch (season) {
      case 'spring':
        return ['sunny', 'rainy', 'foggy', 'rainy', 'sunny'];
      case 'summer':
        return ['sunny', 'sunny', 'heatwave', 'stormy', 'sunny'];
      case 'autumn':
        return ['sunny', 'rainy', 'foggy', 'stormy', 'sunny'];
      case 'winter':
        return ['snowy', 'snowy', 'sunny', 'foggy', 'snowy'];
    }
  }

  private selectWeightedWeather(types: WeatherType[]): WeatherType {
    return types[Math.floor(Math.random() * types.length)];
  }

  private getWeatherByType(type: WeatherType): Weather {
    const weatherConfigs: { [key in WeatherType]: Weather } = {
      sunny: {
        type: 'sunny',
        name: 'Sunny',
        description: 'Clear skies and pleasant weather',
        icon: '☀️',
        effects: {
          movementSpeed: 1.1,
          gatheringRate: 1.2,
          combatBonus: 1.0,
          farmingRate: 1.3,
          researchRate: 1.1,
          healthImpact: 1,
          visibility: 10,
          fireRisk: 10,
          diseaseRisk: 0.8
        },
        duration: 5,
        severity: 1
      },
      rainy: {
        type: 'rainy',
        name: 'Rainy',
        description: 'Moderate rainfall across the region',
        icon: '🌧️',
        effects: {
          movementSpeed: 0.8,
          gatheringRate: 0.9,
          combatBonus: 0.9,
          farmingRate: 1.1,
          researchRate: 0.9,
          healthImpact: -1,
          visibility: 6,
          fireRisk: 0,
          diseaseRisk: 1.2
        },
        duration: 4,
        severity: 2
      },
      stormy: {
        type: 'stormy',
        name: 'Stormy',
        description: 'Severe storms with high winds',
        icon: '⛈️',
        effects: {
          movementSpeed: 0.6,
          gatheringRate: 0.8,
          combatBonus: 0.8,
          farmingRate: 0.7,
          researchRate: 0.7,
          healthImpact: -2,
          visibility: 4,
          fireRisk: 5,
          diseaseRisk: 1.3
        },
        duration: 3,
        severity: 6
      },
      snowy: {
        type: 'snowy',
        name: 'Snowy',
        description: 'Heavy snowfall blankets the ground',
        icon: '❄️',
        effects: {
          movementSpeed: 0.7,
          gatheringRate: 0.8,
          combatBonus: 0.85,
          farmingRate: 0.3,
          researchRate: 1.15,
          healthImpact: -3,
          visibility: 5,
          fireRisk: 5,
          diseaseRisk: 1.5
        },
        duration: 5,
        severity: 5
      },
      foggy: {
        type: 'foggy',
        name: 'Foggy',
        description: 'Dense fog limits visibility',
        icon: '🌫️',
        effects: {
          movementSpeed: 0.9,
          gatheringRate: 1.0,
          combatBonus: 0.7,
          farmingRate: 1.0,
          researchRate: 1.0,
          healthImpact: 0,
          visibility: 2,
          fireRisk: 5,
          diseaseRisk: 1.0
        },
        duration: 3,
        severity: 3
      },
      drought: {
        type: 'drought',
        name: 'Drought',
        description: 'Extended dry period affects agriculture',
        icon: '🏜️',
        effects: {
          movementSpeed: 1.0,
          gatheringRate: 0.7,
          combatBonus: 1.0,
          farmingRate: 0.4,
          researchRate: 1.0,
          healthImpact: -2,
          visibility: 9,
          fireRisk: 50,
          diseaseRisk: 0.9
        },
        duration: 8,
        severity: 7
      },
      heatwave: {
        type: 'heatwave',
        name: 'Heatwave',
        description: 'Extreme heat stresses all agents',
        icon: '🔥',
        effects: {
          movementSpeed: 0.85,
          gatheringRate: 0.8,
          combatBonus: 0.85,
          farmingRate: 0.5,
          researchRate: 0.8,
          healthImpact: -4,
          visibility: 8,
          fireRisk: 60,
          diseaseRisk: 1.4
        },
        duration: 6,
        severity: 8
      }
    };

    return { ...weatherConfigs[type] };
  }

  private generateWeatherDuration(type: WeatherType, season: Season): number {
    const baseDurations: { [key in WeatherType]: number } = {
      sunny: 5,
      rainy: 4,
      stormy: 3,
      snowy: 5,
      foggy: 3,
      drought: 8,
      heatwave: 6
    };

    const variation = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
    return Math.max(2, baseDurations[type] + variation);
  }

  private generateWeatherSeverity(type: WeatherType): number {
    const severityRanges: { [key in WeatherType]: [number, number] } = {
      sunny: [1, 2],
      rainy: [2, 4],
      stormy: [5, 8],
      snowy: [4, 7],
      foggy: [2, 4],
      drought: [6, 9],
      heatwave: [7, 10]
    };

    const [min, max] = severityRanges[type];
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Update weather and check for changes
  updateWeather(currentDay: number): Weather[] {
    const newWeatherEvents: Weather[] = [];

    // Update season
    this.updateSeason(currentDay);

    // Decrease weather duration
    this.currentWeather.duration--;

    // Check if weather should change
    if (this.currentWeather.duration <= 0) {
      // Store old weather
      this.weatherHistory.push({ ...this.currentWeather });

      // Generate new weather
      const oldWeather = this.currentWeather.type;
      this.currentWeather = this.generateWeather(this.currentSeason);

      // If significant weather change, create event
      if (oldWeather !== this.currentWeather.type) {
        newWeatherEvents.push(this.currentWeather);

        // Generate alert for severe weather
        if (this.currentWeather.severity >= 6) {
          this.generateWeatherAlert(this.currentWeather, currentDay);
        }
      }
    }

    // Update forecasts periodically
    if (currentDay % 5 === 0) {
      this.generateForecasts(currentDay);
    }

    // Check for extreme weather events
    const extremeEvents = this.checkExtremeWeather(currentDay);
    newWeatherEvents.push(...extremeEvents);

    // Clean up old data
    this.cleanup(currentDay);

    return newWeatherEvents;
  }

  private updateSeason(currentDay: number): void {
    const dayInSeason = currentDay % this.SEASON_LENGTH;
    if (dayInSeason === 0 && currentDay > 0) {
      const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
      const currentIndex = seasons.indexOf(this.currentSeason);
      this.currentSeason = seasons[(currentIndex + 1) % 4];
      this.seasonStartDay = currentDay;
    }
  }

  private generateWeatherAlert(weather: Weather, day: number): void {
    const tribes = ['Alpha', 'Beta', 'Gamma'];
    const affectedTribes = tribes.filter(() => Math.random() > 0.3); // 70% chance each

    const alertTypes = ['advisory', 'watch', 'warning'] as const;
    const alertType = weather.severity >= 8 ? 'warning' : weather.severity >= 6 ? 'watch' : 'advisory';

    const alert: WeatherAlert = {
      id: `alert-${this.alertIdCounter++}-${Date.now()}`,
      type: alertType,
      severity: weather.severity,
      weather: weather.type,
      affectedTribes,
      message: this.generateAlertMessage(weather, alertType),
      day,
      duration: weather.duration
    };

    this.alerts.push(alert);
  }

  private generateAlertMessage(weather: Weather, alertType: string): string {
    const typeText = alertType.toUpperCase();
    const messages = {
      stormy: `${typeText}: Severe storms approaching! Seek shelter and secure structures.`,
      snowy: `${typeText}: Heavy snowfall expected. Prepare for reduced mobility.`,
      drought: `${typeText}: Drought conditions developing. Conserve water resources.`,
      heatwave: `${typeText}: Extreme heat warning. Stay hydrated and avoid exertion.`,
      foggy: `${typeText}: Dense fog reducing visibility. Exercise caution when traveling.`,
      rainy: `${typeText}: Heavy rainfall may cause flooding in low areas.`,
      sunny: `${typeText}: Pleasant weather continues. Good conditions for activities.`
    };

    return messages[weather.type] || `${typeText}: Weather conditions changing.`;
  }

  private checkExtremeWeather(day: number): Weather[] {
    const extremeEvents: Weather[] = [];

    // Small chance for extreme weather to develop
    if (Math.random() < 0.02) {
      const extremeTypes: WeatherType[] = ['stormy', 'heatwave', 'drought'];
      const extremeType = extremeTypes[Math.floor(Math.random() * extremeTypes.length)];

      const extremeWeather = this.getWeatherByType(extremeType);
      extremeWeather.severity = 10;
      extremeWeather.duration = 3 + Math.floor(Math.random() * 4);
      extremeWeather.description = `EXTREME: ${extremeWeather.description}`;

      extremeEvents.push(extremeWeather);
      this.generateWeatherAlert(extremeWeather, day);
    }

    return extremeEvents;
  }

  private generateForecasts(currentDay: number): void {
    this.forecasts = [];

    for (let i = 1; i <= 7; i++) {
      const futureDay = currentDay + i;
      const futureSeason = this.predictSeason(futureDay);
      const weatherTypes = this.getSeasonalWeatherTypes(futureSeason);
      const predictedWeather = this.selectWeightedWeather(weatherTypes);

      const forecast: WeatherForecast = {
        day: futureDay,
        weather: predictedWeather,
        confidence: Math.max(50, 95 - i * 6) // Decreases with distance
      };

      this.forecasts.push(forecast);
    }
  }

  private predictSeason(day: number): Season {
    const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    const seasonIndex = Math.floor(day / this.SEASON_LENGTH) % 4;
    return seasons[seasonIndex];
  }

  private cleanup(currentDay: number): void {
    // Keep only recent weather history (last 30 days)
    this.weatherHistory = this.weatherHistory.slice(-30);

    // Remove expired alerts
    this.alerts = this.alerts.filter(alert => alert.day + alert.duration > currentDay);
  }

  // Get current weather
  getCurrentWeather(): Weather {
    return this.currentWeather;
  }

  // Get current season
  getCurrentSeason(): Season {
    return this.currentSeason;
  }

  // Get weather effects for calculations
  getWeatherEffects(): WeatherEffects {
    return this.currentWeather.effects;
  }

  // Get weather for a specific territory (based on climate zone)
  getTerritoryWeather(tribe: string): Weather {
    const climate = this.territoryClimates.get(tribe);
    if (!climate) return this.currentWeather;

    // Modify weather based on climate zone
    const territoryWeather = { ...this.currentWeather };
    const modification = this.climateModifier(climate.zone, this.currentWeather.type);

    territoryWeather.effects = {
      ...territoryWeather.effects,
      movementSpeed: territoryWeather.effects.movementSpeed * modification.movement,
      gatheringRate: territoryWeather.effects.gatheringRate * modification.gathering,
      healthImpact: territoryWeather.effects.healthImpact + modification.health
    };

    return territoryWeather;
  }

  private climateModifier(zone: ClimateZone, weather: WeatherType): { movement: number; gathering: number; health: number } {
    const modifiers: { [key in ClimateZone]: { [key in WeatherType]?: { movement: number; gathering: number; health: number } } } = {
      temperate: {
        snowy: { movement: 0.8, gathering: 0.9, health: -2 }
      },
      tropical: {
        snowy: { movement: 0.3, gathering: 0.3, health: -5 },
        sunny: { movement: 1.0, gathering: 1.1, health: 1 }
      },
      arid: {
        rainy: { movement: 1.2, gathering: 1.3, health: 2 },
        sunny: { movement: 1.1, gathering: 0.9, health: -1 }
      },
      arctic: {
        sunny: { movement: 1.1, gathering: 1.2, health: 1 },
        heatwave: { movement: 1.5, gathering: 1.3, health: -1 }
      },
      continental: {
        stormy: { movement: 0.7, gathering: 0.8, health: -3 }
      }
    };

    return modifiers[zone]?.[weather] || { movement: 1, gathering: 1, health: 0 };
  }

  // Get weather forecast
  getForecast(days: number = 7): WeatherForecast[] {
    return this.forecasts.slice(0, days);
  }

  // Get active alerts
  getActiveAlerts(): WeatherAlert[] {
    return this.alerts;
  }

  // Get alerts for a specific tribe
  getAlertsForTribe(tribe: string): WeatherAlert[] {
    return this.alerts.filter(alert => alert.affectedTribes.includes(tribe));
  }

  // Get weather history
  getWeatherHistory(days: number = 10): Weather[] {
    return this.weatherHistory.slice(-days);
  }

  // Check if weather is severe
  isSevereWeather(): boolean {
    return this.currentWeather.severity >= 6;
  }

  // Get temperature for a territory
  getTemperature(tribe: string): number {
    const climate = this.territoryClimates.get(tribe);
    if (!climate) return 20;

    const seasonModifier = this.getSeasonTemperatureModifier(this.currentSeason);
    const weatherModifier = this.getWeatherTemperatureModifier(this.currentWeather.type);

    return climate.baseTemperature + seasonModifier + weatherModifier;
  }

  private getSeasonTemperatureModifier(season: Season): number {
    switch (season) {
      case 'spring': return 0;
      case 'summer': return 5;
      case 'autumn': return -2;
      case 'winter': return -10;
    }
  }

  private getWeatherTemperatureModifier(weather: WeatherType): number {
    switch (weather) {
      case 'sunny': return 2;
      case 'rainy': return -3;
      case 'stormy': return -5;
      case 'snowy': return -10;
      case 'foggy': return -2;
      case 'drought': return 8;
      case 'heatwave': return 15;
    }
  }

  // Get season description
  getSeasonDescription(): string {
    const descriptions = {
      spring: '🌸 Spring - New growth and mild temperatures',
      summer: '☀️ Summer - Hot weather and active life',
      autumn: '🍂 Autumn - Cooling temperatures and harvest time',
      winter: '❄️ Winter - Cold weather and survival challenges'
    };
    return descriptions[this.currentSeason];
  }

  public serialize(): any {
    return {
      currentWeather: this.currentWeather,
      weatherHistory: this.weatherHistory,
      forecasts: this.forecasts,
      alerts: this.alerts,
      currentSeason: this.currentSeason,
      seasonStartDay: this.seasonStartDay,
      alertIdCounter: this.alertIdCounter
    };
  }

  public deserialize(data: any): void {
    if (data.currentWeather) this.currentWeather = data.currentWeather;
    if (data.weatherHistory) this.weatherHistory = data.weatherHistory;
    if (data.forecasts) this.forecasts = data.forecasts;
    if (data.alerts) this.alerts = data.alerts;
    if (data.currentSeason) this.currentSeason = data.currentSeason;
    if (data.seasonStartDay) this.seasonStartDay = data.seasonStartDay;
    if (data.alertIdCounter) this.alertIdCounter = data.alertIdCounter;
  }
}
