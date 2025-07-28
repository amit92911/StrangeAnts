/**
 * Strange Ants Rule Builder System
 * Replaces JSON editor with user-friendly IF/THEN interface
 * Designed for accessibility and clarity for dyslexic users
 */

class RuleBuilder {
    constructor() {
        this.rules = {}; // Current rule set
        this.ruleListElement = document.getElementById('rulesList');
        this.presetSelect = document.getElementById('rulePreset');
        this.ruleCounter = 0;
        
        // Color options for the rule builder
        this.colorOptions = [
            { value: 0, name: 'Black (Empty)', color: '#000000' },
            { value: 1, name: 'White', color: '#FFFFFF' },
            { value: 2, name: 'Magenta', color: '#FF00FF' },
            { value: 3, name: 'Yellow', color: '#FFFF00' },
            { value: 4, name: 'Green', color: '#00FF00' },
            { value: 5, name: 'Cyan', color: '#00FFFF' },
            { value: 6, name: 'Red', color: '#FF0000' },
            { value: 7, name: 'Orange', color: '#FFA500' },
            { value: 8, name: 'Blue', color: '#0000FF' },
            { value: 9, name: 'Pink', color: '#FF69B4' },
            { value: 10, name: 'Purple', color: '#DA70D6' },
            { value: 11, name: 'Violet', color: '#8A2BE2' }
        ];
        
        // Movement options for the rule builder
        this.moveOptions = [
            { value: 'L', name: 'Turn Left ↺', description: 'Turn 90° counterclockwise' },
            { value: 'R', name: 'Turn Right ↻', description: 'Turn 90° clockwise' },
            { value: 'N', name: 'Move Forward →', description: 'Move forward without turning' },
            { value: 'U', name: 'U-Turn ↶', description: 'Turn around 180°' },
            { value: 'S', name: 'Stay Put ⏸', description: 'Stay in current position' },
            { value: '^', name: 'Face North ↑', description: 'Always face up' },
            { value: '>', name: 'Face East →', description: 'Always face right' },
            { value: 'v', name: 'Face South ↓', description: 'Always face down' },
            { value: '<', name: 'Face West ←', description: 'Always face left' },
            { value: '?', name: 'Random Direction 🎲', description: 'Pick random direction' }
        ];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadPreset('langtons'); // Load default preset
    }
    
    setupEventListeners() {
        // Preset selector
        if (this.presetSelect) {
            this.presetSelect.addEventListener('change', (e) => {
                this.loadPreset(e.target.value);
            });
        }
        
        // Add rule button
        const addRuleBtn = document.getElementById('addRuleBtn');
        if (addRuleBtn) {
            addRuleBtn.addEventListener('click', () => {
                this.addRule();
            });
        }
        
        // Randomize rules button
        const randomizeBtn = document.getElementById('randomizeRulesBtn');
        if (randomizeBtn) {
            randomizeBtn.addEventListener('click', () => {
                this.generateRandomRules();
            });
        }
    }
    
    /**
     * Toggles the visibility of rule action buttons based on preset
     */
    toggleRuleActions(isCustom) {
        const ruleActions = document.querySelector('.rule-actions');
        if (ruleActions) {
            ruleActions.style.display = isCustom ? 'flex' : 'none';
        }
    }
    
    /**
     * Load a preset rule set
     */
    loadPreset(presetName) {
        if (presetName === 'custom') {
            this.toggleRuleActions(true);
            return; // Keep current rules for custom
        }
        
        // Map preset names to actual preset data
        const presetMap = {
            'langtons': 'langtons',
            'symmetrical': 'symmetrical',
            'spiral': 'archimedesSpiral'
        };
        
        const actualPresetName = presetMap[presetName] || presetName;
        
        if (window.presetDefinitions && window.presetDefinitions[actualPresetName]) {
            this.rules = JSON.parse(JSON.stringify(window.presetDefinitions[actualPresetName].rules));
            this.renderRules();
            this.notifyRulesChanged();
            this.toggleRuleActions(false); // Hide buttons for presets
        }
    }
    
    /**
     * Generate random rules for experimentation
     */
    generateRandomRules() {
        const maxStates = parseInt(document.getElementById('maxStates')?.value || '2');
        const maxColors = parseInt(document.getElementById('maxColors')?.value || '4');
        
        this.rules = {};
        
        for (let state = 0; state < maxStates; state++) {
            this.rules[state] = [];
            
            for (let color = 0; color < maxColors; color++) {
                const writeColor = Math.floor(Math.random() * maxColors);
                const moveIndex = Math.floor(Math.random() * this.moveOptions.length);
                const move = this.moveOptions[moveIndex].value;
                const nextState = Math.floor(Math.random() * maxStates);
                
                this.rules[state].push({
                    writeColor,
                    move,
                    nextState
                });
            }
        }
        
        this.renderRules();
        this.notifyRulesChanged();
        
        // Update preset to custom
        if (this.presetSelect) {
            this.presetSelect.value = 'custom';
            this.toggleRuleActions(true);
        }
    }
    
    /**
     * Add a new rule condition
     */
    addRule() {
        // Find the highest state number currently in use
        const states = Object.keys(this.rules).map(s => parseInt(s));
        const maxState = states.length > 0 ? Math.max(...states) : -1;
        const newState = maxState + 1;
        
        // Add a basic rule for the new state
        this.rules[newState] = [{
            writeColor: 1,
            move: 'R',
            nextState: 0
        }];
        
        this.renderRules();
        this.notifyRulesChanged();
        
        // Update preset to custom
        if (this.presetSelect) {
            this.presetSelect.value = 'custom';
            this.toggleRuleActions(true);
        }
    }
    
    /**
     * Remove a rule state
     */
    removeRule(stateToRemove) {
        delete this.rules[stateToRemove];
        
        // Renumber states to be sequential starting from 0
        const states = Object.keys(this.rules).map(s => parseInt(s)).sort((a, b) => a - b);
        const newRules = {};
        
        states.forEach((oldState, newIndex) => {
            newRules[newIndex] = this.rules[oldState].map(rule => ({
                ...rule,
                nextState: states.indexOf(rule.nextState) >= 0 ? states.indexOf(rule.nextState) : 0
            }));
        });
        
        this.rules = newRules;
        this.renderRules();
        this.notifyRulesChanged();
        
        // Update preset to custom
        if (this.presetSelect) {
            this.presetSelect.value = 'custom';
            this.toggleRuleActions(true);
        }
    }
    
    /**
     * Update a specific rule condition
     */
    updateRule(state, colorIndex, property, value) {
        if (!this.rules[state] || !this.rules[state][colorIndex]) {
            return;
        }
        
        this.rules[state][colorIndex][property] = property === 'nextState' ? parseInt(value) : value;
        this.notifyRulesChanged();
        
        // Update preset to custom
        if (this.presetSelect) {
            this.presetSelect.value = 'custom';
            this.toggleRuleActions(true);
        }
    }
    
    /**
     * Add a color condition to an existing state
     */
    addColorCondition(state) {
        if (!this.rules[state]) {
            this.rules[state] = [];
        }
        
        const newColorIndex = this.rules[state].length;
        this.rules[state].push({
            writeColor: newColorIndex % this.colorOptions.length,
            move: 'N',
            nextState: parseInt(state)
        });
        
        this.renderRules();
        this.notifyRulesChanged();
        
        // Update preset to custom
        if (this.presetSelect) {
            this.presetSelect.value = 'custom';
            this.toggleRuleActions(true);
        }
    }
    
    /**
     * Remove a color condition from a state
     */
    removeColorCondition(state, colorIndex) {
        if (!this.rules[state]) return;
        
        this.rules[state].splice(colorIndex, 1);
        
        // If no conditions left, remove the entire state
        if (this.rules[state].length === 0) {
            this.removeRule(state);
            return;
        }
        
        this.renderRules();
        this.notifyRulesChanged();
        
        // Update preset to custom
        if (this.presetSelect) {
            this.presetSelect.value = 'custom';
            this.toggleRuleActions(true);
        }
    }
    
    /**
     * Render the current rules as interactive UI elements
     */
    renderRules() {
        if (!this.ruleListElement) return;
        
        this.ruleListElement.innerHTML = '';
        
        const states = Object.keys(this.rules).map(s => parseInt(s)).sort((a, b) => a - b);
        
        if (states.length === 0) {
            this.ruleListElement.innerHTML = `
                <div class="no-rules-message">
                    <p><strong>No rules defined.</strong></p>
                    <p>Click "Add Rule" to create your first rule condition.</p>
                </div>
            `;
            return;
        }
        
        states.forEach(state => {
            const stateRules = this.rules[state];
            if (!stateRules) return;
            
            const stateElement = this.createStateElement(state, stateRules);
            this.ruleListElement.appendChild(stateElement);
        });
    }
    
    /**
     * Create a UI element for a single state and its rules
     */
    createStateElement(state, stateRules) {
        const stateDiv = document.createElement('div');
        stateDiv.className = 'rule-state';
        stateDiv.innerHTML = `
            <div class="state-header">
                <h5>State ${state} <span class="state-description">(Ant behavior mode)</span></h5>
                <div class="state-actions">
                    <button class="add-color-btn secondary-btn" title="Add color condition to this state">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="remove-state-btn delete-rule-btn" title="Remove this entire state">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="color-conditions">
            </div>
        `;
        
        const colorConditionsDiv = stateDiv.querySelector('.color-conditions');
        
        // Add event listeners for state actions
        stateDiv.querySelector('.add-color-btn').addEventListener('click', () => {
            this.addColorCondition(state);
        });
        
        stateDiv.querySelector('.remove-state-btn').addEventListener('click', () => {
            if (confirm(`Remove State ${state} and all its conditions?`)) {
                this.removeRule(state);
            }
        });
        
        // Create UI for each color condition
        stateRules.forEach((rule, colorIndex) => {
            const conditionElement = this.createColorConditionElement(state, colorIndex, rule);
            colorConditionsDiv.appendChild(conditionElement);
        });
        
        return stateDiv;
    }
    
    /**
     * Create a UI element for a single color condition
     */
    createColorConditionElement(state, colorIndex, rule) {
        const conditionDiv = document.createElement('div');
        conditionDiv.className = 'color-condition';
        
        // Create the readable rule description
        const seeColorName = this.colorOptions[colorIndex]?.name || `Color ${colorIndex}`;
        const writeColorName = this.colorOptions[rule.writeColor]?.name || `Color ${rule.writeColor}`;
        const moveName = this.moveOptions.find(m => m.value === rule.move)?.name || rule.move;
        
        conditionDiv.innerHTML = `
            <div class="condition-description">
                <span class="if-text">IF</span>
                <span class="see-color">sees ${seeColorName}</span>
                <span class="then-text">THEN</span>
                <span class="actions">
                    write <span class="write-color">${writeColorName}</span>,
                    <span class="move-action">${moveName}</span>,
                    go to <span class="next-state">State ${rule.nextState}</span>
                </span>
            </div>
            
            <div class="condition-controls">
                <div class="control-group">
                    <label>Write Color:</label>
                    <select class="write-color-select">
                        ${this.colorOptions.map(color => 
                            `<option value="${color.value}" ${color.value === rule.writeColor ? 'selected' : ''}>
                                ${color.name}
                            </option>`
                        ).join('')}
                    </select>
                </div>
                
                <div class="control-group">
                    <label>Movement:</label>
                    <select class="move-select">
                        ${this.moveOptions.map(move => 
                            `<option value="${move.value}" ${move.value === rule.move ? 'selected' : ''} 
                                title="${move.description}">
                                ${move.name}
                            </option>`
                        ).join('')}
                    </select>
                </div>
                
                <div class="control-group">
                    <label>Next State:</label>
                    <select class="next-state-select">
                        ${Object.keys(this.rules).map(s => 
                            `<option value="${s}" ${parseInt(s) === rule.nextState ? 'selected' : ''}>
                                State ${s}
                            </option>`
                        ).join('')}
                    </select>
                </div>
                
                <button class="remove-condition-btn delete-rule-btn" title="Remove this color condition">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Add event listeners for the controls
        const writeColorSelect = conditionDiv.querySelector('.write-color-select');
        const moveSelect = conditionDiv.querySelector('.move-select');
        const nextStateSelect = conditionDiv.querySelector('.next-state-select');
        const removeBtn = conditionDiv.querySelector('.remove-condition-btn');
        
        writeColorSelect.addEventListener('change', (e) => {
            this.updateRule(state, colorIndex, 'writeColor', parseInt(e.target.value));
            this.renderRules(); // Re-render to update the description
        });
        
        moveSelect.addEventListener('change', (e) => {
            this.updateRule(state, colorIndex, 'move', e.target.value);
            this.renderRules(); // Re-render to update the description
        });
        
        nextStateSelect.addEventListener('change', (e) => {
            this.updateRule(state, colorIndex, 'nextState', parseInt(e.target.value));
            this.renderRules(); // Re-render to update the description
        });
        
        removeBtn.addEventListener('click', () => {
            if (confirm('Remove this color condition?')) {
                this.removeColorCondition(state, colorIndex);
            }
        });
        
        return conditionDiv;
    }
    
    /**
     * Get the current rules in the format expected by the simulation
     */
    getRules() {
        return JSON.parse(JSON.stringify(this.rules));
    }
    
    /**
     * Set rules from external source (e.g., loading a saved project)
     */
    setRules(newRules) {
        this.rules = JSON.parse(JSON.stringify(newRules));
        this.renderRules();
        
        // Update preset to custom since we're loading external rules
        if (this.presetSelect) {
            this.presetSelect.value = 'custom';
            this.toggleRuleActions(true);
        }
    }
    
    /**
     * Notify the main simulation that rules have changed
     */
    notifyRulesChanged() {
        // Dispatch a custom event that the main script can listen to
        const event = new CustomEvent('rulesChanged', {
            detail: { rules: this.getRules() }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * Get a human-readable summary of the current rules
     */
    getRulesSummary() {
        const states = Object.keys(this.rules).length;
        const totalConditions = Object.values(this.rules).reduce((sum, stateRules) => sum + stateRules.length, 0);
        const colors = new Set();
        
        Object.values(this.rules).forEach(stateRules => {
            stateRules.forEach((rule, index) => {
                colors.add(index); // Input color
                colors.add(rule.writeColor); // Output color
            });
        });
        
        return {
            states,
            conditions: totalConditions,
            colors: colors.size,
            description: `${states} state${states !== 1 ? 's' : ''}, ${totalConditions} condition${totalConditions !== 1 ? 's' : ''}, ${colors.size} color${colors.size !== 1 ? 's' : ''}`
        };
    }
}

// Global rule builder instance
let ruleBuilder = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    ruleBuilder = new RuleBuilder();
    
    // Make it globally accessible for debugging
    window.ruleBuilder = ruleBuilder;
}); 