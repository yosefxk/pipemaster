/**
 * SVG Pipe Tile Renderer
 * Generates crisp, high-contrast double-track pipe graphics,
 * source hubs, terminal bulbs, glowing water flow, and hint indicators.
 */

class PipeRenderer {
    constructor() {
        this.svgNS = "http://www.w3.org/2000/svg";
    }

    /**
     * Render the entire board into a container element
     */
    renderBoard(container, engine, theme = 'minimal-dark') {
        container.innerHTML = '';
        container.className = `pipes-grid theme-${theme}`;
        container.style.gridTemplateRows = `repeat(${engine.rows}, 1fr)`;
        container.style.gridTemplateColumns = `repeat(${engine.cols}, 1fr)`;

        // Calculate aspect ratio constraint to ensure square tiles fit mobile screens
        const maxDimension = Math.max(engine.rows, engine.cols);
        container.style.setProperty('--grid-rows', engine.rows);
        container.style.setProperty('--grid-cols', engine.cols);

        for (let r = 0; r < engine.rows; r++) {
            for (let c = 0; c < engine.cols; c++) {
                const tile = engine.grid[r][c];
                const tileElem = this.createTileElement(tile, engine);
                container.appendChild(tileElem);
            }
        }
    }

    /**
     * Update an existing rendered board without full DOM recreation for performance
     */
    updateBoardState(container, engine) {
        for (let r = 0; r < engine.rows; r++) {
            for (let c = 0; c < engine.cols; c++) {
                const tile = engine.grid[r][c];
                const tileElem = container.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                if (tileElem) {
                    this.updateTileElement(tileElem, tile, engine);
                }
            }
        }
    }

    /**
     * Create a single tile DOM element
     */
    createTileElement(tile, engine) {
        const div = document.createElement('div');
        div.className = 'pipe-tile';
        div.setAttribute('data-row', tile.row);
        div.setAttribute('data-col', tile.col);
        
        if (tile.isSource) div.classList.add('is-source');
        if (tile.isFlowing) div.classList.add('is-flowing');
        if (tile.isHintLocked) div.classList.add('is-locked');
        if (tile.currentMask === 0) div.classList.add('is-empty');

        // SVG wrapper with smooth rotation
        const svg = this.generateTileSVG(tile);
        div.appendChild(svg);

        // Lock / Hint Pin Badge
        const lockBadge = document.createElement('div');
        lockBadge.className = 'tile-lock-badge';
        lockBadge.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>`;
        div.appendChild(lockBadge);

        // Torus / Wrap indicator pips if wrapEdges is enabled
        if (engine.wrapEdges) {
            this.appendWrapIndicators(div, tile, engine);
        }

        return div;
    }

    /**
     * Update a single tile DOM element
     */
    updateTileElement(div, tile, engine) {
        div.classList.toggle('is-flowing', tile.isFlowing);
        div.classList.toggle('is-locked', tile.isHintLocked);

        const svg = div.querySelector('.pipe-svg');
        if (svg) {
            // Apply CSS rotation transform
            svg.style.transform = `rotate(${tile.rotationAngle}deg)`;
            
            // Re-render internal paths to reflect new currentMask
            this.populateSVGPaths(svg, tile);
        }

        if (engine.wrapEdges) {
            this.updateWrapIndicators(div, tile, engine);
        }
    }

    /**
     * Generate SVG for a pipe tile
     */
    generateTileSVG(tile) {
        const svg = document.createElementNS(this.svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('class', 'pipe-svg');
        svg.style.transform = `rotate(${tile.rotationAngle}deg)`;

        this.populateSVGPaths(svg, tile);
        return svg;
    }

    /**
     * Build internal vector paths for the double-line pipe aesthetic
     */
    populateSVGPaths(svg, tile) {
        svg.innerHTML = '';
        const mask = tile.currentMask;
        if (mask === 0) return;

        const g = document.createElementNS(this.svgNS, 'g');
        g.setAttribute('class', 'pipe-group');

        const N = Boolean(mask & DIRS.NORTH);
        const E = Boolean(mask & DIRS.EAST);
        const S = Boolean(mask & DIRS.SOUTH);
        const W = Boolean(mask & DIRS.WEST);
        const count = (N ? 1 : 0) + (E ? 1 : 0) + (S ? 1 : 0) + (W ? 1 : 0);

        // Pipe geometry constants
        const W_INNER = 8;   // Half-width of inner core channel
        const W_OUTER = 16;  // Half-width of outer pipe boundary
        const CORNER_R = 34; // Corner curve radius

        // 1. Source Hub (Central Node with circular cutout)
        if (tile.isSource) {
            const hub = document.createElementNS(this.svgNS, 'circle');
            hub.setAttribute('cx', '50');
            hub.setAttribute('cy', '50');
            hub.setAttribute('r', '22');
            hub.setAttribute('class', 'pipe-source-hub');
            g.appendChild(hub);

            const hubInner = document.createElementNS(this.svgNS, 'circle');
            hubInner.setAttribute('cx', '50');
            hubInner.setAttribute('cy', '50');
            hubInner.setAttribute('r', '9');
            hubInner.setAttribute('class', 'pipe-source-core');
            g.appendChild(hubInner);

            // Stems leading to openings
            if (N) this.drawStem(g, 'N', W_OUTER);
            if (E) this.drawStem(g, 'E', W_OUTER);
            if (S) this.drawStem(g, 'S', W_OUTER);
            if (W) this.drawStem(g, 'W', W_OUTER);
        }
        // 2. Terminal Bulb (Single connection cap)
        else if (count === 1) {
            const bulbOuter = document.createElementNS(this.svgNS, 'circle');
            bulbOuter.setAttribute('cx', '50');
            bulbOuter.setAttribute('cy', '50');
            bulbOuter.setAttribute('r', '20');
            bulbOuter.setAttribute('class', 'pipe-bulb-outer');
            g.appendChild(bulbOuter);

            const bulbInner = document.createElementNS(this.svgNS, 'circle');
            bulbInner.setAttribute('cx', '50');
            bulbInner.setAttribute('cy', '50');
            bulbInner.setAttribute('r', '7');
            bulbInner.setAttribute('class', 'pipe-bulb-inner');
            g.appendChild(bulbInner);

            if (N) this.drawStem(g, 'N', W_OUTER);
            if (E) this.drawStem(g, 'E', W_OUTER);
            if (S) this.drawStem(g, 'S', W_OUTER);
            if (W) this.drawStem(g, 'W', W_OUTER);
        }
        // 3. Straight Pipe (N-S or E-W)
        else if (count === 2 && ((N && S) || (E && W))) {
            const path = document.createElementNS(this.svgNS, 'path');
            if (N && S) {
                // Vertical straight lines
                path.setAttribute('d', `
                    M ${50 - W_OUTER} 0 L ${50 - W_OUTER} 100
                    M ${50 + W_OUTER} 0 L ${50 + W_OUTER} 100
                `);
            } else {
                // Horizontal straight lines
                path.setAttribute('d', `
                    M 0 ${50 - W_OUTER} L 100 ${50 - W_OUTER}
                    M 0 ${50 + W_OUTER} L 100 ${50 + W_OUTER}
                `);
            }
            path.setAttribute('class', 'pipe-line');
            g.appendChild(path);
        }
        // 4. Elbow / Corner (N-E, E-S, S-W, W-N)
        else if (count === 2) {
            const path = document.createElementNS(this.svgNS, 'path');
            let d = '';
            if (N && E) {
                d = `
                    M ${50 - W_OUTER} 0 A ${50 + W_OUTER} ${50 + W_OUTER} 0 0 0 100 ${50 + W_OUTER}
                    M ${50 + W_OUTER} 0 A ${50 - W_OUTER} ${50 - W_OUTER} 0 0 0 100 ${50 - W_OUTER}
                `;
            } else if (E && S) {
                d = `
                    M 100 ${50 - W_OUTER} A ${50 + W_OUTER} ${50 + W_OUTER} 0 0 0 ${50 - W_OUTER} 100
                    M 100 ${50 + W_OUTER} A ${50 - W_OUTER} ${50 - W_OUTER} 0 0 0 ${50 + W_OUTER} 100
                `;
            } else if (S && W) {
                d = `
                    M ${50 + W_OUTER} 100 A ${50 + W_OUTER} ${50 + W_OUTER} 0 0 0 0 ${50 - W_OUTER}
                    M ${50 - W_OUTER} 100 A ${50 - W_OUTER} ${50 - W_OUTER} 0 0 0 0 ${50 + W_OUTER}
                `;
            } else if (W && N) {
                d = `
                    M 0 ${50 + W_OUTER} A ${50 + W_OUTER} ${50 + W_OUTER} 0 0 0 ${50 + W_OUTER} 0
                    M 0 ${50 - W_OUTER} A ${50 - W_OUTER} ${50 - W_OUTER} 0 0 0 ${50 - W_OUTER} 0
                `;
            }
            path.setAttribute('d', d);
            path.setAttribute('class', 'pipe-line');
            g.appendChild(path);
        }
        // 5. T-Junction (3 connections)
        else if (count === 3) {
            const path = document.createElementNS(this.svgNS, 'path');
            let d = '';
            if (!N) { // E, S, W
                d = `
                    M 0 ${50 - W_OUTER} L 100 ${50 - W_OUTER}
                    M 0 ${50 + W_OUTER} A ${50 - W_OUTER} ${50 - W_OUTER} 0 0 0 ${50 - W_OUTER} 100
                    M 100 ${50 + W_OUTER} A ${50 - W_OUTER} ${50 - W_OUTER} 0 0 1 ${50 + W_OUTER} 100
                `;
            } else if (!E) { // N, S, W
                d = `
                    M ${50 + W_OUTER} 0 L ${50 + W_OUTER} 100
                    M ${50 - W_OUTER} 0 A ${50 - W_OUTER} ${50 - W_OUTER} 0 0 1 0 ${50 - W_OUTER}
                    M ${50 - W_OUTER} 100 A ${50 - W_OUTER} ${50 - W_OUTER} 0 0 0 0 ${50 + W_OUTER}
                `;
            } else if (!S) { // N, E, W
                d = `
                    M 0 ${50 + W_OUTER} L 100 ${50 + W_OUTER}
                    M 0 ${50 - W_OUTER} A ${50 - W_OUTER} ${50 - W_OUTER} 0 0 1 ${50 - W_OUTER} 0
                    M 100 ${50 - W_OUTER} A ${50 - W_OUTER} ${50 - W_OUTER} 0 0 0 ${50 + W_OUTER} 0
                `;
            } else if (!W) { // N, E, S
                d = `
                    M ${50 - W_OUTER} 0 L ${50 - W_OUTER} 100
                    M ${50 + W_OUTER} 0 A ${50 - W_OUTER} ${50 - W_OUTER} 0 0 0 100 ${50 - W_OUTER}
                    M ${50 + W_OUTER} 100 A ${50 - W_OUTER} ${50 - W_OUTER} 0 0 1 100 ${50 + W_OUTER}
                `;
            }
            path.setAttribute('d', d);
            path.setAttribute('class', 'pipe-line');
            g.appendChild(path);
        }
        // 6. Cross / 4-Way
        else if (count === 4) {
            const path = document.createElementNS(this.svgNS, 'path');
            const d = `
                M ${50 - W_OUTER} 0 A ${50 - W_OUTER} ${50 - W_OUTER} 0 0 1 0 ${50 - W_OUTER}
                M 0 ${50 + W_OUTER} A ${50 - W_OUTER} ${50 - W_OUTER} 0 0 1 ${50 - W_OUTER} 100
                M ${50 + W_OUTER} 100 A ${50 - W_OUTER} ${50 - W_OUTER} 0 0 1 100 ${50 + W_OUTER}
                M 100 ${50 - W_OUTER} A ${50 - W_OUTER} ${50 - W_OUTER} 0 0 1 ${50 + W_OUTER} 0
            `;
            path.setAttribute('d', d);
            path.setAttribute('class', 'pipe-line');
            g.appendChild(path);
        }

        svg.appendChild(g);
    }

    /**
     * Draw straight connection stems for Hubs and Bulbs
     */
    drawStem(g, dir, w) {
        const path = document.createElementNS(this.svgNS, 'path');
        let d = '';
        if (dir === 'N') {
            d = `M ${50 - w} 0 L ${50 - w} 30 M ${50 + w} 0 L ${50 + w} 30`;
        } else if (dir === 'E') {
            d = `M 70 ${50 - w} L 100 ${50 - w} M 70 ${50 + w} L 100 ${50 + w}`;
        } else if (dir === 'S') {
            d = `M ${50 - w} 70 L ${50 - w} 100 M ${50 + w} 70 L ${50 + w} 100`;
        } else if (dir === 'W') {
            d = `M 0 ${50 - w} L 30 ${50 - w} M 0 ${50 + w} L 30 ${50 + w}`;
        }
        path.setAttribute('d', d);
        path.setAttribute('class', 'pipe-line stem');
        g.appendChild(path);
    }

    /**
     * Add visual wrap portal cues around edge boundaries
     */
    appendWrapIndicators(div, tile, engine) {
        const mask = tile.currentMask;
        if (tile.row === 0 && (mask & DIRS.NORTH)) {
            const pip = document.createElement('div');
            pip.className = 'wrap-pip wrap-north';
            div.appendChild(pip);
        }
        if (tile.row === engine.rows - 1 && (mask & DIRS.SOUTH)) {
            const pip = document.createElement('div');
            pip.className = 'wrap-pip wrap-south';
            div.appendChild(pip);
        }
        if (tile.col === 0 && (mask & DIRS.WEST)) {
            const pip = document.createElement('div');
            pip.className = 'wrap-pip wrap-west';
            div.appendChild(pip);
        }
        if (tile.col === engine.cols - 1 && (mask & DIRS.EAST)) {
            const pip = document.createElement('div');
            pip.className = 'wrap-pip wrap-east';
            div.appendChild(pip);
        }
    }

    updateWrapIndicators(div, tile, engine) {
        div.querySelectorAll('.wrap-pip').forEach(el => el.remove());
        this.appendWrapIndicators(div, tile, engine);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PipeRenderer };
}
