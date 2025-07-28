// --- Enhanced Grid Cell Structure ---
// Each grid cell is now a rich environment object instead of just a color
class GridCell {
    constructor() {
        this.color = 0;              // Visual color index (0-11)
        this.pheromones = {          // Multiple pheromone trails
            trail_A: 0,              // Home/food trail
            trail_B: 0,              // Danger/territory trail
            trail_C: 0               // Communication trail
        };
        this.food = 0;               // Food resources (0-100)
        this.charge = 0;             // Electrical charge (-1, 0, +1)
        this.obstacle = false;       // Impassable wall
        this.metadata = {};          // Extensible metadata for future features
    }

    // Get the visual color for rendering
    getColor() {
        return this.color;
    }

    // Set the visual color
    setColor(colorIndex) {
        this.color = Math.max(0, Math.min(11, colorIndex));
    }

    // Add pheromone to a specific trail
    addPheromone(trailType, amount = 1) {
        if (this.pheromones.hasOwnProperty(trailType)) {
            this.pheromones[trailType] = Math.max(0, Math.min(100, this.pheromones[trailType] + amount));
        }
    }

    // Get pheromone level for a specific trail
    getPheromone(trailType) {
        return this.pheromones[trailType] || 0;
    }

    // Decay pheromones over time
    decayPheromones(decayRate = 0.1) {
        for (const trail in this.pheromones) {
            this.pheromones[trail] = Math.max(0, this.pheromones[trail] - decayRate);
        }
    }

    // Add food to the cell
    addFood(amount = 10) {
        this.food = Math.max(0, Math.min(100, this.food + amount));
    }

    // Consume food from the cell
    consumeFood(amount = 1) {
        const consumed = Math.min(this.food, amount);
        this.food -= consumed;
        return consumed;
    }

    // Set electrical charge
    setCharge(charge) {
        this.charge = Math.max(-1, Math.min(1, charge));
    }

    // Check if cell is passable
    isPassable() {
        return !this.obstacle;
    }

    // Set obstacle state
    setObstacle(isObstacle) {
        this.obstacle = Boolean(isObstacle);
    }

    // Create a copy of this cell
    clone() {
        const newCell = new GridCell();
        newCell.color = this.color;
        newCell.pheromones = { ...this.pheromones };
        newCell.food = this.food;
        newCell.charge = this.charge;
        newCell.obstacle = this.obstacle;
        newCell.metadata = { ...this.metadata };
        return newCell;
    }

    // Serialize for saving/loading
    serialize() {
        return {
            color: this.color,
            pheromones: this.pheromones,
            food: this.food,
            charge: this.charge,
            obstacle: this.obstacle,
            metadata: this.metadata
        };
    }

    // Load from serialized data
    deserialize(data) {
        this.color = data.color || 0;
        this.pheromones = data.pheromones || { trail_A: 0, trail_B: 0, trail_C: 0 };
        this.food = data.food || 0;
        this.charge = data.charge || 0;
        this.obstacle = data.obstacle || false;
        this.metadata = data.metadata || {};
    }
}

// --- Enhanced Ant Structure ---
// Each ant is now an intelligent agent with internal state and goals
class Ant {
    constructor(x, y, dir = 1, type = 'Worker') {
        // Basic properties
        this.x = x;
        this.y = y;
        this.dir = dir;                    // Current direction (0=N, 1=E, 2=S, 3=W)
        this.state = 0;                    // Current rule state
        
        // Enhanced properties from charter
        this.type = type;                  // Ant archetype: Worker, Scout, Soldier, Queen
        this.energy = 100;                 // Energy level (0-100, depletes with actions)
        this.maxEnergy = 100;              // Maximum energy capacity
        this.task = 'WANDERING';           // Current task/goal state
        this.backpack = null;              // What the ant is carrying
        this.memory = [];                  // Short-term memory of recent locations/interactions
        this.maxMemorySize = 10;           // Maximum memory entries
        
        // Individual rule set (optional)
        this.individualRule = null;
        
        // Behavioral parameters based on type
        this.setupTypeProperties(type);
        
        // Task-specific properties
        this.taskData = {};                // Data specific to current task
        this.homeLocation = { x, y };      // Remember starting location as home
        this.lastFoodLocation = null;      // Remember where food was found
        this.stepsWithoutFood = 0;         // Track hunger
        this.age = 0;                      // Age in simulation steps
    }
    
    setupTypeProperties(type) {
        switch (type) {
            case 'Worker':
                this.maxEnergy = 80;
                this.energy = 80;
                this.energyPerStep = 0.1;      // Energy consumed per step
                this.carryCapacity = 10;       // How much food can carry
                this.preferredTasks = ['SEEKING_FOOD', 'RETURNING_HOME', 'WANDERING'];
                break;
                
            case 'Scout':
                this.maxEnergy = 120;
                this.energy = 120;
                this.energyPerStep = 0.15;
                this.carryCapacity = 5;
                this.preferredTasks = ['EXPLORING', 'WANDERING'];
                this.explorationRadius = 50;   // How far scouts will venture
                break;
                
            case 'Soldier':
                this.maxEnergy = 150;
                this.energy = 150;
                this.energyPerStep = 0.2;
                this.carryCapacity = 0;        // Soldiers don't carry food
                this.preferredTasks = ['PATROLLING', 'DEFENDING'];
                this.territoryRadius = 20;     // Patrol area around home
                break;
                
            case 'Queen':
                this.maxEnergy = 200;
                this.energy = 200;
                this.energyPerStep = 0.05;     // Queens conserve energy
                this.carryCapacity = 0;
                this.preferredTasks = ['LAYING_EGGS', 'RESTING'];
                this.eggLayingCooldown = 0;
                break;
                
            default: // Generic ant
                this.maxEnergy = 100;
                this.energy = 100;
                this.energyPerStep = 0.1;
                this.carryCapacity = 5;
                this.preferredTasks = ['WANDERING'];
        }
    }
    
    // Energy management
    consumeEnergy(amount = null) {
        const energyCost = amount || this.energyPerStep;
        this.energy = Math.max(0, this.energy - energyCost);
        return this.energy > 0;
    }
    
    gainEnergy(amount) {
        this.energy = Math.min(this.maxEnergy, this.energy + amount);
    }
    
    // Memory management
    addMemory(entry) {
        this.memory.push({
            ...entry,
            timestamp: Date.now(),
            step: stepCounter
        });
        
        // Keep memory within size limit
        if (this.memory.length > this.maxMemorySize) {
            this.memory.shift(); // Remove oldest entry
        }
    }
    
    // Get recent memory of a specific type
    getRecentMemory(type, maxAge = 100) {
        return this.memory
            .filter(entry => entry.type === type && (stepCounter - entry.step) <= maxAge)
            .sort((a, b) => b.step - a.step); // Most recent first
    }
    
    // Backpack/carrying management
    pickUpItem(item, amount = 1) {
        if (!this.backpack && this.carryCapacity > 0) {
            this.backpack = { type: item, amount: Math.min(amount, this.carryCapacity) };
            return this.backpack.amount;
        } else if (this.backpack && this.backpack.type === item) {
            const canCarry = this.carryCapacity - this.backpack.amount;
            const picked = Math.min(amount, canCarry);
            this.backpack.amount += picked;
            return picked;
        }
        return 0; // Couldn't pick up
    }
    
    dropItem(amount = null) {
        if (!this.backpack) return null;
        
        const dropAmount = amount || this.backpack.amount;
        const actualDrop = Math.min(dropAmount, this.backpack.amount);
        
        const droppedItem = {
            type: this.backpack.type,
            amount: actualDrop
        };
        
        this.backpack.amount -= actualDrop;
        if (this.backpack.amount <= 0) {
            this.backpack = null;
        }
        
        return droppedItem;
    }
    
    // Task management
    setTask(newTask, taskData = {}) {
        const oldTask = this.task;
        this.task = newTask;
        this.taskData = { ...taskData };
        
        // Add task change to memory
        this.addMemory({
            type: 'TASK_CHANGE',
            oldTask,
            newTask,
            location: { x: this.x, y: this.y }
        });
    }
    
    // Check if ant should die (energy depleted)
    isDead() {
        return this.energy <= 0;
    }
    
    // Age the ant
    ageOneStep() {
        this.age++;
        this.stepsWithoutFood++;
        
        // Consume energy based on current activity
        let energyCost = this.energyPerStep;
        
        // Additional energy costs for certain tasks
        if (this.task === 'SEEKING_FOOD' || this.task === 'EXPLORING') {
            energyCost *= 1.2; // Searching is tiring
        } else if (this.task === 'RESTING') {
            energyCost *= 0.5; // Resting conserves energy
        }
        
        this.consumeEnergy(energyCost);
        
        // Task-specific aging
        if (this.taskData.cooldown) {
            this.taskData.cooldown = Math.max(0, this.taskData.cooldown - 1);
        }
        
        if (this.eggLayingCooldown) {
            this.eggLayingCooldown = Math.max(0, this.eggLayingCooldown - 1);
        }
    }
    
    // Get distance to home
    getDistanceToHome() {
        const dx = this.x - this.homeLocation.x;
        const dy = this.y - this.homeLocation.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Check if ant is at home
    isAtHome(tolerance = 2) {
        return this.getDistanceToHome() <= tolerance;
    }
    
    // Get ant's status summary for UI
    getStatusSummary() {
        return {
            type: this.type,
            energy: Math.round(this.energy),
            task: this.task,
            carrying: this.backpack ? `${this.backpack.type} (${this.backpack.amount})` : 'nothing',
            age: this.age,
            memoryEntries: this.memory.length,
            distanceFromHome: Math.round(this.getDistanceToHome())
        };
    }
    
    // Serialize ant for saving
    serialize() {
        return {
            x: this.x,
            y: this.y,
            dir: this.dir,
            state: this.state,
            type: this.type,
            energy: this.energy,
            maxEnergy: this.maxEnergy,
            task: this.task,
            backpack: this.backpack,
            memory: this.memory,
            taskData: this.taskData,
            homeLocation: this.homeLocation,
            age: this.age,
            individualRule: this.individualRule
        };
    }
    
    // Load from serialized data
    static deserialize(data) {
        const ant = new Ant(data.x, data.y, data.dir, data.type);
        ant.state = data.state || 0;
        ant.energy = data.energy || ant.maxEnergy;
        ant.maxEnergy = data.maxEnergy || ant.maxEnergy;
        ant.task = data.task || 'WANDERING';
        ant.backpack = data.backpack || null;
        ant.memory = data.memory || [];
        ant.taskData = data.taskData || {};
        ant.homeLocation = data.homeLocation || { x: data.x, y: data.y };
        ant.age = data.age || 0;
        ant.individualRule = data.individualRule || null;
        return ant;
    }
}

const canvas = document.getElementById('antCanvas');
const ctx = canvas.getContext('2d');

let width, height;
const cellSize = 1; // Logical size of each cell (we zoom the canvas, not change this)
let grid; // Now contains GridCell objects instead of simple integers
let ants = []; // Array to hold multiple ants
let gridCols = 0, gridRows = 0;
let intervalId = null;
let stepsPerTick; // Number of steps to run per interval tick
let isRunning = true; // Simulation starts running
let stepCounter = 0; // Track simulation steps

// Pheromone decay timer
let pheromoneDecayTimer = 0;
const pheromoneDecayInterval = 1000; // Decay every 1 second
const pheromoneDecayRate = 0.05; // Small decay rate per interval

// View transformation state
const initialScale = 8; // Define initial scale
let scale = initialScale; // Use constant for initial value
let offsetX = 0;
let offsetY = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let isDragging = false;

// Zoom constraints
const minScale = 0.1;
const maxScale = 50;
const zoomFactor = 1.1;

// Speed configuration (Simplified)
const slowModeThreshold = 1000 / 16; // ~62.5 FPS threshold (using 16ms as a reference)

const directions = [
    { dx: 0, dy: -1 }, // North
    { dx: 1, dy: 0 },  // East
    { dx: 0, dy: 1 },  // South
    { dx: -1, dy: 0 }  // West
];

let currentIntervalId = null;
let currentIntervalDelay = 0;
let currentStepsPerTick = 1;
let timeoutId = null; // ID for setTimeout loop (replaced animationFrameId)

// --- Configuration ---
const minSimSpeed = 1;       // Min Steps/Sec at slider value 1
const midSimSpeed = 60;      // Steps/Sec at slider midpoint (50)
const maxSimSpeed = 100000;   // Max Target Steps/Sec at slider value 100 (Adjusted)
const maxStepsPerLoopIteration = 100000; // Safety limit

// Define neon cell colors (up to 12)
const cellColors = [
    '#000000', // 0: Black (Background)
    '#FFFFFF', // 1: White 
    '#FF00FF', // 2: Magenta/Fuchsia
    '#FFFF00', // 3: Yellow
    '#00FF00', // 4: Lime
    '#00FFFF', // 5: Cyan/Aqua
    '#FF0000', // 6: Red 
    '#FFA500', // 7: Orange
    '#0000FF', // 8: Blue
    '#FF69B4', // 9: Hot Pink
    '#DA70D6', // 10: Orchid
    '#8A2BE2'  // 11: BlueViolet
];
const maxPossibleColors = cellColors.length; // Should now be 12

// --- Turmite Rule Definition (Mutable) ---
let rules = {}; // Initialize as empty - will be set by rule builder

// --- State Storage ---
let simulationTimeoutId = null;   // ID for simulation setTimeout loop
let nextStepTime = 0;             // Target time for the next simulation step
let renderRequestId = null;       // ID for render requestAnimationFrame
let pauseTime = 0; // Added: Store time when paused
let cellsToUpdate = new Set(); // Combined set for all redraw locations
let needsFullRedraw = true; // Flag to trigger full grid redraw

// Listen for rule changes from the rule builder
document.addEventListener('rulesChanged', (event) => {
    rules = event.detail.rules;
    console.log('Rules updated from rule builder:', rules);
    
    // Reset simulation with new rules if it's currently running
    if (isRunning) {
        initSimulation(false, undefined, undefined, true);
    }
});

// --- Helper Functions for Enhanced Grid ---

// Get a cell safely with bounds checking
function getCell(x, y) {
    if (x < 0 || x >= gridCols || y < 0 || y >= gridRows || !grid[y] || !grid[y][x]) {
        return null;
    }
    return grid[y][x];
}

// Set a cell safely with bounds checking
function setCell(x, y, cell) {
    if (x >= 0 && x < gridCols && y >= 0 && y < gridRows && grid[y]) {
        grid[y][x] = cell;
        cellsToUpdate.add(`${x},${y}`);
    }
}

// Update pheromone decay across the grid
function updatePheromoneDecay() {
    for (let y = 0; y < gridRows; y++) {
        for (let x = 0; x < gridCols; x++) {
            const cell = getCell(x, y);
            if (cell) {
                const hadPheromones = cell.getPheromone('trail_A') > 0 || 
                                    cell.getPheromone('trail_B') > 0 || 
                                    cell.getPheromone('trail_C') > 0;
                
                cell.decayPheromones(pheromoneDecayRate);
                
                // Mark for update if pheromones changed significantly
                const hasPheromones = cell.getPheromone('trail_A') > 0 || 
                                    cell.getPheromone('trail_B') > 0 || 
                                    cell.getPheromone('trail_C') > 0;
                
                if (hadPheromones !== hasPheromones) {
                    cellsToUpdate.add(`${x},${y}`);
                }
            }
        }
    }
}

// --- Mapping Function ---
function mapSliderToSpeed(sliderValue) {
    const sliderMin = 1;
    const sliderMax = 100;
    const sliderMid = 50;

    if (sliderValue == sliderMid) {
        return midSimSpeed;
    } else if (sliderValue < sliderMid) {
        // Linear mapping for the lower half: [1, 50) -> [minSimSpeed, midSimSpeed)
        const speed = minSimSpeed + (sliderValue - sliderMin) * (midSimSpeed - minSimSpeed) / (sliderMid - sliderMin);
        return Math.max(minSimSpeed, speed);
    } else { // sliderValue > sliderMid
        // Exponential mapping for the upper half: (50, 100] -> (midSimSpeed, maxSimSpeed]
        const power = 3; // Adjust power for desired curve (e.g., 2, 3, 4)
        const normalizedInput = (sliderValue - sliderMid) / (sliderMax - sliderMid);
        const scaledOutput = Math.pow(normalizedInput, power);
        const speed = midSimSpeed + scaledOutput * (maxSimSpeed - midSimSpeed);
        return Math.min(maxSimSpeed, speed); // Clamp at max
    }
}

function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;

    setCanvasSmoothing(false);
    needsFullRedraw = true; // Flag for full redraw

    // Request a draw. If running, renderLoop will handle it.
    // If paused, this ensures the resized view is drawn.
    if (!renderRequestId && !isRunning) {
        requestAnimationFrame(draw);
    }
}

function setCanvasSmoothing(enabled) {
     if (!ctx) return; // Add check for context existence
     ctx.imageSmoothingEnabled = enabled;
     ctx.mozImageSmoothingEnabled = enabled;
     ctx.webkitImageSmoothingEnabled = enabled;
     ctx.msImageSmoothingEnabled = enabled;
}

function initGrid() {
    // Calculate grid size based on current viewport and CURRENT scale
    gridCols = Math.ceil(width / scale); // Use current scale
    gridRows = Math.ceil(height / scale); // Use current scale

    if (gridCols <= 0 || gridRows <= 0) { 
        console.warn("Cannot init grid with zero/negative dimensions, possibly invalid scale?", {width, height, scale});
        gridCols = 1; gridRows = 1; // Set minimum size to prevent errors down the line
    }
    
    // Initialize grid with GridCell objects instead of simple integers
    grid = Array(gridRows).fill(null).map(() => 
        Array(gridCols).fill(null).map(() => new GridCell())
    );
    
    console.log(`Initialized enhanced grid: ${gridCols}x${gridRows} with GridCell objects using scale ${scale}`);
}

// Helper function to generate rules for a single ant
function generateRandomRulesForAnt(numStates, numColorsToUse) {
    const antSpecificRules = {};

    let moveOptions = ['S', 'L', 'R', 'N', 'U']; // Basic moves

    for (let s = 0; s < numStates; s++) {
        antSpecificRules[s] = [];
        for (let c = 0; c < numColorsToUse; c++) {
            const writeColor = Math.floor(Math.random() * numColorsToUse);
            const moveIndex = Math.floor(Math.random() * moveOptions.length);
            const move = moveOptions[moveIndex];
            const nextState = Math.floor(Math.random() * numStates);
            antSpecificRules[s].push({ writeColor, move, nextState });
        }
    }
    return antSpecificRules;
}

function initAnts(preservedIndividualRules = null) {
    ants = [];
    cellsToUpdate.clear();
    if (gridCols <= 0 || gridRows <= 0) { return; }

    // Get controls needed for ant setup
    const antCountInput = document.getElementById('antCount');
    const startPositionSelect = document.getElementById('startPosition');
    const startDirectionSelect = document.getElementById('startDirection');
    const individualRulesCheck = document.getElementById('individualRules');

    const startMode = startPositionSelect ? startPositionSelect.value : 'center';
    const startDirMode = startDirectionSelect ? startDirectionSelect.value : 'east';
    const numAntsToCreate = antCountInput ? parseInt(antCountInput.value, 10) : 1;
    const validatedAntCount = Math.max(1, Math.min(100, numAntsToCreate || 1));
    const useIndividualRules = individualRulesCheck ? individualRulesCheck.checked && validatedAntCount > 1 : false;

    // Read max states/colors for potential individual rule generation
    const maxStatesInput = document.getElementById('maxStates');
    const maxColorsInput = document.getElementById('maxColors');
    const maxStates = maxStatesInput ? parseInt(maxStatesInput.value, 10) : 2;
    const maxColors = maxColorsInput ? parseInt(maxColorsInput.value, 10) : 2;
    const validatedMaxStates = Math.max(1, Math.min(10, maxStates || 1));
    const validatedMaxColors = Math.max(2, Math.min(maxPossibleColors, maxColors || 2));

    const centerX = Math.floor(gridCols / 2);
    const centerY = Math.floor(gridRows / 2);
    const occupied = new Set(); // To track occupied spots for random/grid modes

    console.log(`Initializing ${validatedAntCount} enhanced ants. Mode: ${startMode}, Dir: ${startDirMode}, Indiv Rules: ${useIndividualRules}, Preserved Rules: ${preservedIndividualRules ? preservedIndividualRules.length : 'None'}`);

    // Determine ant type distribution for colony
    const antTypes = [];
    const numWorkers = Math.floor(validatedAntCount * 0.7);  // 70% workers
    const numScouts = Math.floor(validatedAntCount * 0.2);   // 20% scouts
    const numSoldiers = Math.floor(validatedAntCount * 0.1); // 10% soldiers
    const numQueens = validatedAntCount > 10 ? 1 : 0;        // 1 queen if colony is large enough
    
    // Fill type array
    for (let i = 0; i < numWorkers; i++) antTypes.push('Worker');
    for (let i = 0; i < numScouts; i++) antTypes.push('Scout');
    for (let i = 0; i < numSoldiers; i++) antTypes.push('Soldier');
    for (let i = 0; i < numQueens; i++) antTypes.push('Queen');
    
    // Fill remaining with workers
    while (antTypes.length < validatedAntCount) {
        antTypes.push('Worker');
    }
    
    // Shuffle for random distribution
    for (let i = antTypes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [antTypes[i], antTypes[j]] = [antTypes[j], antTypes[i]];
    }

    for (let i = 0; i < validatedAntCount; i++) {
        let gridX, gridY;
        let attempts = 0;
        const MAX_ATTEMPTS = 2000;
        
        switch (startMode) {
            case 'random':
                do {
                    gridX = Math.floor(Math.random() * gridCols);
                    gridY = Math.floor(Math.random() * gridRows);
                    attempts++;
                } while (occupied.has(`${gridX},${gridY}`) && attempts < MAX_ATTEMPTS);
                if (attempts >= MAX_ATTEMPTS) {
                    console.warn("Could not find random unoccupied spot, placing potentially overlapping.");
                }
                break;

            case 'grid':
                // Basic grid logic: try to make it square-ish
                const gridRatio = gridCols / gridRows;
                let cols = Math.ceil(Math.sqrt(validatedAntCount * gridRatio));
                let rows = Math.ceil(validatedAntCount / cols);
                cols = Math.min(cols, gridCols);
                rows = Math.min(rows, gridRows);
                if (cols * rows < validatedAntCount) {
                    rows = Math.ceil(validatedAntCount / cols);
                    if (cols * rows < validatedAntCount) {
                         cols = Math.ceil(validatedAntCount / rows);
                    }
                }

                const spacingX = gridCols / (cols + 1);
                const spacingY = gridRows / (rows + 1);

                const colIndex = i % cols;
                const rowIndex = Math.floor(i / cols);

                gridX = Math.floor(spacingX * (colIndex + 1));
                gridY = Math.floor(spacingY * (rowIndex + 1));

                gridX = Math.max(0, Math.min(gridCols - 1, gridX));
                gridY = Math.max(0, Math.min(gridRows - 1, gridY));

                let originalGridX = gridX;
                let originalGridY = gridY;
                while(occupied.has(`${gridX},${gridY}`) && attempts < 100) {
                    gridX = (originalGridX + attempts) % gridCols;
                    gridY = originalGridY;
                    attempts++;
                }
                break;

            case 'center':
            default:
                const clusterSize = Math.ceil(Math.sqrt(validatedAntCount));
                const offset = Math.floor(clusterSize / 2);
                gridX = centerX - offset + (i % clusterSize);
                gridY = centerY - offset + Math.floor(i / clusterSize);
                gridX = Math.max(0, Math.min(gridCols - 1, gridX));
                gridY = Math.max(0, Math.min(gridRows - 1, gridY));
                break;
        }

        // Ensure within bounds AFTER calculating specific position
        gridX = Math.max(0, Math.min(gridCols - 1, gridX || 0));
        gridY = Math.max(0, Math.min(gridRows - 1, gridY || 0));

        occupied.add(`${gridX},${gridY}`);

        let individualRule = null;
        if (useIndividualRules) {
            if (preservedIndividualRules && i < preservedIndividualRules.length && preservedIndividualRules[i]) {
                individualRule = preservedIndividualRules[i];
            } else {
                const antStates = Math.floor(Math.random() * validatedMaxStates) + 1;
                const antColors = Math.floor(Math.random() * (validatedMaxColors - 1)) + 2;
                individualRule = generateRandomRulesForAnt(antStates, antColors);
            }
        }

        // Determine initial direction
        let initialDir = 1; // Default East
        switch(startDirMode) {
            case 'north': initialDir = 0; break;
            case 'east': initialDir = 1; break;
            case 'south': initialDir = 2; break;
            case 'west': initialDir = 3; break;
            case 'random': initialDir = Math.floor(Math.random() * 4); break;
        }

        // Create enhanced ant with proper type
        const antType = antTypes[i] || 'Worker';
        const newAnt = new Ant(gridX, gridY, initialDir, antType);
        newAnt.individualRule = individualRule;
        
        ants.push(newAnt);
        cellsToUpdate.add(`${gridX},${gridY}`);
    }
    
    // Update ant counter in UI
    updateCounters();
    
    console.log(`Created colony: ${antTypes.filter(t => t === 'Worker').length} Workers, ${antTypes.filter(t => t === 'Scout').length} Scouts, ${antTypes.filter(t => t === 'Soldier').length} Soldiers, ${antTypes.filter(t => t === 'Queen').length} Queens`);
}

function resetCamera() {
    console.log("Resetting camera view to center initial grid...");
    scale = initialScale; // Reset scale

    // Calculate hypothetical grid dimensions based on initial scale
    const tempGridCols = Math.ceil(width / scale); 
    const tempGridRows = Math.ceil(height / scale);

    // Calculate the center of this hypothetical grid (in logical coordinates)
    const tempGridCenterX = tempGridCols / 2 * cellSize;
    const tempGridCenterY = tempGridRows / 2 * cellSize;

    // Calculate offset needed to place the grid center (scaled) at the viewport center
    offsetX = width / 2 - tempGridCenterX * scale;
    offsetY = height / 2 - tempGridCenterY * scale;

    console.log(`Reset Camera: Scale=${scale}, OffsetX=${offsetX.toFixed(1)}, OffsetY=${offsetY.toFixed(1)} based on grid ${tempGridCols}x${tempGridRows}`);

    setCanvasSmoothing(false);
    cellsToUpdate.clear();
    needsFullRedraw = true; // Trigger full redraw
}

function initSimulation(randomize = false, numStates = 1, numColorsToUse = 2, wasRunning = true) {
    console.log(`initSimulation called. Randomize: ${randomize}, States: ${numStates}, Colors: ${numColorsToUse}, WasRunning: ${wasRunning}`);
    
    // Stop loops regardless of previous state to ensure clean reset
    stopSimulationLoop();
    stopRenderLoop();

    const individualRulesCheck = document.getElementById('individualRules');
    const useIndividual = individualRulesCheck ? individualRulesCheck.checked : false;
    const antCountInput = document.getElementById('antCount');
    const antCount = antCountInput ? parseInt(antCountInput.value, 10) : 1;

    // Preserve individual rules if resetting without randomizing
    let preservedIndividualRules = null;
    if (!randomize && useIndividual && antCount > 0 && ants.length > 0) {
        preservedIndividualRules = ants.map(ant => ant?.individualRule).filter(rule => rule);
        console.log(`Preserving ${preservedIndividualRules.length} individual rules.`);
    }

    // Only generate random rules if specifically requested or no rules exist
    if (randomize && window.ruleBuilder) {
        window.ruleBuilder.generateRandomRules();
        return; // Rule builder will trigger re-init via rulesChanged event
    } else if (Object.keys(rules).length === 0) {
        // Load default Langton's Ant rules if no rules exist
        console.log("Loading default Langton's Ant rules.");
        rules = {
             0: [
                 { writeColor: 1, move: 'R', nextState: 0 },
                 { writeColor: 0, move: 'L', nextState: 0 }
             ]
         };
     }

    // Reset dimensions, grid, ants
    width = window.innerWidth; 
    height = window.innerHeight;
    if (!canvas) { 
        console.error("Canvas missing!"); 
        return; 
    }
    canvas.width = width; 
    canvas.height = height;

    // Grid Reset Logic
    const originalScale = scale;
    scale = initialScale;
    console.log(`Temporarily setting scale to ${initialScale} for grid init.`);
    initGrid();
    initAnts(preservedIndividualRules);
    scale = originalScale;
    console.log(`Restored scale to ${scale}.`);

    // Update speed slider
    const speedSlider = document.getElementById('speedSlider');
    const speedValueSpan = document.getElementById('speedValue');
    if (speedSlider && speedValueSpan) {
        const initialSliderValue = parseInt(speedSlider.value, 10);
        const initialSimSpeed = mapSliderToSpeed(initialSliderValue);
        speedValueSpan.textContent = Math.round(initialSimSpeed);
    }

    setCanvasSmoothing(false);
    cellsToUpdate.clear();
    needsFullRedraw = true;

    // Draw initial state
    drawGrid();

    isRunning = wasRunning;
    updateButtonText();
    pauseTime = 0;
    stepCounter = 0;

    // Update UI controls
    if (individualRulesCheck) {
        individualRulesCheck.disabled = (antCount <= 1);
        if (antCount <= 1 && individualRulesCheck.checked) {
            individualRulesCheck.checked = false;
        }
    }

    if (isRunning) {
        startSimulationLoop();
        startRenderLoop();
    } 

    updateCounters();
}

function updateButtonText() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    const timelinePlayPauseBtn = document.getElementById('timelinePlayPauseBtn');
    
    if (playPauseBtn) {
        const icon = playPauseBtn.querySelector('i');
        if (icon) {
            icon.className = isRunning ? 'fas fa-pause' : 'fas fa-play';
        }
        playPauseBtn.classList.toggle('playing', isRunning);
    }
    
    if (timelinePlayPauseBtn) {
        const icon = timelinePlayPauseBtn.querySelector('i');
        if (icon) {
            icon.className = isRunning ? 'fas fa-pause' : 'fas fa-play';
        }
        timelinePlayPauseBtn.classList.toggle('playing', isRunning);
    }
}

function updateCounters() {
    const stepCounterSpan = document.getElementById('stepCounter');
    const antCounterSpan = document.getElementById('antCounter');
    
    if (stepCounterSpan) {
        stepCounterSpan.textContent = stepCounter;
    }
    
    if (antCounterSpan) {
        antCounterSpan.textContent = ants.length;
    }
}

// Enhanced ant step logic with energy, food, and task management
function stepSingleAntLogic(ant) {
    if (!grid || !ant) return; // Check individual ant
    if (ant.state === -1) return; // HALT state: do nothing further
    if (gridCols <= 0 || gridRows <= 0) return;

    // Age the ant (consumes energy and updates internal state)
    ant.ageOneStep();
    
    // Check if ant died from energy depletion
    if (ant.isDead()) {
        // Mark ant for removal (will be handled in main loop)
        ant.state = -2; // Death state
        return;
    }

    ant.x = (ant.x + gridCols) % gridCols;
    ant.y = (ant.y + gridRows) % gridRows;

    if (!grid[ant.y] || ant.y < 0 || ant.y >= grid.length || ant.x < 0 || ant.x >= grid[ant.y].length) {
         console.error("Ant out of bounds after wrap:", ant);
         return;
     }

    const currentCellX = ant.x;
    const currentCellY = ant.y;
    const currentCell = getCell(currentCellX, currentCellY);
    
    if (!currentCell) {
        console.error("Invalid cell at ant position:", ant.x, ant.y);
        return;
    }
    
    // Enhanced environmental interactions
    processAntEnvironmentInteraction(ant, currentCell);
    
    // Get current cell color for rule lookup
    const currentCellColor = currentCell.getColor();
    const currentState = ant.state;

    // Check if cell is passable (obstacles block movement)
    if (!currentCell.isPassable()) {
        // Ant hits an obstacle - could bounce back or change direction
        ant.dir = (ant.dir + 2) % 4; // U-turn when hitting obstacle
        ant.addMemory({
            type: 'OBSTACLE_HIT',
            location: { x: currentCellX, y: currentCellY }
        });
        return;
    }

    const ruleSetToUse = ant.individualRule || rules;
    let rule;
    try { 
        if (ruleSetToUse[currentState] && ruleSetToUse[currentState][currentCellColor]) {
             rule = ruleSetToUse[currentState][currentCellColor];
        } else { 
             if (ruleSetToUse[currentState] && ruleSetToUse[currentState][0]) {
                 rule = ruleSetToUse[currentState][0];
             } else {
                rule = { writeColor: currentCellColor, move: 'N', nextState: 0 };
             }
        }
    } catch (e) { 
        console.error("Error in stepSingleAntLogic:", e);
        return; 
    }
    
    // Record change only if color is different
    if (rule.writeColor !== currentCellColor) {
        currentCell.setColor(rule.writeColor);
        cellsToUpdate.add(`${currentCellX},${currentCellY}`); 
    }
    
    // Enhanced ant behaviors: leave pheromone trail based on task and type
    leavePheromoneTail(ant, currentCell);

    let dx = 0, dy = 0;
    // Determine Direction Change
    switch (rule.move) {
        // Relative moves
        case 'R': ant.dir = (ant.dir + 1) % 4; break;
        case 'L': ant.dir = (ant.dir - 1 + 4) % 4; break;
        case 'U': ant.dir = (ant.dir + 2) % 4; break;
        case 'S': break; // Stay - no direction change
        case 'N': break; // None - no direction change
        // Absolute moves
        case '^': ant.dir = 0; break; // North
        case '>': ant.dir = 1; break; // East
        case 'v': ant.dir = 2; break; // South
        case '<': ant.dir = 3; break; // West
        case '?': // Random absolute direction
            ant.dir = Math.floor(Math.random() * 4);
            break;
        default: break; // Treat any other unknown character like 'N'
    }
    
    // Determine Movement Delta (only if not 'S')
    if (rule.move !== 'S') {
        const moveOffset = directions[ant.dir];
        if (moveOffset) { 
            dx = moveOffset.dx;
            dy = moveOffset.dy;
        } else {
             console.error(`Invalid ant direction: ${ant.dir}`);
        }
    }
    
    // Update state
    ant.state = rule.nextState;
    
    // Apply movement
    ant.x += dx;
    ant.y += dy;
    
    // Add movement to memory
    ant.addMemory({
        type: 'MOVEMENT',
        from: { x: currentCellX, y: currentCellY },
        to: { x: ant.x, y: ant.y },
        direction: ant.dir
    });
}

// Handle ant interactions with the environment
function processAntEnvironmentInteraction(ant, cell) {
    // Food interaction
    if (cell.food > 0 && ant.carryCapacity > 0) {
        if (ant.task === 'SEEKING_FOOD' || (ant.task === 'WANDERING' && ant.stepsWithoutFood > 50)) {
            const foodAvailable = cell.food;
            const pickedUp = ant.pickUpItem('food', Math.min(foodAvailable, ant.carryCapacity));
            
            if (pickedUp > 0) {
                cell.food -= pickedUp;
                ant.stepsWithoutFood = 0;
                ant.gainEnergy(pickedUp * 2); // Food restores energy
                ant.lastFoodLocation = { x: ant.x, y: ant.y };
                
                // Change task to returning home if carrying food
                if (ant.backpack && ant.backpack.amount >= ant.carryCapacity * 0.8) {
                    ant.setTask('RETURNING_HOME');
                }
                
                ant.addMemory({
                    type: 'FOOD_FOUND',
                    location: { x: ant.x, y: ant.y },
                    amount: pickedUp
                });
                
                cellsToUpdate.add(`${ant.x},${ant.y}`);
            }
        }
    }
    
    // Home behavior - drop food when at home
    if (ant.isAtHome() && ant.backpack && ant.backpack.type === 'food') {
        const dropped = ant.dropItem();
        if (dropped) {
            cell.addFood(dropped.amount);
            ant.gainEnergy(dropped.amount); // Bonus energy for successful foraging
            ant.setTask('WANDERING'); // Look for more food
            
            ant.addMemory({
                type: 'FOOD_DELIVERED',
                location: { x: ant.x, y: ant.y },
                amount: dropped.amount
            });
            
            cellsToUpdate.add(`${ant.x},${ant.y}`);
        }
    }
    
    // Charge interaction (affects energy)
    if (cell.charge !== 0) {
        if (cell.charge > 0) {
            ant.gainEnergy(1); // Positive charge gives energy
        } else {
            ant.consumeEnergy(1); // Negative charge drains energy
        }
    }
    
    // Task-specific behaviors
    updateAntTask(ant, cell);
}

// Update ant task based on current situation
function updateAntTask(ant, cell) {
    // Basic task management logic
    switch (ant.task) {
        case 'WANDERING':
            // Look for food if hungry or if it's the ant's job
            if ((ant.stepsWithoutFood > 30 && ant.type === 'Worker') || 
                (ant.energy < ant.maxEnergy * 0.5 && ant.carryCapacity > 0)) {
                ant.setTask('SEEKING_FOOD');
            }
            // Scouts naturally explore
            else if (ant.type === 'Scout' && Math.random() < 0.1) {
                ant.setTask('EXPLORING');
            }
            break;
            
        case 'SEEKING_FOOD':
            // Return home if carrying enough food
            if (ant.backpack && ant.backpack.amount >= ant.carryCapacity * 0.8) {
                ant.setTask('RETURNING_HOME');
            }
            // Give up after too long and return to wandering
            else if (ant.stepsWithoutFood > 200) {
                ant.setTask('WANDERING');
            }
            break;
            
        case 'RETURNING_HOME':
            // Switch to wandering if at home or if dropped food
            if (ant.isAtHome() || !ant.backpack) {
                ant.setTask('WANDERING');
            }
            break;
            
        case 'EXPLORING':
            // Scouts return home after exploring too far
            if (ant.type === 'Scout' && ant.getDistanceToHome() > ant.explorationRadius) {
                ant.setTask('RETURNING_HOME');
            }
            break;
            
        case 'RESTING':
            // Rest until energy is restored
            if (ant.energy >= ant.maxEnergy * 0.9) {
                ant.setTask('WANDERING');
            }
            break;
    }
    
    // Emergency energy conservation
    if (ant.energy < ant.maxEnergy * 0.2 && ant.task !== 'RESTING') {
        ant.setTask('RESTING');
    }
}

// Leave appropriate pheromone trail based on ant type and task
function leavePheromoneTail(ant, cell) {
    switch (ant.task) {
        case 'SEEKING_FOOD':
            // Leave exploration trail
            cell.addPheromone('trail_B', 0.5);
            break;
            
        case 'RETURNING_HOME':
            // Leave food trail if carrying food
            if (ant.backpack && ant.backpack.type === 'food') {
                cell.addPheromone('trail_A', 1.0);
            }
            break;
            
        case 'EXPLORING':
            // Scouts leave exploration trail
            cell.addPheromone('trail_B', 1.0);
            break;
            
        case 'PATROLLING':
            // Soldiers leave territory trail
            cell.addPheromone('trail_C', 0.8);
            break;
    }
    
    // All ants leave a basic presence trail
    cell.addPheromone('trail_C', 0.1);
}

// Helper to draw ant shape
function drawAntShape(ant) {
     // Check if ant is within logical grid bounds
     if (ant.x < 0 || ant.x >= gridCols || ant.y < 0 || ant.y >= gridRows) return;

     // Calculate pixel positions
     const cellSize = 1;
     const antCenterX = offsetX + (ant.x + 0.5) * cellSize * scale;
     const antCenterY = offsetY + (ant.y + 0.5) * cellSize * scale;
     const antSize = (cellSize * scale) * 0.8; 
     const antRadius = antSize / 2.5; 

     // Visibility check
     if (!(antCenterX + antSize > 0 && antCenterX - antSize < width &&
           antCenterY + antSize > 0 && antCenterY - antSize < height)) {
         return;
     }

     // Color ants based on type for visual distinction
     let antColor = 'red'; // Default
     if (ant.type === 'Worker') antColor = '#ff6b6b';
     else if (ant.type === 'Scout') antColor = '#4ecdc4';
     else if (ant.type === 'Soldier') antColor = '#45b7d1';
     else if (ant.type === 'Queen') antColor = '#f9ca24';
     
     ctx.fillStyle = antColor;
     ctx.beginPath();

     // Always draw a circle 
     ctx.arc(antCenterX, antCenterY, antRadius, 0, 2 * Math.PI);
     
     ctx.fill();
     
     // Draw direction indicator for larger ants
     if (antRadius > 3) {
         ctx.strokeStyle = 'white';
         ctx.lineWidth = 1;
         const dirX = Math.cos((ant.dir * 90 - 90) * Math.PI / 180) * antRadius * 0.6;
         const dirY = Math.sin((ant.dir * 90 - 90) * Math.PI / 180) * antRadius * 0.6;
         ctx.beginPath();
         ctx.moveTo(antCenterX, antCenterY);
         ctx.lineTo(antCenterX + dirX, antCenterY + dirY);
         ctx.stroke();
     }
 }

function drawGrid() {
    if (!grid || !grid.length || !grid[0].length || !ctx) return;
    setCanvasSmoothing(false);

    if (gridCols <= 0 || gridRows <= 0) { return; }

    // Calculate visible grid bounds (in grid cell coordinates)
    const viewX1 = -offsetX / scale, viewY1 = -offsetY / scale;
    const viewX2 = (width - offsetX) / scale, viewY2 = (height - offsetY) / scale;
    const cellSize = 1;
    const buffer = 2;
    const startCol = Math.max(0, Math.floor(viewX1 / cellSize) - buffer);
    const endCol = Math.min(gridCols, Math.ceil(viewX2 / cellSize) + buffer);
    const startRow = Math.max(0, Math.floor(viewY1 / cellSize) - buffer);
    const endRow = Math.min(gridRows, Math.ceil(viewY2 / cellSize) + buffer);

    // Draw ALL cells using calculated pixel coordinates
    for (let y = startRow; y < endRow; y++) {
        if (y < 0 || y >= grid.length || !grid[y]) continue;
        for (let x = startCol; x < endCol; x++) {
             if (x < 0 || x >= grid[y].length) continue;

            const cell = getCell(x, y);
            if (!cell) continue;
            
            const colorIndex = cell.getColor();
            
            // Enhanced rendering: show multiple properties layered
            if (colorIndex >= 0 && colorIndex < cellColors.length) {
                 const px = Math.floor(offsetX + x * cellSize * scale);
                 const py = Math.floor(offsetY + y * cellSize * scale);
                 const pw = Math.ceil(cellSize * scale);
                 const ph = Math.ceil(cellSize * scale);

                 if (px + pw > 0 && px < width && py + ph > 0 && py < height) {
                    // Draw base color
                    ctx.fillStyle = cellColors[colorIndex];
                    ctx.fillRect(px, py, pw, ph);
                    
                    // Draw food overlay (yellow tint)
                    if (cell.food > 0) {
                        ctx.fillStyle = `rgba(255, 255, 0, ${Math.min(cell.food / 100 * 0.3, 0.3)})`;
                        ctx.fillRect(px, py, pw, ph);
                    }
                    
                    // Draw pheromone trails (different colors for different trails)
                    const trailA = cell.getPheromone('trail_A');
                    const trailB = cell.getPheromone('trail_B');
                    const trailC = cell.getPheromone('trail_C');
                    
                    if (trailA > 0) {
                        ctx.fillStyle = `rgba(0, 255, 0, ${Math.min(trailA / 100 * 0.2, 0.2)})`;
                        ctx.fillRect(px, py, pw, ph);
                    }
                    if (trailB > 0) {
                        ctx.fillStyle = `rgba(255, 0, 0, ${Math.min(trailB / 100 * 0.2, 0.2)})`;
                        ctx.fillRect(px, py, pw, ph);
                    }
                    if (trailC > 0) {
                        ctx.fillStyle = `rgba(0, 0, 255, ${Math.min(trailC / 100 * 0.2, 0.2)})`;
                        ctx.fillRect(px, py, pw, ph);
                    }
                    
                    // Draw charge indicator (small corner indicators)
                    if (cell.charge !== 0 && pw > 4 && ph > 4) {
                        const chargeColor = cell.charge > 0 ? '#00ff00' : '#ff0000';
                        ctx.fillStyle = chargeColor;
                        ctx.fillRect(px + pw - 3, py, 3, 3);
                    }
                    
                    // Draw obstacle overlay (crosshatch pattern)
                    if (cell.obstacle && pw > 2 && ph > 2) {
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(px, py);
                        ctx.lineTo(px + pw, py + ph);
                        ctx.moveTo(px + pw, py);
                        ctx.lineTo(px, py + ph);
                        ctx.stroke();
                    }
                 }
            }
        }
    }

    // Draw Ants (Enable Smoothing)
    setCanvasSmoothing(true);
    for (let i = 0; i < ants.length; i++) {
        if (ants[i]) drawAntShape(ants[i]);
    }
    setCanvasSmoothing(false);
}

// Function to draw updates efficiently
function drawUpdates() {
    if (!ctx) return;
    setCanvasSmoothing(false);
    const cellSize = 1;

    // Draw all cells marked for update
    cellsToUpdate.forEach(coordString => {
        const [xStr, yStr] = coordString.split(',');
        const x = parseInt(xStr, 10);
        const y = parseInt(yStr, 10);

        if (isNaN(x) || isNaN(y) || y < 0 || y >= grid.length || x < 0 || x >= grid[y].length) return;

        const cell = getCell(x, y);
        if (!cell) return;
        
        const colorIndex = cell.getColor();
        
        if (colorIndex >= 0 && colorIndex < cellColors.length) {
             const px = Math.floor(offsetX + x * cellSize * scale);
             const py = Math.floor(offsetY + y * cellSize * scale);
             const pw = Math.ceil(cellSize * scale);
             const ph = Math.ceil(cellSize * scale);
             
             if (px + pw > 0 && px < width && py + ph > 0 && py < height) {
                 // Draw base color
                 ctx.fillStyle = cellColors[colorIndex];
                 ctx.fillRect(px, py, pw, ph);
                 
                 // Draw enhanced overlays (same as in drawGrid)
                 if (cell.food > 0) {
                     ctx.fillStyle = `rgba(255, 255, 0, ${Math.min(cell.food / 100 * 0.3, 0.3)})`;
                     ctx.fillRect(px, py, pw, ph);
                 }
                 
                 const trailA = cell.getPheromone('trail_A');
                 const trailB = cell.getPheromone('trail_B');
                 const trailC = cell.getPheromone('trail_C');
                 
                 if (trailA > 0) {
                     ctx.fillStyle = `rgba(0, 255, 0, ${Math.min(trailA / 100 * 0.2, 0.2)})`;
                     ctx.fillRect(px, py, pw, ph);
                 }
                 if (trailB > 0) {
                     ctx.fillStyle = `rgba(255, 0, 0, ${Math.min(trailB / 100 * 0.2, 0.2)})`;
                     ctx.fillRect(px, py, pw, ph);
                 }
                 if (trailC > 0) {
                     ctx.fillStyle = `rgba(0, 0, 255, ${Math.min(trailC / 100 * 0.2, 0.2)})`;
                     ctx.fillRect(px, py, pw, ph);
                 }
                 
                 if (cell.charge !== 0 && pw > 4 && ph > 4) {
                     const chargeColor = cell.charge > 0 ? '#00ff00' : '#ff0000';
                     ctx.fillStyle = chargeColor;
                     ctx.fillRect(px + pw - 3, py, 3, 3);
                 }
                 
                 if (cell.obstacle && pw > 2 && ph > 2) {
                     ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                     ctx.lineWidth = 1;
                     ctx.beginPath();
                     ctx.moveTo(px, py);
                     ctx.lineTo(px + pw, py + ph);
                     ctx.moveTo(px + pw, py);
                     ctx.lineTo(px, py + ph);
                     ctx.stroke();
                 }
             }
        }
    });

    // Draw Ants in their NEW positions (Enable Smoothing)
    setCanvasSmoothing(true);
    for (let i = 0; i < ants.length; i++) {
        if (ants[i]) drawAntShape(ants[i]);
    }
    setCanvasSmoothing(false);

    // Clear the update set for the next frame
    cellsToUpdate.clear();
}

// Main draw function
function draw() {
    if (!ctx) return;

    if (needsFullRedraw) {
        // Clear background (important for full redraw)
        ctx.fillStyle = '#2d2d2d'; // Match CSS background
        ctx.fillRect(0, 0, width, height);
        drawGrid(); // Draw the entire grid
        needsFullRedraw = false; // Reset flag after drawing
    } else {
        drawUpdates(); // Draw only changes
    }
}

function handleZoom(event) {
    event.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Convert mouse screen coords to world coords (logical grid coords)
    const worldX = (mouseX - offsetX) / scale;
    const worldY = (mouseY - offsetY) / scale;

    let newScale;
    if (event.deltaY < 0) {
        // Zoom in
        newScale = Math.min(maxScale, scale * zoomFactor);
    } else {
        // Zoom out
        newScale = Math.max(minScale, scale / zoomFactor);
    }

    // Adjust offset to keep the world point under the mouse stationary
    offsetX = mouseX - worldX * newScale;
    offsetY = mouseY - worldY * newScale;
    scale = newScale;

    setCanvasSmoothing(false);
    needsFullRedraw = true; // View changed, need full redraw
    // Request animation frame, draw() will handle the rest
    if (!renderRequestId && !isRunning) requestAnimationFrame(draw);
}

function handleMouseDown(event) {
    isDragging = true;
    const rect = canvas.getBoundingClientRect();
    lastMouseX = event.clientX - rect.left;
    lastMouseY = event.clientY - rect.top;
    canvas.style.cursor = 'grabbing';
}

function handleMouseUp(event) {
    if (isDragging) {
        isDragging = false;
        canvas.style.cursor = 'grab';
    }
}

function handleMouseMove(event) {
    if (!isDragging) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    offsetX += mouseX - lastMouseX;
    offsetY += mouseY - lastMouseY;

    lastMouseX = mouseX;
    lastMouseY = mouseY;

    needsFullRedraw = true; // View changed, need full redraw
    // Request animation frame, draw() will handle the rest
    if (!renderRequestId && !isRunning) requestAnimationFrame(draw);
}

function handleMouseLeave(event) {
     if (isDragging) {
        isDragging = false; // Stop dragging if mouse leaves canvas
        canvas.style.cursor = 'grab';
    }
}

// Global Hotkey Listener
window.addEventListener('keydown', (event) => {
    // Ignore keys if user is focused on inputs
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT' || event.target.tagName === 'TEXTAREA') {
        return;
    }

    // Check for Space bar (Start/Stop)
    if (event.code === 'Space') {
        event.preventDefault(); // Prevent default space bar scroll
        const btn = document.getElementById('playPauseBtn');
        if (btn) btn.click(); // Simulate click
    }
    // Check for 'F' key (Randomize)
    else if (event.key === 'f' || event.key === 'F') {
        const btn = document.getElementById('randomizeRulesBtn');
        if (btn) btn.click(); // Simulate click
    }
    // Check for 'R' key (Reset)
    else if (event.key === 'r' || event.key === 'R') {
        const btn = document.getElementById('resetSimulationBtn');
        if (btn) btn.click(); // Simulate click
    }
});

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired.");
    if (!ctx) { 
        console.error("Canvas context not found on DOMContentLoaded!"); 
        return; 
    }

    // Get new UI elements
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const stepBtn = document.getElementById('stepBtn');
    const resetSimulationBtn = document.getElementById('resetSimulationBtn');
    const resetViewBtn = document.getElementById('resetViewBtn');
    const clearGridBtn = document.getElementById('clearGridBtn');
    const antCountInput = document.getElementById('antCount');
    const startPositionSelect = document.getElementById('startPosition');
    const startDirectionSelect = document.getElementById('startDirection');
    const individualRulesCheck = document.getElementById('individualRules');
    const maxStatesInput = document.getElementById('maxStates');
    const maxColorsInput = document.getElementById('maxColors');
    
    // Timeline controls
    const timelinePlayPauseBtn = document.getElementById('timelinePlayPauseBtn');
    const timelineResetBtn = document.getElementById('timelineResetBtn');
    const timelineStepForwardBtn = document.getElementById('timelineStepForwardBtn');
    const timelineStepBackBtn = document.getElementById('timelineStepBackBtn');
    const timelineSpeedSlider = document.getElementById('timelineSpeedSlider');
    const timelineSpeedValue = document.getElementById('timelineSpeedValue');

    console.log("Setting up event listeners for new UI...");

    // Play/Pause button (main and timeline)
    [playPauseBtn, timelinePlayPauseBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                if (isRunning) {
                    console.log("Pause button clicked");
                    isRunning = false;
                    stopSimulationLoop();
                    stopRenderLoop();
                } else {
                    console.log("Start button clicked");
                    isRunning = true;
                    startSimulationLoop();
                    startRenderLoop();
                }
                updateButtonText();
            });
        }
    });

    // Step button
    if (stepBtn) {
        stepBtn.addEventListener('click', () => {
            if (!isRunning) {
                // Single step when paused
                for (let i = 0; i < ants.length; i++) {
                    const ant = ants[i];
                    if (!ant) continue;

                    const prevX = ant.x;
                    const prevY = ant.y;
                    cellsToUpdate.add(`${prevX},${prevY}`);

                    stepSingleAntLogic(ant);

                    cellsToUpdate.add(`${ant.x},${ant.y}`);
                }
                stepCounter++;
                updateCounters();
                requestAnimationFrame(draw);
            }
        });
    }

    // Reset simulation button
    if (resetSimulationBtn) {
        resetSimulationBtn.addEventListener('click', () => {
            const currentState = isRunning;
            stepCounter = 0;
            initSimulation(false, undefined, undefined, currentState);
        });
    }
    
    // Timeline reset button
    if (timelineResetBtn) {
        timelineResetBtn.addEventListener('click', () => {
            const currentState = isRunning;
            stepCounter = 0;
            initSimulation(false, undefined, undefined, currentState);
        });
    }

    // Reset view button
    if (resetViewBtn) {
        resetViewBtn.addEventListener('click', resetCamera);
    }

    // Clear grid button
    if (clearGridBtn) {
        clearGridBtn.addEventListener('click', () => {
            for (let y = 0; y < gridRows; y++) {
                for (let x = 0; x < gridCols; x++) {
                    const cell = getCell(x, y);
                    if (cell && cell.getColor() !== 0) {
                        cell.setColor(0);
                        // Also clear other properties
                        cell.food = 0;
                        cell.pheromones = { trail_A: 0, trail_B: 0, trail_C: 0 };
                        cell.charge = 0;
                        cell.obstacle = false;
                        cellsToUpdate.add(`${x},${y}`);
                    }
                }
            }
            needsFullRedraw = true;
            requestAnimationFrame(draw);
        });
    }

    // Speed slider (main)
    if (speedSlider && speedValue) {
        speedSlider.addEventListener('input', () => {
            const sliderValue = parseInt(speedSlider.value, 10);
            const newSpeed = mapSliderToSpeed(sliderValue);
            speedValue.textContent = Math.round(newSpeed);
        });
    }

    // Timeline speed slider
    if (timelineSpeedSlider && timelineSpeedValue) {
        timelineSpeedSlider.addEventListener('input', () => {
            const sliderValue = parseFloat(timelineSpeedSlider.value);
            timelineSpeedValue.textContent = `${sliderValue}x`;
            // Could implement speed multiplier here
        });
    }

    // Ant count input
    if (antCountInput) {
        antCountInput.addEventListener('input', () => {
            const currentVal = parseInt(antCountInput.value, 10);
            const minVal = parseInt(antCountInput.min, 10);
            const maxVal = parseInt(antCountInput.max, 10);
            if (!isNaN(currentVal)) {
                 if (currentVal < minVal) antCountInput.value = minVal;
                 else if (currentVal > maxVal) antCountInput.value = maxVal;
            }
            
            // Update individual rules checkbox state
            const currentCount = parseInt(antCountInput.value, 10) || 0;
            if (individualRulesCheck) {
                individualRulesCheck.disabled = (currentCount <= 1);
                if (currentCount <= 1 && individualRulesCheck.checked) {
                    individualRulesCheck.checked = false;
                }
            }
        });
    }

    // Collapsible sections
    document.querySelectorAll('.property-section.collapsible .section-header').forEach(header => {
        header.addEventListener('click', () => {
            const section = header.parentElement;
            const content = section.querySelector('.section-content');
            const icon = header.querySelector('i');
            
            if (content && icon) {
                content.classList.toggle('collapsed');
                header.classList.toggle('expanded');
            }
        });
    });

    // Pan and Zoom Listeners
    if (canvas) {
        canvas.addEventListener('wheel', handleZoom);
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseleave', handleMouseLeave);
        canvas.style.cursor = 'grab';
    } else {
        console.error("Canvas element not found for Pan/Zoom listeners!");
    }

    // Initialize simulation
    console.log("Initializing simulation...");
    initSimulation(false, undefined, undefined, true);
});

// Global listeners
window.addEventListener('resize', resizeCanvas);

// --- Enhanced Simulation Loop with Pheromone Decay and Ant Management ---
function simulationLoop() {
    if (!isRunning) {
        simulationTimeoutId = null; 
        return;
    }
    
    const now = performance.now();
    let totalStepsExecutedThisLoop = 0;
    const slider = document.getElementById('speedSlider');
    const targetSpeed = slider ? parseInt(slider.value, 10) : 50;
    const mappedSpeed = mapSliderToSpeed(targetSpeed);
    const stepDuration = (mappedSpeed > 0) ? 1000 / mappedSpeed : Infinity;

    // Update pheromone decay periodically
    pheromoneDecayTimer += (now - (simulationTimeoutId ? nextStepTime - stepDuration : now));
    if (pheromoneDecayTimer >= pheromoneDecayInterval) {
        updatePheromoneDecay();
        pheromoneDecayTimer = 0;
    }

    // Occasionally add food to the environment for sustainability
    if (stepCounter % 500 === 0) { // Every 500 steps
        addRandomFoodSources();
    }

    // Determine how many full simulation ticks should have passed
    while (now >= nextStepTime && totalStepsExecutedThisLoop < maxStepsPerLoopIteration) {
        // Array to collect dead ants for removal
        const deadAnts = [];
        
        for (let i = 0; i < ants.length; i++) {
            const ant = ants[i];
            if (!ant) continue;

            // Record current location before stepping
            const prevX = ant.x;
            const prevY = ant.y;
            cellsToUpdate.add(`${prevX},${prevY}`);

            // Execute step for this ant
            stepSingleAntLogic(ant);
            
            // Check if ant died during this step
            if (ant.state === -2) { // Death state
                deadAnts.push(i);
                console.log(`Ant ${i} (${ant.type}) died at age ${ant.age} from energy depletion`);
                continue;
            }

            // Record new location after stepping
            cellsToUpdate.add(`${ant.x},${ant.y}`);
        }
        
        // Remove dead ants (iterate backwards to maintain indices)
        for (let i = deadAnts.length - 1; i >= 0; i--) {
            const deadIndex = deadAnts[i];
            ants.splice(deadIndex, 1);
        }

        stepCounter++;
        nextStepTime += stepDuration;
        totalStepsExecutedThisLoop += ants.length;
        if (stepDuration <= 0 || !isFinite(stepDuration)) { 
            break; 
        }
    }

    if (totalStepsExecutedThisLoop >= maxStepsPerLoopIteration) {
        // Reset nextStepTime based on current time to avoid huge future jumps
        nextStepTime = performance.now() + stepDuration;
    }

    // Update counters
    updateCounters();

    const timeToNext = Math.max(0, nextStepTime - performance.now());
    simulationTimeoutId = setTimeout(simulationLoop, timeToNext);
}

// Add random food sources to keep the simulation sustainable
function addRandomFoodSources() {
    const numFoodSources = Math.floor(Math.random() * 3) + 1; // 1-3 food sources
    
    for (let i = 0; i < numFoodSources; i++) {
        const x = Math.floor(Math.random() * gridCols);
        const y = Math.floor(Math.random() * gridRows);
        const cell = getCell(x, y);
        
        if (cell && cell.food < 20) { // Don't overfill cells that already have food
            const foodAmount = Math.floor(Math.random() * 20) + 10; // 10-30 food units
            cell.addFood(foodAmount);
            cellsToUpdate.add(`${x},${y}`);
            
            console.log(`Added ${foodAmount} food at (${x}, ${y})`);
        }
    }
}

function startSimulationLoop() {
    if (simulationTimeoutId) return; // Already running

    console.log(`Starting/Resuming Simulation Loop...`);

    // Adjust nextStepTime if resuming from pause
    if (pauseTime > 0) {
        const elapsedPausedTime = performance.now() - pauseTime;
        nextStepTime += elapsedPausedTime;
        console.log(`Resumed after ${elapsedPausedTime.toFixed(0)}ms pause. Adjusted nextStepTime to ${nextStepTime.toFixed(0)}`);
        pauseTime = 0;
    } else {
        nextStepTime = performance.now();
        console.log(`Starting fresh. Initial nextStepTime ${nextStepTime.toFixed(0)}`);
    }

    const timeToFirstCall = Math.max(0, nextStepTime - performance.now());
    simulationTimeoutId = setTimeout(simulationLoop, timeToFirstCall);
    console.log(`Scheduled first simulation check in ${timeToFirstCall.toFixed(0)}ms`);
}

function stopSimulationLoop() {
    if (simulationTimeoutId) {
        clearTimeout(simulationTimeoutId);
        simulationTimeoutId = null;
        pauseTime = performance.now();
        console.log("Simulation Loop stopped.");
    }
}

// --- Render Loop ---
function renderLoop() {
    if (!isRunning) {
        renderRequestId = null;
        return;
    }
    draw();
    renderRequestId = requestAnimationFrame(renderLoop);
}

function startRenderLoop() {
    if (renderRequestId) return;
    console.log("Starting Render Loop.");
    renderRequestId = requestAnimationFrame(renderLoop);
}

function stopRenderLoop() {
    if (renderRequestId) {
        cancelAnimationFrame(renderRequestId);
        renderRequestId = null;
        console.log("Render Loop stopped.");
    }
}

function calculateSimDelay(targetStepsPerSec) {
    if (targetStepsPerSec <= 0) return 10000; // Avoid division by zero, very slow
    // Calculate delay, clamp between 0 (for max speed) and a reasonable max
    const delay = 1000 / targetStepsPerSec;
    return Math.max(0, Math.min(10000, delay)); // Clamp delay (0ms to 10s)
}