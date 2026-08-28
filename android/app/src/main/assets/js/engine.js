/**
 * Pipes Puzzle Game Engine
 * Handles board generation, toroidal wrap-around topology,
 * bitmask transformations, flow traversal, and hint solving.
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

// Map each 4-bit connection mask to its canonical base type and initial base rotation
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

// Rotate bitmask 90 deg clockwise
function rotateMaskCW(mask) {
    return ((mask << 1) & 0b1111) | ((mask >> 3) & 0b0001);
}

// Rotate bitmask 90 deg counter-clockwise
function rotateMaskCCW(mask) {
    return ((mask >> 1) & 0b0111) | ((mask << 3) & 0b1000);
}

// Class representing a single tile
class PipeTile {
    constructor(row, col, solutionMask = 0, isSource = false) {
        this.row = row;
        this.col = col;
        this.solutionMask = solutionMask; // Target bitmask that completes the puzzle
        this.currentMask = solutionMask;   // Current orientation bitmask
        
        const info = CANONICAL_MAP[solutionMask] || { type: '0', baseRot: 0 };
        this.canonicalType = info.type;    // '0', '1', 'I', 'L', 'T', '+'
        this.rotationAngle = info.baseRot; // Visual display rotation in degrees
        this.isSource = isSource;         // Whether this tile is the water/energy pump
        this.isFlowing = false;          // Whether water reaches this tile
        this.isHintLocked = false;       // Whether this tile was solved via hint & locked
        this.wrapExits = {               // Flags if a connection wraps across edges
            [DIRS.NORTH]: false,
            [DIRS.EAST]: false,
            [DIRS.SOUTH]: false,
            [DIRS.WEST]: false
        };
    }

    getType() {
        return this.canonicalType;
    }

    // Rotate tile clockwise by 90 degrees
    rotateCW() {
        if (this.isHintLocked) return false;
        this.currentMask = rotateMaskCW(this.currentMask);
        this.rotationAngle += 90;
        return true;
    }

    // Rotate tile counter-clockwise by 90 degrees
    rotateCCW() {
        if (this.isHintLocked) return false;
        this.currentMask = rotateMaskCCW(this.currentMask);
        this.rotationAngle -= 90;
        return true;
    }

    // Check if current orientation matches the solution (considering symmetry)
    isCorrect() {
        if (this.canonicalType === '+' || this.canonicalType === '0') return true;
        if (this.canonicalType === 'I') {
            return this.currentMask === this.solutionMask || 
                   this.currentMask === rotateMaskCW(rotateMaskCW(this.solutionMask));
        }
        return this.currentMask === this.solutionMask;
    }
}

// Game Board and Puzzle Generator
class PipesGameEngine {
    constructor(options = {}) {
        this.rows = options.rows || 6;
        this.cols = options.cols || 6;
        this.difficulty = options.difficulty || 'medium';
        this.wrapEdges = options.wrapEdges ?? false;
        this.sourcePos = options.sourcePos || null;
        
        this.grid = [];
        this.sourceTile = null;
        this.moves = 0;
        this.hintsUsed = 0;
        this.isCompleted = false;

        this.generateBoard();
    }

    // Initialize/Regenerate the board
    generateBoard() {
        this.moves = 0;
        this.hintsUsed = 0;
        this.isCompleted = false;
        this.grid = [];

        // 1. Pick Source position (near center)
        let sr = this.sourcePos ? this.sourcePos[0] : Math.floor(this.rows / 2);
        let sc = this.sourcePos ? this.sourcePos[1] : Math.floor(this.cols / 2);
        sr = Math.max(0, Math.min(this.rows - 1, sr));
        sc = Math.max(0, Math.min(this.cols - 1, sc));

        // 2. Generate Spanning Tree connections
        const connections = this._generateSpanningTree(sr, sc);

        // 3. Populate PipeTile objects
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                const isSource = (r === sr && c === sc);
                const solMask = connections[r][c];
                const tile = new PipeTile(r, c, solMask, isSource);
                
                // Track wrap exits
                if (this.wrapEdges) {
                    for (const d of DIR_LIST) {
                        if (solMask & d) {
                            const [dr, dc] = DELTA[d];
                            const nr = r + dr;
                            const nc = c + dc;
                            if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) {
                                tile.wrapExits[d] = true;
                            }
                        }
                    }
                }

                this.grid[r][c] = tile;
                if (isSource) {
                    this.sourceTile = tile;
                }
            }
        }

        // 4. Scramble the board
        this._scrambleBoard();

        // 5. Calculate initial flow
        this.updateFlow();
    }

    // Generate spanning tree using randomized Prim's algorithm
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
                let nr = r + dr;
                let nc = c + dc;

                if (this.wrapEdges) {
                    nr = (nr + rows) % rows;
                    nc = (nc + cols) % cols;
                } else {
                    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                }

                if (!inTree[nr][nc]) {
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

            if (inTree[edge.toR][edge.toC]) {
                continue;
            }

            // Connect edge
            inTree[edge.toR][edge.toC] = true;
            masks[edge.fromR][edge.fromC] |= edge.dir;
            masks[edge.toR][edge.toC] |= edge.oppDir;
            connectedCount++;

            addFrontierOf(edge.toR, edge.toC);
        }

        // Add extra loops for 'hard' and 'master' difficulties
        if (this.difficulty === 'hard' || this.difficulty === 'master') {
            const extraLoopCount = Math.floor((rows * cols) * (this.difficulty === 'master' ? 0.20 : 0.10));
            for (let i = 0; i < extraLoopCount; i++) {
                const r = Math.floor(Math.random() * rows);
                const c = Math.floor(Math.random() * cols);
                const d = DIR_LIST[Math.floor(Math.random() * DIR_LIST.length)];
                const [dr, dc] = DELTA[d];
                let nr = r + dr;
                let nc = c + dc;
                if (this.wrapEdges) {
                    nr = (nr + rows) % rows;
                    nc = (nc + cols) % cols;
                } else if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
                    continue;
                }

                const curDegree = ((masks[r][c] & 1) ? 1 : 0) + ((masks[r][c] & 2) ? 1 : 0) +
                                  ((masks[r][c] & 4) ? 1 : 0) + ((masks[r][c] & 8) ? 1 : 0);
                const neighDegree = ((masks[nr][nc] & 1) ? 1 : 0) + ((masks[nr][nc] & 2) ? 1 : 0) +
                                    ((masks[nr][nc] & 4) ? 1 : 0) + ((masks[nr][nc] & 8) ? 1 : 0);

                if (curDegree < 4 && neighDegree < 4) {
                    masks[r][c] |= d;
                    masks[nr][nc] |= OPPOSITE[d];
                }
            }
        }

        return masks;
    }

    // Scramble tiles randomly ensuring the board is not trivially solved
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

    // Get neighbor tile in given direction
    getNeighbor(r, c, dir) {
        const [dr, dc] = DELTA[dir];
        let nr = r + dr;
        let nc = c + dc;

        if (this.wrapEdges) {
            nr = (nr + this.rows) % this.rows;
            nc = (nc + this.cols) % this.cols;
            return this.grid[nr][nc];
        } else {
            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                return this.grid[nr][nc];
            }
            return null;
        }
    }

    // Update water flow simulation from source
    updateFlow() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.grid[r][c].isFlowing = false;
            }
        }

        if (!this.sourceTile) return false;

        // BFS flow propagation
        const queue = [this.sourceTile];
        this.sourceTile.isFlowing = true;

        while (queue.length > 0) {
            const current = queue.shift();
            const curMask = current.currentMask;

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
        }

        this.isCompleted = this.checkWinCondition();
        return this.isCompleted;
    }

    // Check if the entire board is solved
    checkWinCondition() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const tile = this.grid[r][c];
                
                // Every non-empty tile must be receiving flow
                if (tile.currentMask !== 0 && !tile.isFlowing) {
                    return false;
                }

                // Every open port must have a connected neighbor (no leaks into walls or mismatches)
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

    // Rotate a tile at (row, col)
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

    // Apply Hint: finds an unsolved tile, rotates it to the correct orientation, and locks it
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

        // Prioritize tiles adjacent to water flow for better game feel
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

    // Get game completion stats
    getStats() {
        return {
            rows: this.rows,
            cols: this.cols,
            difficulty: this.difficulty,
            wrapEdges: this.wrapEdges,
            moves: this.moves,
            hintsUsed: this.hintsUsed,
            isCompleted: this.isCompleted
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DIRS, OPPOSITE, DELTA, CANONICAL_MAP, PipeTile, PipesGameEngine };
}
