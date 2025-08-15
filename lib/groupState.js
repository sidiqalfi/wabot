const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'groupState.json');
let groupStates = {};

// Ensure data directory exists
const dataDir = path.dirname(dataPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

function loadState() {
    try {
        if (fs.existsSync(dataPath)) {
            const rawData = fs.readFileSync(dataPath, 'utf8');
            groupStates = JSON.parse(rawData);
        }
    } catch (error) {
        console.error('Error loading group state:', error);
        groupStates = {};
    }
}

function saveState() {
    try {
        fs.writeFileSync(dataPath, JSON.stringify(groupStates, null, 2));
    } catch (error) {
        console.error('Error saving group state:', error);
    }
}

// Load initial state
loadState();

/**
 * Get the state for a specific group.
 * @param {string} groupId The JID of the group.
 * @returns {'on' | 'off'} The state of the bot in the group. Defaults to 'on'.
 */
function getState(groupId) {
    return groupStates[groupId] || 'on';
}

/**
 * Set the state for a specific group.
 * @param {string} groupId The JID of the group.
 * @param {'on' | 'off'} state The new state.
 */
function setState(groupId, state) {
    if (state === 'on' || state === 'off') {
        groupStates[groupId] = state;
        saveState();
    }
}

module.exports = {
    getState,
    setState,
};
