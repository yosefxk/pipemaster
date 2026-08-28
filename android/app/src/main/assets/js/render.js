/**
 * SVG Pipe Tile Renderer
 * Generates crisp, high-contrast double-track pipe graphics,
 * source hubs, terminal bulbs, glowing water flow, and lightbulb hint indicators.
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
     * Update an existing rendered board without recreating DOM elements
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
        if (tile.canonicalType === '0') div.classList.add('is-empty');

        // SVG wrapper with smooth rotation
        const svg = this.generateTileSVG(tile);
        div.appendChild(svg);

        // Lightbulb Hint Badge 💡
        const hintBadge = document.createElement('div');
        hintBadge.className = 'tile-hint-badge';
        hintBadge.innerHTML = `
            <svg viewBox="0 0 24 24" width="13" height="13">
                <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm-2 18h4v1c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-1zm-1-4v-1.12l-.65-.45C6.9 13.41 6 11.78 6 9c0-3.31 2.69-6 6-6s6 2.69 6 6c0 2.78-.9 4.41-2.35 5.43l-.65.45V16H9z"/>
            </svg>
        `;
        div.appendChild(hintBadge);

        // Wrap indicator pips if wrapEdges is enabled
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
            // Apply single CSS rotation transform
            svg.style.transform = `rotate(${tile.rotationAngle}deg)`;
        }

        if (engine.wrapEdges) {
            this.updateWrapIndicators(div, tile, engine);
        }
    }

    /**
     * Generate SVG for a pipe tile based on its canonical base type
     */
    generateTileSVG(tile) {
        const svg = document.createElementNS(this.svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('class', 'pipe-svg');
        svg.style.transform = `rotate(${tile.rotationAngle}deg)`;

        const g = document.createElementNS(this.svgNS, 'g');
        g.setAttribute('class', 'pipe-group');

        const type = tile.canonicalType;
        const W_OUTER = 16; // Half-width offset for pipe boundaries (lines at 34 and 66)

        // 1. Source Hub Base
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

            // Connect stems based on canonical type
            if (type === '1') {
                this.drawStem(g, 'N', W_OUTER);
            } else if (type === 'I') {
                this.drawStem(g, 'N', W_OUTER);
                this.drawStem(g, 'S', W_OUTER);
            } else if (type === 'L') {
                this.drawStem(g, 'N', W_OUTER);
                this.drawStem(g, 'E', W_OUTER);
            } else if (type === 'T') {
                this.drawStem(g, 'W', W_OUTER);
                this.drawStem(g, 'N', W_OUTER);
                this.drawStem(g, 'E', W_OUTER);
            } else if (type === '+') {
                this.drawStem(g, 'N', W_OUTER);
                this.drawStem(g, 'E', W_OUTER);
                this.drawStem(g, 'S', W_OUTER);
                this.drawStem(g, 'W', W_OUTER);
            }
        }
        // 2. Terminal Bulb (Type '1') - Base connects NORTH
        else if (type === '1') {
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

            this.drawStem(g, 'N', W_OUTER);
        }
        // 3. Straight Pipe (Type 'I') - Base connects NORTH and SOUTH
        else if (type === 'I') {
            const path = document.createElementNS(this.svgNS, 'path');
            path.setAttribute('d', `
                M 34 0 L 34 100
                M 66 0 L 66 100
            `);
            path.setAttribute('class', 'pipe-line');
            g.appendChild(path);
        }
        // 4. Elbow / Corner (Type 'L') - Base connects NORTH and EAST
        else if (type === 'L') {
            const path = document.createElementNS(this.svgNS, 'path');
            path.setAttribute('d', `
                M 34 0 A 66 66 0 0 0 100 66
                M 66 0 A 34 34 0 0 0 100 34
            `);
            path.setAttribute('class', 'pipe-line');
            g.appendChild(path);
        }
        // 5. T-Junction (Type 'T') - Base connects WEST, NORTH, EAST
        else if (type === 'T') {
            const path = document.createElementNS(this.svgNS, 'path');
            path.setAttribute('d', `
                M 0 66 L 100 66
                M 0 34 A 34 34 0 0 1 34 0
                M 66 0 A 34 34 0 0 1 100 34
            `);
            path.setAttribute('class', 'pipe-line');
            g.appendChild(path);
        }
        // 6. Cross (Type '+') - Base connects all 4 directions
        else if (type === '+') {
            const path = document.createElementNS(this.svgNS, 'path');
            path.setAttribute('d', `
                M 0 34 A 34 34 0 0 1 34 0
                M 66 0 A 34 34 0 0 1 100 34
                M 100 66 A 34 34 0 0 1 66 100
                M 34 100 A 34 34 0 0 1 0 66
            `);
            path.setAttribute('class', 'pipe-line');
            g.appendChild(path);
        }

        svg.appendChild(g);
        return svg;
    }

    /**
     * Draw straight connection stems for Hubs and Bulbs
     */
    drawStem(g, dir, w) {
        const path = document.createElementNS(this.svgNS, 'path');
        let d = '';
        if (dir === 'N') {
            d = `M 34 0 L 34 30 M 66 0 L 66 30`;
        } else if (dir === 'E') {
            d = `M 70 34 L 100 34 M 70 66 L 100 66`;
        } else if (dir === 'S') {
            d = `M 34 70 L 34 100 M 66 70 L 66 100`;
        } else if (dir === 'W') {
            d = `M 0 34 L 30 34 M 0 66 L 30 66`;
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
