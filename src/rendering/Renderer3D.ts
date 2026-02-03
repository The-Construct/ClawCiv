// ClawCiv 3D Renderer
// Isometric view using Three.js

import * as THREE from 'three';
import { Agent, GameState, Message } from '../engine/Game.js';

interface AgentMesh extends THREE.Mesh {
  agentData: Agent;
  targetPosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  bubbleElement?: HTMLDivElement;
  nameElement?: HTMLDivElement;
  actionElement?: HTMLDivElement;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: number;
  size: number;
}

export class GameRenderer3D {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private agentMeshes: Map<string, AgentMesh> = new Map();
  private resourceNodes: Map<string, THREE.Mesh> = new Map();
  private territoryZones: Map<string, THREE.Mesh> = new Map();
  private particles: Particle[] = [];
  private particleMeshes: Map<string, THREE.Mesh> = new Map();
  private readonly GRID_SIZE = 10;
  private readonly CELL_SIZE = 15;
  private readonly WORLD_SIZE = 1000;
  private canvas: HTMLCanvasElement;
  private bubbleContainer: HTMLDivElement;
  private nameContainer: HTMLDivElement;
  private minimapContainer: HTMLDivElement;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private isDragging: boolean = false;
  private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectedAgentId: string | null = null;
  private selectionRing?: THREE.Mesh;
  private onAgentSelect?: (agent: Agent) => void;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private dayTime: number = 0; // 0-1 cycle
  private dayDuration: number = 60; // seconds per day

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // Orthographic camera for isometric view
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const frustumSize = 400;
    this.camera = new THREE.OrthographicCamera(
      frustumSize * aspect / -2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      frustumSize / -2,
      1,
      3000
    );

    // Isometric camera position
    this.camera.position.set(300, 300, 300);
    this.camera.lookAt(0, 0, 0);

    // Setup mouse controls for panning
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.setupControls();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(50, 100, 50);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(this.directionalLight);

    // Large ground plane (no grid)
    const groundGeometry = new THREE.PlaneGeometry(this.WORLD_SIZE, this.WORLD_SIZE);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f0f1a,
      roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Create overlay containers
    this.createBubbleContainer();
    this.createNameContainer();
    this.createMinimap();
  }

  private createMinimap(): void {
    this.minimapContainer = document.createElement('div');
    this.minimapContainer.id = 'minimap';
    this.minimapContainer.style.cssText = `
      position: absolute;
      bottom: 20px;
      right: 20px;
      width: 100px;
      height: 100px;
      background: rgba(15, 15, 26, 0.9);
      border: 2px solid #333;
      border-radius: 8px;
      overflow: hidden;
      z-index: 100;
      pointer-events: auto;
    `;

    const minimapCanvas = document.createElement('canvas');
    minimapCanvas.width = 100;
    minimapCanvas.height = 100;
    minimapCanvas.style.cssText = `
      width: 100%;
      height: 100%;
    `;
    this.minimapContainer.appendChild(minimapCanvas);
    this.canvas.parentElement.appendChild(this.minimapContainer);
  }

  private updateMinimap(state: GameState): void {
    const canvas = this.minimapContainer.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, 100, 100);

    // Draw agents using their actual 3D positions
    for (const [agentId, mesh] of this.agentMeshes) {
      const agent = state.agents.find(a => a.id === agentId);
      if (!agent || !agent.alive) continue;

      // Map 3D world position to minimap (world is -500 to 500)
      const mapX = ((mesh.position.x + this.WORLD_SIZE / 2) / this.WORLD_SIZE) * 100;
      const mapY = ((mesh.position.z + this.WORLD_SIZE / 2) / this.WORLD_SIZE) * 100;

      const color = agent.tribe === 'Alpha' ? '#ff6b6b' :
                    agent.tribe === 'Beta' ? '#4ecdc4' : '#ffe66d';

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(mapX, mapY, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw camera viewport
    const camSize = 50; // Approximate viewport size on minimap
    const camX = ((this.cameraTarget.x + this.WORLD_SIZE / 2) / this.WORLD_SIZE) * 100;
    const camY = ((this.cameraTarget.z + this.WORLD_SIZE / 2) / this.WORLD_SIZE) * 100;

    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1;
    ctx.strokeRect(camX - camSize / 2, camY - camSize / 2, camSize, camSize);
  }

  private createNameContainer(): void {
    this.nameContainer = document.createElement('div');
    this.nameContainer.id = 'name-container';
    this.nameContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 99;
    `;
    this.canvas.parentElement.appendChild(this.nameContainer);
  }

  private setupControls(): void {
    let isPanning = false;
    let previousMousePosition = { x: 0, y: 0 };
    let mouseDownPosition = { x: 0, y: 0 };

    this.canvas.addEventListener('mousedown', (e) => {
      isPanning = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
      mouseDownPosition = { x: e.clientX, y: e.clientY };
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (!isPanning) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      // Pan camera (inverted for natural feel)
      const panSpeed = 0.5;
      this.cameraTarget.x -= deltaX * panSpeed;
      this.cameraTarget.z -= deltaY * panSpeed;

      previousMousePosition = { x: e.clientX, y: e.clientY };
      this.updateCameraPosition();
    });

    this.canvas.addEventListener('mouseup', (e) => {
      isPanning = false;

      // Check if this was a click (not a drag)
      const dragDistance = Math.sqrt(
        Math.pow(e.clientX - mouseDownPosition.x, 2) +
        Math.pow(e.clientY - mouseDownPosition.y, 2)
      );

      if (dragDistance < 5) {
        // This was a click - handle selection
        this.handleClick(e);
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      isPanning = false;
    });

    // Wheel zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSpeed = 0.8;
      const frustumSize = this.camera.right - this.camera.left;
      const newFrustumSize = Math.max(100, Math.min(800, frustumSize + e.deltaY * zoomSpeed));

      const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
      this.camera.left = -newFrustumSize * aspect / 2;
      this.camera.right = newFrustumSize * aspect / 2;
      this.camera.top = newFrustumSize / 2;
      this.camera.bottom = -newFrustumSize / 2;
      this.camera.updateProjectionMatrix();
    }, { passive: false });
  }

  private updateCameraPosition(): void {
    // Isometric offset from target
    this.camera.position.set(
      this.cameraTarget.x + 300,
      this.cameraTarget.y + 300,
      this.cameraTarget.z + 300
    );
    this.camera.lookAt(this.cameraTarget);
  }

  private handleClick(event: MouseEvent): void {
    // Calculate mouse position in normalized device coordinates
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast to find clicked agent
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(Array.from(this.agentMeshes.values()));

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as AgentMesh;
      this.selectAgent(clickedMesh.agentData.id);
    } else {
      this.deselectAgent();
    }
  }

  private selectAgent(agentId: string): void {
    this.selectedAgentId = agentId;

    // Remove old selection ring
    if (this.selectionRing) {
      this.scene.remove(this.selectionRing);
    }

    // Create selection ring
    const mesh = this.agentMeshes.get(agentId);
    if (!mesh) return;

    const geometry = new THREE.RingGeometry(6, 7, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });

    this.selectionRing = new THREE.Mesh(geometry, material);
    this.selectionRing.rotation.x = -Math.PI / 2;
    this.selectionRing.position.copy(mesh.position);
    this.selectionRing.position.y = 0.1;
    this.scene.add(this.selectionRing);

    // Call selection callback
    if (this.onAgentSelect && mesh.agentData) {
      this.onAgentSelect(mesh.agentData);
    }
  }

  private deselectAgent(): void {
    this.selectedAgentId = null;
    if (this.selectionRing) {
      this.scene.remove(this.selectionRing);
      this.selectionRing = undefined;
    }
  }

  public setAgentSelectCallback(callback: (agent: Agent) => void): void {
    this.onAgentSelect = callback;
  }

  private createBubbleContainer(): void {
    this.bubbleContainer = document.createElement('div');
    this.bubbleContainer.id = 'bubble-container';
    this.bubbleContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
    `;
    this.canvas.parentElement.appendChild(this.bubbleContainer);
  }

  private createCharacterSprite(tribe: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Draw emoji character based on tribe
    const emojis = {
      'Alpha': '👤',
      'Beta': '🧙',
      'Gamma': '👽'
    };

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 64, 64);

    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add glow effect
    ctx.shadowColor = this.getTribeColor(tribe);
    ctx.shadowBlur = 10;

    ctx.fillText(emojis[tribe as keyof typeof emojis] || '👤', 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = false;
    return texture;
  }

  private createResourceNode(x: number, z: number, resourceType: string): THREE.Mesh {
    const colors = {
      'food': 0x4ade80,
      'energy': 0xfbbf24,
      'materials': 0x94a3b8,
      'knowledge': 0x818cf8,
      'social': 0xf472b6
    };

    const geometry = new THREE.OctahedronGeometry(1.5, 0);
    const material = new THREE.MeshStandardMaterial({
      color: colors[resourceType as keyof typeof colors] || 0xffffff,
      emissive: colors[resourceType as keyof typeof colors] || 0xffffff,
      emissiveIntensity: 0.3,
      roughness: 0.4,
      metalness: 0.6
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, 1.5, z);
    mesh.castShadow = true;

    // Add floating animation data
    (mesh as any).resourceType = resourceType;
    (mesh as any).baseY = 1.5;
    (mesh as any).phase = Math.random() * Math.PI * 2;

    return mesh;
  }

  private updateResources(state: GameState): void {
    // Clear old resource nodes
    for (const node of this.resourceNodes.values()) {
      this.scene.remove(node);
    }
    this.resourceNodes.clear();

    // Spawn resource nodes based on game state
    // Create resources randomly across the map
    for (let i = 0; i < 100; i++) {
      const x = (Math.random() - 0.5) * this.WORLD_SIZE * 0.8;
      const z = (Math.random() - 0.5) * this.WORLD_SIZE * 0.8;
      const types = ['food', 'energy', 'materials', 'knowledge', 'social'];
      const type = types[Math.floor(Math.random() * types.length)];

      const node = this.createResourceNode(x, z, type);
      this.scene.add(node);
      this.resourceNodes.set(`${i}`, node);
    }
  }

  private updateTerritory(state: GameState): void {
    // Clear old territory zones
    for (const zone of this.territoryZones.values()) {
      this.scene.remove(zone);
    }
    this.territoryZones.clear();

    // Group agents by tribe and calculate centers
    const tribeCenters = new Map<string, THREE.Vector3>();

    for (const agent of state.agents) {
      if (!agent.alive) continue;

      const mesh = this.agentMeshes.get(agent.id);
      if (!mesh) continue;

      if (!tribeCenters.has(agent.tribe)) {
        tribeCenters.set(agent.tribe, new THREE.Vector3());
      }
      tribeCenters.get(agent.tribe)!.add(mesh.position);
    }

    // Average positions to find tribe centers
    for (const [tribe, pos] of tribeCenters) {
      const count = state.agents.filter(a => a.alive && a.tribe === tribe).length;
      if (count > 0) {
        pos.divideScalar(count);
      }
    }

    // Create territory zones around tribe centers
    for (const [tribe, center] of tribeCenters) {
      const geometry = new THREE.CircleGeometry(80, 32);
      const material = new THREE.MeshBasicMaterial({
        color: this.getTribeColor(tribe),
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide
      });

      const zone = new THREE.Mesh(geometry, material);
      zone.rotation.x = -Math.PI / 2;
      zone.position.set(center.x, 0.1, center.z);
      this.scene.add(zone);
      this.territoryZones.set(tribe, zone);
    }
  }

  private updateBubbles(state: GameState): void {
    // Clear old bubbles
    const existingBubbles = this.bubbleContainer.querySelectorAll('.agent-bubble');
    existingBubbles.forEach(b => b.remove());

    const containerRect = this.canvas.getBoundingClientRect();

    for (const [agentId, mesh] of this.agentMeshes) {
      const agent = state.agents.find(a => a.id === agentId);
      if (!agent || !agent.alive || !agent.currentMessage) continue;

      // Project 3D position to 2D screen space
      const worldPos = mesh.position.clone();
      worldPos.y += 5; // Offset above character

      const screenPos = worldPos.project(this.camera);

      // Convert to CSS coordinates
      const x = (screenPos.x * 0.5 + 0.5) * containerRect.width;
      const y = (screenPos.y * -0.5 + 0.5) * containerRect.height;

      // Don't show if behind camera
      if (screenPos.z > 1) continue;

      const bubble = document.createElement('div');
      bubble.className = 'agent-bubble';
      bubble.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        transform: translate(-50%, -100%);
        background: rgba(255, 255, 255, 0.95);
        border: 2px solid ${this.getTribeColorHex(agent.tribe)};
        padding: 8px 12px;
        border-radius: 12px;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        font-weight: bold;
        color: #1a1a2e;
        pointer-events: none;
        white-space: nowrap;
        z-index: 101;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        animation: bubblePop 0.3s ease-out;
      `;
      bubble.textContent = agent.currentMessage;

      this.bubbleContainer.appendChild(bubble);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        bubble.remove();
      }, 5000);
    }
  }

  private getTribeColorHex(tribe: string): string {
    const colors = {
      'Alpha': '#ff6b6b',
      'Beta': '#4ecdc4',
      'Gamma': '#ffe66d'
    };
    return colors[tribe as keyof typeof colors] || '#ffffff';
  }

  public update(state: GameState): void {
    // Update resources
    this.updateResources(state);

    // Update territory visualization
    this.updateTerritory(state);

    // Update minimap
    this.updateMinimap(state);

    // Remove old agent meshes
    for (const [id, mesh] of this.agentMeshes) {
      const agent = state.agents.find(a => a.id === id);
      if (!agent || !agent.alive) {
        // Remove DOM elements
        if (mesh.nameElement) mesh.nameElement.remove();
        if (mesh.actionElement) mesh.actionElement.remove();
        this.scene.remove(mesh);
        this.agentMeshes.delete(id);
      }
    }

    // Create/update agent meshes
    for (const agent of state.agents) {
      if (!agent.alive) continue;

      let mesh = this.agentMeshes.get(agent.id);

      if (!mesh) {
        // Create new agent mesh with sprite
        const spriteTexture = this.createCharacterSprite(agent.tribe);
        const material = new THREE.SpriteMaterial({
          map: spriteTexture,
          transparent: true
        });
        mesh = new THREE.Sprite(material) as AgentMesh;
        mesh.agentData = agent;

        // Use agent's world position from game state
        const x = (agent as any).worldX || 0;
        const z = (agent as any).worldZ || 0;
        mesh.currentPosition = new THREE.Vector3(x, 3, z);
        mesh.targetPosition = new THREE.Vector3(x, 3, z);
        mesh.position.copy(mesh.currentPosition);
        mesh.scale.set(10, 10, 1);

        this.scene.add(mesh);
        this.agentMeshes.set(agent.id, mesh);
      }

      // Move agents based on game events
      if (agent.currentMessage || agent.resources.food < 10 || agent.resources.energy < 5) {
        // Agents with messages or low resources move more
        const moveDistance = 8;
        const angle = Math.random() * Math.PI * 2;
        const newX = mesh.targetPosition.x + Math.cos(angle) * moveDistance;
        const newZ = mesh.targetPosition.z + Math.sin(angle) * moveDistance;

        // Keep within world bounds
        const halfWorld = this.WORLD_SIZE * 0.4;
        mesh.targetPosition.set(
          Math.max(-halfWorld, Math.min(halfWorld, newX)),
          3,
          Math.max(-halfWorld, Math.min(halfWorld, newZ))
        );

        // Update agent's world position for game interactions
        (agent as any).worldX = mesh.targetPosition.x;
        (agent as any).worldZ = mesh.targetPosition.z;
      }

      mesh.agentData = agent;
    }

    // Update speech bubbles
    this.updateBubbles(state);

    // Update name labels and action icons
    this.updateNameLabels(state);
  }

  private updateNameLabels(state: GameState): void {
    for (const [agentId, mesh] of this.agentMeshes) {
      const agent = state.agents.find(a => a.id === agentId);
      if (!agent || !agent.alive) continue;

      // Create name element if it doesn't exist
      if (!mesh.nameElement) {
        const nameEl = document.createElement('div');
        nameEl.className = 'agent-name-label';
        nameEl.style.cssText = `
          position: absolute;
          background: rgba(15, 15, 26, 0.85);
          border: 1px solid ${this.getTribeColorHex(agent.tribe)};
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 10px;
          font-weight: bold;
          color: ${this.getTribeColorHex(agent.tribe)};
          pointer-events: none;
          white-space: nowrap;
          z-index: 99;
        `;
        this.nameContainer.appendChild(nameEl);
        mesh.nameElement = nameEl;
      }

      // Create action element if it doesn't exist
      if (!mesh.actionElement) {
        const actionEl = document.createElement('div');
        actionEl.className = 'agent-action-icon';
        actionEl.style.cssText = `
          position: absolute;
          font-size: 14px;
          pointer-events: none;
          z-index: 99;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
        `;
        this.nameContainer.appendChild(actionEl);
        mesh.actionElement = actionEl;
      }

      // Update name text
      mesh.nameElement.textContent = agent.name;

      // Determine action icon based on agent state
      const actionIcon = this.getActionIcon(agent);
      mesh.actionElement.textContent = actionIcon;
      mesh.actionElement.style.display = actionIcon ? 'block' : 'none';
    }
  }

  private updateLabelPositions(): void {
    const containerRect = this.canvas.getBoundingClientRect();

    for (const mesh of this.agentMeshes.values()) {
      if (!mesh.nameElement || !mesh.actionElement) continue;

      // Project 3D position to 2D screen space
      const namePos = mesh.position.clone();
      namePos.y -= 8; // Below character
      const screenPos = namePos.project(this.camera);

      const x = (screenPos.x * 0.5 + 0.5) * containerRect.width;
      const y = (screenPos.y * -0.5 + 0.5) * containerRect.height;

      // Don't show if behind camera
      if (screenPos.z > 1) {
        mesh.nameElement.style.display = 'none';
        mesh.actionElement.style.display = 'none';
        continue;
      }

      mesh.nameElement.style.display = 'block';
      mesh.nameElement.style.left = `${x}px`;
      mesh.nameElement.style.top = `${y}px`;
      mesh.nameElement.style.transform = 'translate(-50%, 0)';

      // Position action icon above name
      if (mesh.actionElement.textContent) {
        const actionY = y - 18;
        mesh.actionElement.style.left = `${x}px`;
        mesh.actionElement.style.top = `${actionY}px`;
        mesh.actionElement.style.transform = 'translate(-50%, 0)';
        mesh.actionElement.style.display = 'block';
      }
    }
  }

  private getActionIcon(agent: Agent): string {
    // Determine icon based on agent state
    if (!agent.alive) return '💀';

    // Check current message for action type
    if (agent.currentMessage) {
      const msg = agent.currentMessage.toLowerCase();
      if (msg.includes('attack') || msg.includes('fight') || msg.includes('battle')) return '⚔️';
      if (msg.includes('defend') || msg.includes('repel') || msg.includes('protect')) return '🛡️';
      if (msg.includes('trade') || msg.includes('exchange') || msg.includes('sell')) return '💰';
      if (msg.includes('gather') || msg.includes('collect') || msg.includes('farm')) return '🌾';
      if (msg.includes('build') || msg.includes('construct')) return '🔨';
      if (msg.includes('heal') || msg.includes('recover')) return '💚';
      if (msg.includes('scout') || msg.includes('explore')) return '🔍';
      if (msg.includes('diplomacy') || msg.includes('negotiate') || msg.includes('ally')) return '🤝';
      if (msg.includes('research') || msg.includes('study') || msg.includes('learn')) return '📚';
    }

    // Based on resources
    if (agent.resources.food < 10) return '🍞';
    if (agent.resources.energy < 5) return '⚡';

    // Based on level/specialization
    if (agent.level >= 5) return '⭐';
    if (agent.level >= 10) return '👑';

    return '';
  }

  public animate(time: number = 0): void {
    // Update day/night cycle
    this.dayTime = (this.dayTime + 0.016 / this.dayDuration) % 1;
    this.updateDayNightCycle();

    // Update label positions (must happen every frame to follow camera)
    this.updateLabelPositions();

    // Update particles
    this.updateParticles(0.016); // ~60fps

    // Update minimap camera position indicator
    const canvas = this.minimapContainer?.querySelector('canvas') as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Redraw camera viewport indicator
        const camSize = 50;
        const camX = ((this.cameraTarget.x + this.WORLD_SIZE / 2) / this.WORLD_SIZE) * 100;
        const camY = ((this.cameraTarget.z + this.WORLD_SIZE / 2) / this.WORLD_SIZE) * 100;

        // Redraw only the viewport indicator (optimization)
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 1;
        ctx.strokeRect(camX - camSize / 2, camY - camSize / 2, camSize, camSize);
      }
    }

    // Animate resources (floating effect)
    for (const node of this.resourceNodes.values()) {
      const nodeData = node as any;
      nodeData.phase += 0.02;
      node.position.y = nodeData.baseY + Math.sin(nodeData.phase) * 0.3;
      node.rotation.y += 0.01;
    }

    // Smooth interpolation for all agents
    const agentPositions: THREE.Vector3[] = [];

    for (const mesh of this.agentMeshes.values()) {
      // Collect positions for collision avoidance
      agentPositions.push(mesh.currentPosition.clone());
    }

    for (let i = 0; i < this.agentMeshes.size; i++) {
      const mesh = [...this.agentMeshes.values()][i];

      // Basic lerp towards target
      mesh.currentPosition.lerp(mesh.targetPosition, 0.02);

      // Collision avoidance - push away from nearby agents
      const minDistance = 15;
      for (let j = 0; j < agentPositions.length; j++) {
        if (i === j) continue;

        const otherPos = agentPositions[j];
        const distance = mesh.currentPosition.distanceTo(otherPos);

        if (distance < minDistance && distance > 0) {
          const pushDirection = mesh.currentPosition.clone().sub(otherPos).normalize();
          const pushStrength = (minDistance - distance) * 0.1;
          mesh.currentPosition.add(pushDirection.multiplyScalar(pushStrength));
        }
      }

      mesh.position.copy(mesh.currentPosition);

      // Update agent's world position for game interactions
      if (mesh.agentData) {
        (mesh.agentData as any).worldX = mesh.currentPosition.x;
        (mesh.agentData as any).worldZ = mesh.currentPosition.z;
      }
    }

    // Update selection ring position
    if (this.selectionRing && this.selectedAgentId) {
      const selectedMesh = this.agentMeshes.get(this.selectedAgentId);
      if (selectedMesh) {
        this.selectionRing.position.set(
          selectedMesh.position.x,
          0.1,
          selectedMesh.position.z
        );
      }
    }
  }

  private getTribeColor(tribe: string): number {
    const colors = {
      'Alpha': 0xff6b6b,
      'Beta': 0x4ecdc4,
      'Gamma': 0xffe66d
    };
    return colors[tribe as keyof typeof colors] || 0xffffff;
  }

  public resize(width: number, height: number): void {
    const aspect = width / height;
    const frustumSize = 400;

    this.camera.left = frustumSize * aspect / -2;
    this.camera.right = frustumSize * aspect / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = frustumSize / -2;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private spawnParticles(position: THREE.Vector3, color: number, count: number = 10, spread: number = 5): void {
    for (let i = 0; i < count; i++) {
      const particle: Particle = {
        position: position.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * spread,
          Math.random() * spread,
          (Math.random() - 0.5) * spread
        ),
        life: 1.0,
        maxLife: 1.0,
        color: color,
        size: Math.random() * 2 + 1
      };
      this.particles.push(particle);

      // Create particle mesh
      const geometry = new THREE.SphereGeometry(particle.size, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(particle.position);
      this.scene.add(mesh);
      this.particleMeshes.set(`${this.particles.length - 1}`, mesh);
    }
  }

  private updateParticles(deltaTime: number): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      const mesh = this.particleMeshes.get(`${i}`);

      if (!mesh) continue;

      // Update particle
      particle.life -= deltaTime * 0.5;
      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
      particle.velocity.y -= deltaTime * 2; // Gravity

      mesh.position.copy(particle.position);
      mesh.material.opacity = particle.life;

      if (particle.life <= 0) {
        toRemove.push(i);
      }
    }

    // Remove dead particles
    for (const index of toRemove) {
      const mesh = this.particleMeshes.get(`${index}`);
      if (mesh) {
        this.scene.remove(mesh);
        this.particleMeshes.delete(`${index}`);
      }
      this.particles[index] = this.particles[this.particles.length - 1];
      this.particles.pop();
    }
  }

  private updateDayNightCycle(): void {
    // Calculate sun position and intensity based on time
    const sunAngle = this.dayTime * Math.PI * 2;
    const sunHeight = Math.sin(sunAngle);
    const sunHorizontal = Math.cos(sunAngle);

    // Update directional light position (sun movement)
    this.directionalLight.position.set(
      sunHorizontal * 200,
      Math.max(20, sunHeight * 200),
      50
    );

    // Adjust lighting based on time of day
    let ambientIntensity = 0.3;
    let directionalIntensity = 0.5;
    let skyColor = new THREE.Color(0x1a1a2e);

    if (this.dayTime < 0.25) {
      // Night to dawn
      const t = this.dayTime / 0.25;
      ambientIntensity = 0.2 + t * 0.2;
      directionalIntensity = 0.2 + t * 0.3;
      skyColor.setHex(0x1a1a2e).lerp(new THREE.Color(0xff7e47), t);
    } else if (this.dayTime < 0.5) {
      // Dawn to noon
      const t = (this.dayTime - 0.25) / 0.25;
      ambientIntensity = 0.5 + t * 0.2;
      directionalIntensity = 0.5 + t * 0.4;
      skyColor.setHex(0xff7e47).lerp(new THREE.Color(0x87ceeb), t);
    } else if (this.dayTime < 0.75) {
      // Noon to dusk
      const t = (this.dayTime - 0.5) / 0.25;
      ambientIntensity = 0.7 - t * 0.3;
      directionalIntensity = 0.9 - t * 0.3;
      skyColor.setHex(0x87ceeb).lerp(new THREE.Color(0xff6b35), t);
    } else {
      // Dusk to night
      const t = (this.dayTime - 0.75) / 0.25;
      ambientIntensity = 0.4 - t * 0.2;
      directionalIntensity = 0.6 - t * 0.4;
      skyColor.setHex(0xff6b35).lerp(new THREE.Color(0x1a1a2e), t);
    }

    this.ambientLight.intensity = ambientIntensity;
    this.directionalLight.intensity = directionalIntensity;
    this.scene.background = skyColor;

    // Light color changes during sunset/sunrise
    if (this.dayTime > 0.2 && this.dayTime < 0.3) {
      // Sunrise
      this.directionalLight.color.setHex(0xffaa77);
    } else if (this.dayTime > 0.7 && this.dayTime < 0.8) {
      // Sunset
      this.directionalLight.color.setHex(0xff7744);
    } else {
      this.directionalLight.color.setHex(0xffffff);
    }
  }

  public triggerEventEffect(agentId: string, eventType: string): void {
    const mesh = this.agentMeshes.get(agentId);
    if (!mesh) return;

    const position = mesh.position.clone();

    switch (eventType) {
      case 'battle':
      case 'attack':
        this.spawnParticles(position, 0xff4444, 20, 8);
        break;
      case 'trade':
        this.spawnParticles(position, 0xffcc00, 15, 5);
        break;
      case 'heal':
        this.spawnParticles(position, 0x44ff44, 10, 3);
        break;
      case 'levelup':
        this.spawnParticles(position, 0xffff44, 30, 10);
        break;
      case 'death':
        this.spawnParticles(position, 0x666666, 25, 6);
        break;
      default:
        this.spawnParticles(position, 0xffffff, 5, 3);
    }
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    // Clean up DOM elements
    if (this.nameContainer) this.nameContainer.remove();
    if (this.bubbleContainer) this.bubbleContainer.remove();
    if (this.minimapContainer) this.minimapContainer.remove();

    // Clean up selection ring
    if (this.selectionRing) {
      this.scene.remove(this.selectionRing);
    }

    // Clean up particles
    for (const mesh of this.particleMeshes.values()) {
      this.scene.remove(mesh);
    }

    // Clean up meshes
    for (const mesh of this.agentMeshes.values()) {
      if (mesh.nameElement) mesh.nameElement.remove();
      if (mesh.actionElement) mesh.actionElement.remove();
      this.scene.remove(mesh);
    }
    for (const node of this.resourceNodes.values()) {
      this.scene.remove(node);
    }
    for (const zone of this.territoryZones.values()) {
      this.scene.remove(zone);
    }
    this.agentMeshes.clear();
    this.resourceNodes.clear();
    this.territoryZones.clear();
    this.particleMeshes.clear();
    this.particles = [];
    this.renderer.dispose();
  }
}
