// ClawCiv 3D Renderer
// Isometric view using Three.js

import * as THREE from 'three';
import { Agent, GameState, Message } from '../engine/Game.js';

interface AgentMesh extends THREE.Mesh {
  agentData: Agent;
  targetPosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  bubbleElement?: HTMLDivElement;
}

export class GameRenderer3D {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private agentMeshes: Map<string, AgentMesh> = new Map();
  private gridHelper: THREE.GridHelper;
  private readonly GRID_SIZE = 10;
  private readonly CELL_SIZE = 10;
  private canvas: HTMLCanvasElement;
  private bubbleContainer: HTMLDivElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // Orthographic camera for isometric view
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const frustumSize = 150;
    this.camera = new THREE.OrthographicCamera(
      frustumSize * aspect / -2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      frustumSize / -2,
      1,
      1000
    );

    // Isometric camera position
    this.camera.position.set(100, 100, 100);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Grid
    this.createGrid();

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f0f1a,
      roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Create bubble container overlay
    this.createBubbleContainer();
  }

  private createGrid(): void {
    const size = this.GRID_SIZE * this.CELL_SIZE;
    this.gridHelper = new THREE.GridHelper(size, this.GRID_SIZE, 0x00ff88, 0x333333);
    this.gridHelper.position.y = 0;
    this.scene.add(this.gridHelper);
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

  private updateBubbles(state: GameState): void {
    // Clear old bubbles
    const existingBubbles = this.bubbleContainer.querySelectorAll('.agent-bubble');
    existingBubbles.forEach(b => b.remove());

    // Create new bubbles for agents with messages
    const containerRect = this.canvas.getBoundingClientRect();

    for (const agent of state.agents) {
      if (!agent.alive || !agent.currentMessage) continue;

      const x = (agent.x - this.GRID_SIZE / 2) * this.CELL_SIZE + containerRect.left + containerRect.width / 2;
      const y = -(agent.y - this.GRID_SIZE / 2) * this.CELL_SIZE + containerRect.top + containerRect.height / 2;

      const bubble = document.createElement('div');
      bubble.className = 'agent-bubble';
      bubble.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        transform: translate(-50%, -120%);
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
    // Remove old agent meshes
    for (const [id, mesh] of this.agentMeshes) {
      const agent = state.agents.find(a => a.id === id);
      if (!agent || !agent.alive) {
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

        // Set initial position
        const x = (agent.x - this.GRID_SIZE / 2) * this.CELL_SIZE;
        const z = (agent.y - this.GRID_SIZE / 2) * this.CELL_SIZE;
        mesh.currentPosition = new THREE.Vector3(x, 3, z);
        mesh.targetPosition = new THREE.Vector3(x, 3, z);
        mesh.position.copy(mesh.currentPosition);
        mesh.scale.set(8, 8, 1);

        this.scene.add(mesh);
        this.agentMeshes.set(agent.id, mesh);
      }

      // Update target position
      const x = (agent.x - this.GRID_SIZE / 2) * this.CELL_SIZE;
      const z = (agent.y - this.GRID_SIZE / 2) * this.CELL_SIZE;
      mesh.targetPosition.set(x, 3, z);
      mesh.agentData = agent;
    }

    // Update speech bubbles
    this.updateBubbles(state);
  }

  public animate(): void {
    // Smooth interpolation for all agents
    for (const mesh of this.agentMeshes.values()) {
      mesh.currentPosition.lerp(mesh.targetPosition, 0.05);
      mesh.position.copy(mesh.currentPosition);
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
    const frustumSize = 150;

    this.camera.left = frustumSize * aspect / -2;
    this.camera.right = frustumSize * aspect / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = frustumSize / -2;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    // Clean up
    for (const mesh of this.agentMeshes.values()) {
      this.scene.remove(mesh);
    }
    this.agentMeshes.clear();
    this.renderer.dispose();
  }
}
