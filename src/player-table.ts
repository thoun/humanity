const isDebug = window.location.host == 'studio.boardgamearena.com' || window.location.hash.indexOf('debug') > -1;;
const log = isDebug ? console.log.bind(window.console) : function () { };

class TileStock extends SlotStock<Tile> {
    constructor(protected game: HumanityGame, protected element: HTMLElement, slotsIds: string[]) {
        super(game.tilesManager, element, {
            slotsIds,
            mapCardToSlot: tile => `${tile.x}_${tile.y}`,
        });
    }

    public addSlotsIds(newSlotsIds: SlotId[]) {
        if (newSlotsIds.length == 0) {
            // no change
            return;
        }

        this.slotsIds.push(...newSlotsIds);
        newSlotsIds.forEach(slotId => {
            this.createSlot(slotId);
        });
    }

    protected createSlot(slotId: SlotId) {
        super.createSlot(slotId);
        const coordinates = (slotId as string).split('_').map(val => Number(val));
        this.slots[slotId].style.setProperty('--area', `slot${coordinates[0] * 1000 + coordinates[1]}`);
    }
}

class PlayerTable {
    public playerId: number;
    public voidStock: VoidStock<Tile>;
    public tiles: TileStock;
    public researchLines: SlotStock<Research>[] = [];
    public objectives: LineStock<Objective>;

    private currentPlayer: boolean;
    private tileMinX: number;
    private tileMaxX: number;
    private tileMinY: number;
    private tileMaxY: number;

    constructor(private game: HumanityGame, player: HumanityPlayer) {
        this.playerId = Number(player.id);
        this.currentPlayer = this.playerId == this.game.getPlayerId();

        let html = `
        <div id="player-table-${this.playerId}" class="player-table" style="--player-color: #${player.color};">
            <div id="player-table-${this.playerId}-name" class="name-wrapper">${player.name}</div>
            <div id="player-table-${this.playerId}-tiles" class="tiles"></div>
            <div id="player-table-${this.playerId}-research-lines" class="research-lines"></div>
            <div id="player-table-${this.playerId}-objective" class="objective"></div>
        </div>
        `;

        dojo.place(html, document.getElementById('tables'));

        const playerWorkers = player.workers.filter(worker => worker.location == 'player');

        const slotsIds = [];
        const xs = [...player.tiles.map(tile => tile.x), ...playerWorkers.map(worker => worker.x)];
        const ys = [...player.tiles.map(tile => tile.y), ...playerWorkers.map(worker => worker.y)];
        this.tileMinX = Math.min(...xs);
        this.tileMaxX = Math.max(...xs);
        this.tileMinY = Math.min(...ys);
        this.tileMaxY = Math.max(...ys);
        for (let y = this.tileMinY; y <= this.tileMaxY; y++) {
            for (let x = this.tileMinX; x <= this.tileMaxX; x++) {
                slotsIds.push(`${x}_${y}`);
            }
        }
        const tilesDiv = document.getElementById(`player-table-${this.playerId}-tiles`);
        tilesDiv.style.setProperty('--rows', `${this.tileMaxX - this.tileMinX + 1}`);
        tilesDiv.style.setProperty('--columns', `${this.tileMaxY - this.tileMinY + 1}`);
        this.tiles = new TileStock(this.game, tilesDiv, slotsIds);
        this.updateGridTemplateAreas();
        slotsIds.forEach(slotId => {
            const slotDiv = tilesDiv.querySelector(`[data-slot-id="${slotId}"]`);
            slotDiv.addEventListener('click', () => {
                if (slotDiv.classList.contains('selectable')) {
                    const coordinates = slotId.split('_').map(val => Number(val));
                    this.game.onPlayerTileSpotClick(coordinates[0], coordinates[1]);
                }
            })
        });
        this.tiles.onCardClick = (card: Tile) => this.game.onPlayerTileClick(card);
        
        this.tiles.addCards(player.tiles);
        player.tiles.filter(tile => tile.type == 9).forEach(tile => this.game.tilesManager.getCardElement(tile).dataset.playerColor = player.color);

        this.voidStock = new VoidStock<Tile>(this.game.tilesManager, document.getElementById(`player-table-${this.playerId}-name`));
          
        player.research.forEach(researchTile => this.addResearch(researchTile));
        
        const objectiveDiv = document.getElementById(`player-table-${this.playerId}-objective`);
        this.objectives = new LineStock<Objective>(this.game.objectivesManager, objectiveDiv);
        this.objectives.addCards(player.objectives);

        playerWorkers.forEach(worker => {
            tilesDiv.querySelector(`[data-slot-id="${worker.x}_${worker.y}"]`).appendChild(this.game.createWorker(worker));
            if (!worker.remainingWorkforce) {
                document.getElementById(`worker-${worker.id}`).classList.add('disabled-worker');
            }
        });
    }
    
    public setSelectableWorkers(workers: Worker[]) {
        document.getElementById(`player-table-${this.playerId}-tiles`).querySelectorAll('.worker').forEach((worker: HTMLDivElement) => 
            worker.classList.toggle('selectable', workers.some(w => w.id == Number(worker.dataset.id)))
        );
    }
    
    public activateTile(tile: Tile) {
        const tileDiv = this.game.tilesManager.getCardElement(tile);
        tileDiv.dataset.r = `${tile.r}`;
    }
    
    public addTile(tile: Tile): Promise<any> {
        return this.tiles.addCard(tile);
    }
    
    public removeTile(tile: Tile) {
        this.tiles.removeCard(tile);
    }

    private createResearchLine(line: number) {
        const lineDiv = document.createElement('div');
        document.getElementById(`player-table-${this.playerId}-research-lines`).insertAdjacentElement('beforeend', lineDiv);        
        this.researchLines[line] = new SlotStock<Research>(this.game.researchManager, lineDiv, {
            gap: '0',
            slotsIds: [1, 2, 3],
            mapCardToSlot: card => card.extremity,
        });
    }
    
    public addResearch(research: Research): Promise<any> {
        if (!this.researchLines[research.line]) {
            this.createResearchLine(research.line);
        }
        return this.researchLines[research.line].addCard(research);
    }
    
    public reactivateWorkers(): void {
        document.getElementById(`player-table-${this.playerId}-tiles`).querySelectorAll('.worker').forEach((worker: HTMLDivElement) => 
            worker.classList.remove('disabled-worker')
        );
    }

    public updateGridTemplateAreas() {
        const tilesDiv = document.getElementById(`player-table-${this.playerId}-tiles`);

        const linesAreas = [];
        for (let y = this.tileMinY; y <= this.tileMaxY; y++) {
            const lineAreas = [];
            for (let x = this.tileMinX; x <= this.tileMaxX; x++) {
                lineAreas.push(`slot${x * 1000 + y}`);
            }
            linesAreas.push(lineAreas.join(' '));
        }

        tilesDiv.style.gridTemplateAreas = linesAreas.map(line => `"${line}"`).join(' ');
    }

    private addLeftCol() {
        this.tileMinX = this.tileMinX - 1;

        const newSlotsIds = [];
        for (let y = this.tileMinY; y <= this.tileMaxY; y++) {
            newSlotsIds.push(`${this.tileMinX}_${y}`);
        }
        this.addNewSlotsIds(newSlotsIds, 'column');
    }

    private addRightCol() {
        this.tileMaxX = this.tileMaxX + 1;

        const newSlotsIds = [];
        for (let y = this.tileMinY; y <= this.tileMaxY; y++) {
            newSlotsIds.push(`${this.tileMaxX}_${y}`);
        }
        this.addNewSlotsIds(newSlotsIds, 'column');
    }

    private addTopRow() {
        this.tileMinY = this.tileMinY - 1;

        const newSlotsIds = [];
        for (let x = this.tileMinX; x <= this.tileMaxX; x++) {
            newSlotsIds.push(`${x}_${this.tileMinY}`);
        }
        this.addNewSlotsIds(newSlotsIds, 'row');
    }

    private addBottomRow() {
        this.tileMaxY = this.tileMaxY + 1;

        const newSlotsIds = [];
        for (let x = this.tileMinX; x <= this.tileMaxX; x++) {
            newSlotsIds.push(`${x}_${this.tileMaxY}`);
        }
        this.addNewSlotsIds(newSlotsIds, 'row');
    }

    private addNewSlotsIds(newSlotsIds: string[], type: 'row' | 'column') {
        const tilesDiv = document.getElementById(`player-table-${this.playerId}-tiles`);
        if (type == 'row') {
            tilesDiv.style.setProperty('--rows', `${this.tileMaxX - this.tileMinX + 1}`);
        } else if (type == 'column') {
            tilesDiv.style.setProperty('--columns', `${this.tileMaxY - this.tileMinY + 1}`);
        }
        this.updateGridTemplateAreas();
        this.tiles.addSlotsIds(newSlotsIds);
        newSlotsIds.forEach(slotId => {
            const slotDiv = tilesDiv.querySelector(`[data-slot-id="${slotId}"]`);
            slotDiv.addEventListener('click', () => {
                if (slotDiv.classList.contains('selectable')) {
                    const coordinates = slotId.split('_').map(val => Number(val));
                    this.game.onPlayerTileSpotClick(coordinates[0], coordinates[1]);
                }
            })
        });
    }
    
    public setSelectableTileSpots(possibleCoordinates: number[][] | null) {
        const tilesDiv = document.getElementById(`player-table-${this.playerId}-tiles`);
        if (possibleCoordinates) {
            possibleCoordinates.forEach(coordinate => {
                while (coordinate[0] < this.tileMinX) {
                    this.addLeftCol();
                }
                while (coordinate[0] > this.tileMaxX) {
                    this.addRightCol();
                }
                while (coordinate[1] < this.tileMinY) {
                    this.addTopRow();
                }
                while (coordinate[1] > this.tileMaxY) {
                    this.addBottomRow();
                }
                tilesDiv.querySelector(`[data-slot-id="${coordinate[0]}_${coordinate[1]}"]`)?.classList.add('selectable');
            });
        } else {
            tilesDiv.querySelectorAll('.slot.selectable').forEach(elem => elem.classList.remove('selectable'))
        }
    }
}