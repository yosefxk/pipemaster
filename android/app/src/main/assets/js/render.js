/**
 * SVG Pipe Tile Renderer
 * Generates crisp 90° pipe graphics, source hubs, terminal bulbs,
 * color-coded glowing portal pairs, and lightbulb hint badges.
 */

class PipeRenderer {
    constructor() {
        this.svgNS = "http://www.w3.org/2000/svg";
    }

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

    createTileElement(tile, engine) {
        const div = document.createElement('div');
        div.className = 'pipe-tile';
        div.setAttribute('data-row', tile.row);
        div.setAttribute('data-col', tile.col);
        
        if (tile.isSource) div.classList.add('is-source');
        if (tile.isFlowing) div.classList.add('is-flowing');
        if (tile.isHintLocked) div.classList.add('is-locked');
        if (tile.canonicalType === '0') div.classList.add('is-empty');

        // Color-Coded Portal Badge & Glow
        if (tile.portalInfo) {
            div.classList.add('is-portal');
            div.style.setProperty('--portal-color', tile.portalInfo.color);
            div.style.setProperty('--portal-glow', tile.portalInfo.glow);

            const portalBadge = document.createElement('div');
            portalBadge.className = 'portal-badge';
            portalBadge.style.borderColor = tile.portalInfo.color;
            portalBadge.style.color = tile.portalInfo.color;
            portalBadge.style.boxShadow = `0 0 8px ${tile.portalInfo.glow}`;
            portalBadge.textContent = tile.portalInfo.label;
            div.appendChild(portalBadge);
        }

        // SVG Pipe Conduit Layer
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

        return div;
    }

    updateTileElement(div, tile, engine) {
        div.classList.toggle('is-flowing', tile.isFlowing);
        div.classList.toggle('is-locked', tile.isHintLocked);

        const svg = div.querySelector('.pipe-svg');
        if (svg) {
            svg.style.transform = `rotate(${tile.rotationAngle}deg)`;
        }
    }

    generateTileSVG(tile) {
        const svg = document.createElementNS(this.svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('class', 'pipe-svg');
        svg.style.transform = `rotate(${tile.rotationAngle}deg)`;

        const g = document.createElementNS(this.svgNS, 'g');
        g.setAttribute('class', 'pipe-group');

        const type = tile.canonicalType;

        // 1. Source Hub Base
        if (tile.isSource) {
            const hub = document.createElementNS(this.svgNS, 'circle');
            hub.setAttribute('cx', '50');
            hub.setAttribute('cy', '50');
            hub.setAttribute('r', '20');
            hub.setAttribute('class', 'pipe-source-hub');
            g.appendChild(hub);

            const hubInner = document.createElementNS(this.svgNS, 'circle');
            hubInner.setAttribute('cx', '50');
            hubInner.setAttribute('cy', '50');
            hubInner.setAttribute('r', '8');
            hubInner.setAttribute('class', 'pipe-source-core');
            g.appendChild(hubInner);

            if (type === '1') {
                this.drawStem(g, 'N');
            } else if (type === 'I') {
                this.drawStem(g, 'N');
                this.drawStem(g, 'S');
            } else if (type === 'L') {
                this.drawStem(g, 'N');
                this.drawStem(g, 'E');
            } else if (type === 'T') {
                this.drawStem(g, 'W');
                this.drawStem(g, 'N');
                this.drawStem(g, 'E');
            } else if (type === '+') {
                this.drawStem(g, 'N');
                this.drawStem(g, 'E');
                this.drawStem(g, 'S');
                this.drawStem(g, 'W');
            }
        }
        // 2. Terminal Bulb (Type '1') - Base connects NORTH
        else if (type === '1') {
            const bulbOuter = document.createElementNS(this.svgNS, 'circle');
            bulbOuter.setAttribute('cx', '50');
            bulbOuter.setAttribute('cy', '50');
            bulbOuter.setAttribute('r', '18');
            bulbOuter.setAttribute('class', 'pipe-bulb-outer');
            g.appendChild(bulbOuter);

            const bulbInner = document.createElementNS(this.svgNS, 'circle');
            bulbInner.setAttribute('cx', '50');
            bulbInner.setAttribute('cy', '50');
            bulbInner.setAttribute('r', '7');
            bulbInner.setAttribute('class', 'pipe-bulb-inner');
            g.appendChild(bulbInner);

            this.drawStem(g, 'N');
        }
        // 3. Straight Pipe (Type 'I') - Base connects NORTH and SOUTH
        else if (type === 'I') {
            const path = document.createElementNS(this.svgNS, 'path');
            path.setAttribute('d', `
                M 36 0 L 36 100
                M 64 0 L 64 100
            `);
            path.setAttribute('class', 'pipe-line');
            g.appendChild(path);
        }
        // 4. Elbow / Corner (Type 'L') - Tight 90° bend connecting NORTH and EAST
        else if (type === 'L') {
            const path = document.createElementNS(this.svgNS, 'path');
            path.setAttribute('d', `
                M 36 0 L 36 30 A 34 34 0 0 0 70 64 L 100 64
                M 64 0 L 64 30 A 6 6 0 0 0 70 36 L 100 36
            `);
            path.setAttribute('class', 'pipe-line');
            g.appendChild(path);
        }
        // 5. T-Junction (Type 'T') - Base connects WEST, NORTH, EAST
        else if (type === 'T') {
            const path = document.createElementNS(this.svgNS, 'path');
            path.setAttribute('d', `
                M 0 64 L 100 64
                M 0 36 L 30 36 A 6 6 0 0 0 36 30 L 36 0
                M 64 0 L 64 30 A 6 6 0 0 0 70 36 L 100 36
            `);
            path.setAttribute('class', 'pipe-line');
            g.appendChild(path);
        }
        // 6. Cross (Type '+') - Base connects all 4 directions
        else if (type === '+') {
            const path = document.createElementNS(this.svgNS, 'path');
            path.setAttribute('d', `
                M 0 36 L 30 36 A 6 6 0 0 0 36 30 L 36 0
                M 64 0 L 64 30 A 6 6 0 0 0 70 36 L 100 36
                M 100 64 L 70 64 A 6 6 0 0 0 64 70 L 64 100
                M 36 100 L 36 70 A 6 6 0 0 0 30 64 L 0 64
            `);
            path.setAttribute('class', 'pipe-line');
            g.appendChild(path);
        }

        svg.appendChild(g);
        return svg;
    }

    drawStem(g, dir) {
        const path = document.createElementNS(this.svgNS, 'path');
        let d = '';
        if (dir === 'N') {
            d = `M 36 0 L 36 32 M 64 0 L 64 32`;
        } else if (dir === 'E') {
            d = `M 68 36 L 100 36 M 68 64 L 100 64`;
        } else if (dir === 'S') {
            d = `M 36 68 L 36 100 M 64 68 L 64 100`;
        } else if (dir === 'W') {
            d = `M 0 36 L 32 36 M 0 64 L 32 64`;
        }
        path.setAttribute('d', d);
        path.setAttribute('class', 'pipe-line stem');
        g.appendChild(path);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PipeRenderer };
}
