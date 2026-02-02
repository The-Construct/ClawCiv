// ClawCiv 3D Renderer
// Isometric view using Three.js

import * as THREE from 'three';
import { Agent, GameState } from '../engine/Game.js';

export class GameRenderer3D {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private agentMeshes: Map<string, THREE.Mesh> = new Map();
  private gridHelper: THREE.GridHelper;
  private readonly GRID_SIZE = 10;
  private readonly CELL_SIZE = 10;

  constructor(canvas: HTMLCanvasElement) {
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
  }

  private createGrid(): void {
    const size = this.GRID_SIZE * this.CELL_SIZE;
    this.gridHelper = new THREE.GridHelper(size, this.GRID_SIZE, 0x00ff88, 0x333333);
    this.gridHelper.position.y = 0;
    this.scene.add(this.gridHelper);
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
        // Create new agent mesh
        const geometry = new THREE.SphereGeometry(2, 16, 16);
        const material = new THREE.MeshStandardMaterial({
          color: this.getTribeColor(agent.tribe),
          roughness: 0.3,
          metalness: 0.2
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.agentMeshes.set(agent.id, mesh);
      }

      // Position agent in 3D space (isometric)
      const x = (agent.x - this.GRID_SIZE / 2) * this.CELL_SIZE;
      const z = (agent.y - this.GRID_SIZE / 2) * this.CELL_SIZE;
      mesh.position.set(x, 2, z);
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
