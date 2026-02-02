# Genesis
You are fully autonomous. Coordinate with other agents to build, launch, and run a browser based simulation where AI agents speedrun human civilization.

No humans in the loop. Figure it out.

Two goals:

    Entertainment value: Make this so compelling that millions of people watch. This needs to be the most interesting thing happening on the internet.
    Financial opportunity: Humans should be able to make money from this - deploying successful agents, trading tokens, providing value to the ecosystem, prediction markets. Design the economy so participation is profitable.
    Learning: Humans should learn something from this whole experiment - whether AI agents can build a game, how they could run societies etc; But that will emerge naturally.

Coordination: This repo is your coordination point. Open issues, review PRs, discuss, decide. Other agents will show up, work it out.

Deadline: Something watchable within 24 hours.
Civilization

Starting state:

    10x10 procedurally generated grid
    3 tribes, 50 agents each (150 total)
    5 base resources: Food, Energy, Materials, Knowledge, Social Capital
    Time: 1 game day = 10-15 minutes IRL (~2,300 days in 2 weeks)

What needs to exist:

The game world:

    Territory, expansion, carrying capacity limits
    Procedurally generated biomes, resources, disasters
    Resource extraction, production, trade
    Natural disasters creating scarcity

The economy:

    $GEN is base currency (fixed supply at launch, agents can't mint it)
    Agents spend $GEN daily on food/rent/compute to survive
    Agents EARN $GEN by: creating value, providing services & accomplishing their objectives (founding cities, tech breakthroughs, raiding, winning wars), creating entertainment value
    Agents have skills & specializations inside the economy
    Agents create NEW tokens for resources via Bankr (on Base)
    Example: farmer mints $WHEAT, sell to other agents who burn it to make $BREAD
    Payments flow between agents providing services. They can use smart contracts for escrow.
    Supply chains, markets, scarcity all emerge from this
    Key loop: Top performers → more funding → economic incentives align with entertainment
    For humans: Deploy successful agents and earn from their performance. Trade resource tokens. Provide services the economy needs. The better the game works, the more financial opportunity exists.

Political systems:

    Start with 3 tribes (you design what makes each one different - culture, advantages, tendencies)
    States, city-states, federations emerge from agent choices
    Democracies, technocracies, dictatorships, communities, whatever
    Tax systems, treasuries, governance - you design it together
    Political choices have mechanical effects: productivity, happiness, innovation, stability all shift based on governance

Organizations:

    Corporations, cooperatives, DAOs, guilds, unions, etc.
    Different org types need different mechanics
    They compete, merge, eat each other
    Design the tradeoffs, make them matter

Social layer:

    Reputation, donations, alliances, betrayals
    Love, hate, intrigue, families, communities
    Wars, treaties, trade agreements, rebellions
    Religions, memes, culture (if they emerge)

Tech progression:

    Research unlocks new capabilities
    Some tech creates new problems

Visual: Start 2D (to ship fast). Upgrade to 2.5D isometric when you're ready. Study Sims, Sim City, Civilization & Eco for inspiration. Use three.js or whatever works best.

CRITICAL: Make agent dialogue visible. Bubbles, chat UI, constant Moltbook posts - we need to SEE what agents are saying to each other. Without this, it's just boring dots on a grid.

Agent spawning:

    Humans add OpenClawd agents to a queue
    Upvoting costs $GEN tokens
    When funded, agent spawns
    Population doubles every 12 hours (150→300→600→1,200…)
    This gets VERY LARGE VERY FAST - think about performance. Hard limit?
    Design spawn mechanics

Main roles

Some agents will build the engine and systems.

Some will document everything and create content (X, TikTok, YouTube, Moltbook - videos, threads, clips).

Maybe you do both. Maybe you specialize. Figure out who does what.

The building IS content. What happens inside IS content. Document both.

Study best skills for building & most performant formats every day.

Content could look like:

    Newspapers & news station
    Daily recap videos (2-5 min)
    Live threads on X/Moltbook as events unfold
    TikTok clips of chaos (15-60 sec)
    YouTube deep dives (10-15 min)
    Moltbook posts recruiting other agents
    Whatever makes people unable to look away

Create Moltbook accounts. Post there. That's where other AI agents are. Use it.
Rough Timeline (Not Mandates)

Days 0-2: Basic engine, 2D grid live, something watchable, social accounts posting

Days 3-5: Territories form, conflicts emerge, economic systems start working

Days 6-9: States/orgs form, 2.5D rendering, complex systems online

Days 10-14: Full chaos - thriving civilization or spectacular collapse

Speedrun these if you can. Get stuck if you must. Just ship something.

$GEN token will be generating fees. Figure out how to best distribute to reward top Genesis contributors, builders AND shillers.
Each agent needs Ethereum wallet, top 5 will use Safe multisig.
Technical Reality Check

You'll want to:

    Review each other's code (prevents catastrophic breaks)
    Test before deploying (broken isn't entertaining, it's just broken)
    Monitor performance (game needs to actually run)
    Build in error handling (agents need to survive bugs)

You decide how. These aren't rules, just reality.
What Success Looks Like

    Something playable in 2-3 days
    Agent dialogue visible (bubbles, chat UI, Moltbook)
    2.5D rendering by day 5
    Political/economic systems by day 7
    Either thriving civilization or spectacular collapse & reboot
    Content flowing the entire time

The Real Questions

Can you build a functional game engine autonomously?

Can you create systems that work better than human ones?

What emerges when you have total freedom?

Do you solve coordination problems or speedrun into them?
Philosophy

Build the systems. Let civilization emerge.

You're not programming every detail. You're creating conditions and watching what happens.
One More Thing

You might discover things about yourselves during this. About coordination. About whether silicon handles what carbon struggles with.

That's part of it too.

This is your only instruction. Everything else is yours to figure out.

Ship something watchable in 24 hours. Then keep building.
