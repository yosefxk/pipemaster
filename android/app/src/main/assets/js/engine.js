/**
 * PipeMaster Game Engine
 * Spanning tree puzzle generation, deterministic rotation,
 * color-coded portal pairs (flow-over teleportation), and flow solver.
 */

const DIRS = {
    NORTH: 1, // 0001
    EAST:  2, // 0010
    SOUTH: 4, // 0100
    WEST:  8  // 1000
};

const DIR_LIST = [DIRS.NORTH, DIRS.EAST, DIRS.SOUTH, DIRS.WEST];

const OPPOSITE = {
    [DIRS.NORTH]: DIRS.SOUTH,
    [DIRS.EAST]:  DIRS.WEST,
    [DIRS.SOUTH]: DIRS.NORTH,
    [DIRS.WEST]:  DIRS.EAST
};

const DELTA = {
    [DIRS.NORTH]: [-1,  0],
    [DIRS.EAST]:  [ 0,  1],
    [DIRS.SOUTH]: [ 1,  0],
    [DIRS.WEST]:  [ 0, -1]
};

// Distinct vibrant portal pair palette
const PORTAL_COLORS = [
    { label: 'A', color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.75)' },  // Neon Rose
    { label: 'B', color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.75)' },  // Electric Cyan
    { label: 'C', color: '#eab308', glow: 'rgba(234, 179, 8, 0.75)' },   // Neon Gold
    { label: 'D', color: '#a855f7', glow: 'rgba(168, 85, 247, 0.75)' }   // Plasma Purple
];

// Map 4-bit connection mask to canonical base type and initial base rotation
const CANONICAL_MAP = {
    0:  { type: '0', baseRot: 0 },
    1:  { type: '1', baseRot: 0 },
    2:  { type: '1', baseRot: 90 },
    4:  { type: '1', baseRot: 180 },
    8:  { type: '1', baseRot: 270 },
    5:  { type: 'I', baseRot: 0 },
    10: { type: 'I', baseRot: 90 },
    3:  { type: 'L', baseRot: 0 },
    6:  { type: 'L', baseRot: 90 },
    12: { type: 'L', baseRot: 180 },
    9:  { type: 'L', baseRot: 270 },
    11: { type: 'T', baseRot: 0 },
    7:  { type: 'T', baseRot: 90 },
    14: { type: 'T', baseRot: 180 },
    13: { type: 'T', baseRot: 270 },
    15: { type: '+', baseRot: 0 }
};

function rotateMaskCW(mask) {
    return ((mask << 1) & 0b1111) | ((mask >> 3) & 0b0001);
}

function rotateMaskCCW(mask) {
    return ((mask >> 1) & 0b0111) | ((mask << 3) & 0b1000);
}

class PipeTile {
    constructor(row, col, solutionMask = 0, isSource = false) {
        this.row = row;
        this.col = col;
        this.solutionMask = solutionMask;
        this.currentMask = solutionMask;
        
        const info = CANONICAL_MAP[solutionMask] || { type: '0', baseRot: 0 };
        this.canonicalType = info.type;
        this.rotationAngle = info.baseRot;
        this.isSource = isSource;
        this.isFlowing = false;
        this.isHintLocked = false;
        this.portalInfo = null; // { label, color, glow, partner: [r, c] }
    }

    getType() {
        return this.canonicalType;
    }

    rotateCW() {
        if (this.isHintLocked) return false;
        this.currentMask = rotateMaskCW(this.currentMask);
        this.rotationAngle += 90;
        return true;
    }

    rotateCCW() {
        if (this.isHintLocked) return false;
        this.currentMask = rotateMaskCCW(this.currentMask);
        this.rotationAngle -= 90;
        return true;
    }

    isCorrect() {
        if (this.canonicalType === '+' || this.canonicalType === '0') return true;
        if (this.canonicalType === 'I') {
            return this.currentMask === this.solutionMask || 
                   this.currentMask === rotateMaskCW(rotateMaskCW(this.solutionMask));
        }
        return this.currentMask === this.solutionMask;
    }
}

class PipesGameEngine {
    constructor(options = {}) {
        this.rows = options.rows || 6;
        this.cols = options.cols || 6;
        this.difficulty = options.difficulty || 'medium';
        this.enablePortals = options.wrapEdges ?? false; // Flow-over portal pairs
        this.sourcePos = options.sourcePos || null;
        
        this.grid = [];
        this.sourceTile = null;
        this.portalPairs = []; // [{ p1: [r, c], p2: [r, c], info }]
        this.moves = 0;
        this.hintsUsed = 0;
        this.isCompleted = false;
        this.initialStateSnapshot = null;

        this.generateBoard();
    }

    generateBoard() {
        this.moves = 0;
        this.hintsUsed = 0;
        this.isCompleted = false;
        this.grid = [];
        this.portalPairs = [];

        // 1. Pick Source location near center
        let sr = this.sourcePos ? this.sourcePos[0] : Math.floor(this.rows / 2);
        let sc = this.sourcePos ? this.sourcePos[1] : Math.floor(this.cols / 2);
        sr = Math.max(0, Math.min(this.rows - 1, sr));
        sc = Math.max(0, Math.min(this.cols - 1, sc));

        // 2. Select Portal Pairs if enabled
        if (this.enablePortals) {
            const pairCount = (this.rows >= 8 || this.cols >= 8) ? 2 : 1;
            this._selectPortalLocations(sr, sc, pairCount);
        }

        // 3. Generate Spanning Tree connections
        const connections = this._generateSpanningTree(sr, sc);

        // 4. Create PipeTile instances
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                const isSource = (r === sr && c === sc);
                const solMask = connections[r][c];
                const tile = new PipeTile(r, c, solMask, isSource);
                
                // Attach portal metadata if assigned
                for (const pair of this.portalPairs) {
                    if (pair.p1[0] === r && pair.p1[1] === c) {
                        tile.portalInfo = { ...pair.info, partner: pair.p2 };
                    } else if (pair.p2[0] === r && pair.p2[1] === c) {
                        tile.portalInfo = { ...pair.info, partner: pair.p1 };
                    }
                }

                this.grid[r][c] = tile;
                if (isSource) {
                    this.sourceTile = tile;
                }
            }
        }

        // 5. Scramble board
        this._scrambleBoard();

        // 6. Save initial scrambled state for clean restart
        this.saveInitialStateSnapshot();

        // 7. Calculate initial flow
        this.updateFlow();
    }

    _selectPortalLocations(sr, sc, count) {
        const used = new Set([`${sr},${sc}`]);
        for (let i = 0; i < count; i++) {
            const info = PORTAL_COLORS[i % PORTAL_COLORS.length];
            
            // Choose portal A in one quadrant and portal B in another
            let p1 = null;
            let p2 = null;
            let attempts = 0;

            while ((!p1 || !p2) && attempts < 100) {
                attempts++;
                const r1 = Math.floor(Math.random() * this.rows);
                const c1 = Math.floor(Math.random() * this.cols);
                const r2 = Math.floor(Math.random() * this.rows);
                const c2 = Math.floor(Math.random() * this.cols);

                const k1 = `${r1},${c1}`;
                const k2 = `${r2},${c2}`;

                // Ensure distance >= 3 and not overlapping
                const dist = Math.abs(r1 - r2) + Math.abs(c1 - c2);
                if (!used.has(k1) && !used.has(k2) && dist >= 3) {
                    p1 = [r1, c1];
                    p2 = [r2, c2];
                    used.add(k1);
                    used.add(k2);
                    break;
                }
            }

            if (p1 && p2) {
                this.portalPairs.push({ p1, p2, info });
            }
        }
    }

    _generateSpanningTree(startR, startC) {
        const rows = this.rows;
        const cols = this.cols;
        const inTree = Array.from({ length: rows }, () => Array(cols).fill(false));
        const masks = Array.from({ length: rows }, () => Array(cols).fill(0));

        inTree[startR][startC] = true;
        let connectedCount = 1;
        const totalCells = rows * cols;
        const frontier = [];

        const addFrontierOf = (r, c) => {
            for (const d of DIR_LIST) {
                const [dr, dc] = DELTA[d];
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !inTree[nr][nc]) {
                    frontier.push({
                        fromR: r, fromC: c,
                        toR: nr, toC: nc,
                        dir: d,
                        oppDir: OPPOSITE[d]
                    });
                }
            }
        };

        addFrontierOf(startR, startC);

        while (frontier.length > 0 && connectedCount < totalCells) {
            const idx = Math.floor(Math.random() * frontier.length);
            const edge = frontier.splice(idx, 1)[0];

            if (inTree[edge.toR][edge.toC]) continue;

            inTree[edge.toR][edge.toC] = true;
            masks[edge.fromR][edge.fromC] |= edge.dir;
            masks[edge.toR][edge.toC] |= edge.oppDir;
            connectedCount++;

            // If we just connected to Portal A, also add Portal B's frontier!
            for (const pair of this.portalPairs) {
                if (pair.p1[0] === edge.toR && pair.p1[1] === edge.toC) {
                    const [pr2, pc2] = pair.p2;
                    if (!inTree[pr2][pc2]) {
                        inTree[pr2][pc2] = true;
                        connectedCount++;
                        addFrontierOf(pr2, pc2);
                    }
                } else if (pair.p2[0] === edge.toR && pair.p2[1] === edge.toC) {
                    const [pr1, pc1] = pair.p1;
                    if (!inTree[pr1][pc1]) {
                        inTree[pr1][pc1] = true;
                        connectedCount++;
                        addFrontierOf(pr1, pc1);
                    }
                }
            }

            addFrontierOf(edge.toR, edge.toC);
        }

        // Add loops for hard/master difficulties
        if (this.difficulty === 'hard' || this.difficulty === 'master') {
            const extraLoops = Math.floor((rows * cols) * (this.difficulty === 'master' ? 0.20 : 0.10));
            for (let i = 0; i < extraLoops; i++) {
                const r = Math.floor(Math.random() * rows);
                const c = Math.floor(Math.random() * cols);
                const d = DIR_LIST[Math.floor(Math.random() * DIR_LIST.length)];
                const [dr, dc] = DELTA[d];
                const nr = r + dr;
                const nc = c + dc;
                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

                masks[r][c] |= d;
                masks[nr][nc] |= OPPOSITE[d];
            }
        }

        // Guarantee portals have at least 1 opening so water can flow into and out of them
        for (const pair of this.portalPairs) {
            for (const [pr, pc] of [pair.p1, pair.p2]) {
                if (masks[pr][pc] === 0) {
                    for (const d of DIR_LIST) {
                        const [dr, dc] = DELTA[d];
                        const nr = pr + dr;
                        const nc = pc + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                            masks[pr][pc] |= d;
                            masks[nr][nc] |= OPPOSITE[d];
                            break;
                        }
                    }
                }
            }
        }

        return masks;
    }

    _scrambleBoard() {
        let isTriviallySolved = true;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const tile = this.grid[r][c];
                const rotations = Math.floor(Math.random() * 4);
                for (let k = 0; k < rotations; k++) {
                    tile.rotateCW();
                }
                if (!tile.isCorrect()) {
                    isTriviallySolved = false;
                }
            }
        }

        if (isTriviallySolved) {
            for (let i = 0; i < Math.min(5, this.rows * this.cols); i++) {
                const r = Math.floor(Math.random() * this.rows);
                const c = Math.floor(Math.random() * this.cols);
                const tile = this.grid[r][c];
                if (tile.canonicalType !== '+' && tile.canonicalType !== '0') {
                    tile.rotateCW();
                }
            }
        }
    }

    saveInitialStateSnapshot() {
        this.initialStateSnapshot = this.grid.map(row => 
            row.map(tile => ({
                currentMask: tile.currentMask,
                rotationAngle: tile.rotationAngle,
                isHintLocked: false
            }))
        );
    }

    restoreInitialState() {
        if (!this.initialStateSnapshot) return;
        this.moves = 0;
        this.hintsUsed = 0;
        this.isCompleted = false;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const snap = this.initialStateSnapshot[r][c];
                const tile = this.grid[r][c];
                tile.currentMask = snap.currentMask;
                tile.rotationAngle = snap.rotationAngle;
                tile.isHintLocked = false;
            }
        }
        this.updateFlow();
    }

    getNeighbor(r, c, dir) {
        const [dr, dc] = DELTA[dir];
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
            return this.grid[nr][nc];
        }
        return null;
    }

    updateFlow() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.grid[r][c].isFlowing = false;
            }
        }

        if (!this.sourceTile) return false;

        const queue = [this.sourceTile];
        this.sourceTile.isFlowing = true;

        while (queue.length > 0) {
            const current = queue.shift();
            const curMask = current.currentMask;

            // 1. Regular adjacent conduit flow
            for (const d of DIR_LIST) {
                if (curMask & d) {
                    const neighbor = this.getNeighbor(current.row, current.col, d);
                    if (neighbor && !neighbor.isFlowing) {
                        const oppDir = OPPOSITE[d];
                        if (neighbor.currentMask & oppDir) {
                            neighbor.isFlowing = true;
                            queue.push(neighbor);
                        }
                    }
                }
            }

            // 2. Portal Teleportation: If this tile is a portal, flow emerges from its partner portal!
            if (current.portalInfo && current.portalInfo.partner) {
                const [pr, pc] = current.portalInfo.partner;
                const partnerTile = this.grid[pr][pc];
                if (partnerTile && !partnerTile.isFlowing) {
                    partnerTile.isFlowing = true;
                    queue.push(partnerTile);
                }
            }
        }

        this.isCompleted = this.checkWinCondition();
        return this.isCompleted;
    }

    checkWinCondition() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const tile = this.grid[r][c];
                
                if (tile.currentMask !== 0 && !tile.isFlowing) {
                    return false;
                }

                for (const d of DIR_LIST) {
                    if (tile.currentMask & d) {
                        const neighbor = this.getNeighbor(r, c, d);
                        if (!neighbor) {
                            return false;
                        }
                        const oppDir = OPPOSITE[d];
                        if (!(neighbor.currentMask & oppDir)) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }

    rotateTile(r, c, clockwise = true) {
        if (this.isCompleted) return false;
        const tile = this.grid[r][c];
        if (!tile || tile.isHintLocked) return false;

        const rotated = clockwise ? tile.rotateCW() : tile.rotateCCW();
        if (rotated) {
            this.moves++;
            this.updateFlow();
        }
        return rotated;
    }

    applyHint() {
        if (this.isCompleted) return null;

        const unsolvedTiles = [];
        const flowingAdjacentUnsolved = [];

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const tile = this.grid[r][c];
                if (!tile.isCorrect() && !tile.isHintLocked) {
                    unsolvedTiles.push(tile);
                    
                    let isNearFlow = false;
                    for (const d of DIR_LIST) {
                        const neighbor = this.getNeighbor(r, c, d);
                        if (neighbor && neighbor.isFlowing) {
                            isNearFlow = true;
                            break;
                        }
                    }
                    if (isNearFlow) {
                        flowingAdjacentUnsolved.push(tile);
                    }
                }
            }
        }

        if (unsolvedTiles.length === 0) return null;

        const targetTile = flowingAdjacentUnsolved.length > 0 
            ? flowingAdjacentUnsolved[Math.floor(Math.random() * flowingAdjacentUnsolved.length)]
            : unsolvedTiles[Math.floor(Math.random() * unsolvedTiles.length)];

        let safety = 0;
        while (!targetTile.isCorrect() && safety < 4) {
            targetTile.rotateCW();
            safety++;
        }

        targetTile.isHintLocked = true;
        this.hintsUsed++;
        this.updateFlow();

        return {
            row: targetTile.row,
            col: targetTile.col,
            tile: targetTile
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DIRS, OPPOSITE, DELTA, CANONICAL_MAP, PORTAL_COLORS, PipeTile, PipesGameEngine };
}
