// Seasonal and Weather System for ClawCiv
// Adds temporal variety with seasons and dynamic weather

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy';

export interface SeasonConfig {
  name: Season;
  emoji: string;
  description: string;
  color: string; // Primary color for UI
  resourceModifiers: {
    food: number;      // Food production modifier
    energy: number;    // Energy cost modifier
    materials: number; // Materials gathering modifier
    knowledge: number; // Research speed modifier
  };
  movementModifier: number; // Agent movement speed
  combatModifier: number;    // Combat effectiveness
  weatherChances: { [key in Weather]: number }; // Probability of each weather
}

export interface WeatherConfig {
  name: Weather;
  emoji: string;
  description: string;
  visibility: number; // How far agents can see
  resourceModifiers: {
    food?: number;
    energy?: number;
    materials?: number;
    knowledge?: number;
  };
  effects: string[]; // Special effects
}

export class SeasonSystem {
  private currentSeason: Season = 'spring';
  private currentWeather: Weather = 'sunny';
  private dayInSeason: number = 0;
  private daysPerSeason: number = 25; // 100 days = full year
  private weatherDuration: number = 0;

  private readonly seasons: { [key in Season]: SeasonConfig } = {
    spring: {
      name: 'spring',
      emoji: '🌸',
      description: 'Season of renewal and growth',
      color: '#22c55e',
      resourceModifiers: {
        food: 1.3,
        energy: 1.0,
        materials: 0.9,
        knowledge: 1.0
      },
      movementModifier: 1.0,
      combatModifier: 1.0,
      weatherChances: {
        sunny: 40,
        cloudy: 30,
        rainy: 25,
        stormy: 5,
        snowy: 0
      }
    },
    summer: {
      name: 'summer',
      emoji: '☀️',
      description: 'Season of abundance and heat',
      color: '#fbbf24',
      resourceModifiers: {
        food: 1.5,
        energy: 0.9,
        materials: 1.2,
        knowledge: 1.1
      },
      movementModifier: 1.1,
      combatModifier: 1.05,
      weatherChances: {
        sunny: 60,
        cloudy: 20,
        rainy: 15,
        stormy: 5,
        snowy: 0
      }
    },
    autumn: {
      name: 'autumn',
      emoji: '🍂',
      description: 'Season of harvest and preparation',
      color: '#f97316',
      resourceModifiers: {
        food: 1.2,
        energy: 1.0,
        materials: 1.1,
        knowledge: 1.2
      },
      movementModifier: 1.0,
      combatModifier: 1.0,
      weatherChances: {
        sunny: 30,
        cloudy: 35,
        rainy: 25,
        stormy: 10,
        snowy: 0
      }
    },
    winter: {
      name: 'winter',
      emoji: '❄️',
      description: 'Season of cold and scarcity',
      color: '#3b82f6',
      resourceModifiers: {
        food: 0.5,
        energy: 1.3,
        materials: 0.7,
        knowledge: 1.3
      },
      movementModifier: 0.8,
      combatModifier: 0.9,
      weatherChances: {
        sunny: 20,
        cloudy: 30,
        rainy: 10,
        stormy: 5,
        snowy: 35
      }
    }
  };

  private readonly weathers: { [key in Weather]: WeatherConfig } = {
    sunny: {
      name: 'sunny',
      emoji: '☀️',
      description: 'Clear skies and good visibility',
      visibility: 1.0,
      resourceModifiers: {
        food: 1.1,
        energy: 1.0
      },
      effects: ['Better visibility', 'Improved morale']
    },
    cloudy: {
      name: 'cloudy',
      emoji: '☁️',
      description: 'Overcast skies',
      visibility: 0.9,
      resourceModifiers: {},
      effects: ['Mild conditions']
    },
    rainy: {
      name: 'rainy',
      emoji: '🌧️',
      description: 'Rainfall across the land',
      visibility: 0.7,
      resourceModifiers: {
        food: 1.2,
        materials: 0.8,
        energy: 0.95
      },
      effects: ['Boosts food production', 'Slows travel', 'Reduces materials gathering']
    },
    stormy: {
      name: 'stormy',
      emoji: '⛈️',
      description: 'Severe storm conditions',
      visibility: 0.5,
      resourceModifiers: {
        food: 0.7,
        energy: 0.8,
        materials: 0.6
      },
      effects: ['Dangerous travel', 'Reduced production', 'High risk']
    },
    snowy: {
      name: 'snowy',
      emoji: '🌨️',
      description: 'Heavy snowfall',
      visibility: 0.6,
      resourceModifiers: {
        food: 0.6,
        energy: 1.2,
        materials: 0.7
      },
      effects: ['Cold slows travel', 'Reduces food', 'Increases energy costs']
    }
  };

  getCurrentSeason(): SeasonConfig {
    return this.seasons[this.currentSeason];
  }

  getCurrentWeather(): WeatherConfig {
    return this.weathers[this.currentWeather];
  }

  getCurrentSeasonName(): Season {
    return this.currentSeason;
  }

  getCurrentWeatherName(): Weather {
    return this.currentWeather;
  }

  getDayInSeason(): number {
    return this.dayInSeason;
  }

  getDaysPerSeason(): number {
    return this.daysPerSeason;
  }

  getSeasonProgress(): number {
    return (this.dayInSeason / this.daysPerSeason) * 100;
  }

  // Get combined resource modifier for a resource type
  getResourceModifier(resourceType: 'food' | 'energy' | 'materials' | 'knowledge'): number {
    const seasonMod = this.getCurrentSeason().resourceModifiers[resourceType] || 1.0;
    const weatherMod = this.getCurrentWeather().resourceModifiers[resourceType] || 1.0;
    return seasonMod * weatherMod;
  }

  // Get movement modifier
  getMovementModifier(): number {
    const seasonMod = this.getCurrentSeason().movementModifier;
    const weatherMod = this.currentWeather === 'stormy' ? 0.7 :
                       this.currentWeather === 'rainy' ? 0.9 :
                       this.currentWeather === 'snowy' ? 0.75 : 1.0;
    return seasonMod * weatherMod;
  }

  // Get combat modifier
  getCombatModifier(): number {
    const seasonMod = this.getCurrentSeason().combatModifier;
    const weatherMod = this.currentWeather === 'stormy' ? 0.8 :
                       this.currentWeather === 'rainy' ? 0.95 :
                       this.currentWeather === 'snowy' ? 0.85 : 1.0;
    return seasonMod * weatherMod;
  }

  // Advance time by one day
  advanceDay(): { seasonChanged: boolean; weatherChanged: boolean; newSeason?: SeasonConfig; newWeather?: WeatherConfig } {
    this.dayInSeason++;

    // Check if season has changed
    if (this.dayInSeason > this.daysPerSeason) {
      this.dayInSeason = 1;
      const seasonOrder: Season[] = ['spring', 'summer', 'autumn', 'winter'];
      const currentIndex = seasonOrder.indexOf(this.currentSeason);
      this.currentSeason = seasonOrder[(currentIndex + 1) % 4];

      // Reset weather when season changes
      this.currentWeather = this.selectWeatherForSeason(this.currentSeason);
      this.weatherDuration = 3 + Math.floor(Math.random() * 5); // 3-7 days

      return {
        seasonChanged: true,
        weatherChanged: true,
        newSeason: this.getCurrentSeason(),
        newWeather: this.getCurrentWeather()
      };
    }

    // Check if weather should change
    this.weatherDuration--;
    if (this.weatherDuration <= 0) {
      const oldWeather = this.currentWeather;
      this.currentWeather = this.selectWeatherForSeason(this.currentSeason);
      this.weatherDuration = 2 + Math.floor(Math.random() * 6); // 2-7 days

      return {
        seasonChanged: false,
        weatherChanged: true,
        newWeather: this.getCurrentWeather()
      };
    }

    return { seasonChanged: false, weatherChanged: false };
  }

  private selectWeatherForSeason(season: Season): Weather {
    const seasonConfig = this.seasons[season];
    const chances = seasonConfig.weatherChances;

    const total = Object.values(chances).reduce((sum, val) => sum + val, 0);
    let random = Math.random() * total;

    for (const [weather, chance] of Object.entries(chances)) {
      random -= chance;
      if (random <= 0) {
        return weather as Weather;
      }
    }

    return 'sunny';
  }

  // Get a summary of current conditions
  getConditionsSummary(): string {
    const season = this.getCurrentSeason();
    const weather = this.getCurrentWeather();

    return `${season.emoji} ${season.name.charAt(0).toUpperCase() + season.name.slice(1)} - Day ${this.dayInSeason}/${this.daysPerSeason} | ${weather.emoji} ${weather.name.charAt(0).toUpperCase() + weather.name.slice(1)}`;
  }

  // Get visual color for UI
  getSeasonColor(): string {
    return this.getCurrentSeason().color;
  }

  // Get current effects description
  getCurrentEffects(): string[] {
    const weather = this.getCurrentWeather();
    return weather.effects;
  }

  public serialize(): any {
    return {
      currentSeason: this.currentSeason,
      currentWeather: this.currentWeather,
      dayInSeason: this.dayInSeason,
      daysPerSeason: this.daysPerSeason,
      weatherDuration: this.weatherDuration
    };
  }

  public deserialize(data: any): void {
    this.currentSeason = data.currentSeason || 'spring';
    this.currentWeather = data.currentWeather || 'sunny';
    this.dayInSeason = data.dayInSeason || 0;
    this.daysPerSeason = data.daysPerSeason || 25;
    this.weatherDuration = data.weatherDuration || 0;
  }
}
