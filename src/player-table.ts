const isDebug = window.location.host == 'studio.boardgamearena.com' || window.location.hash.indexOf('debug') > -1;;
const log = isDebug ? console.log.bind(window.console) : function () { };

class PlayerTable {
    public playerId: number;
    public voidStock: VoidStock<Tile>;
    public tiles: SlotStock<Tile>;
    public researchLines: SlotStock<Research>[] = [];
    public objectives: LineStock<Objective>;

    private currentPlayer: boolean;

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

        const slotsIds = [];
        const xs = player.tiles.map(tile => tile.x);
        const ys = player.tiles.map(tile => tile.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                slotsIds.push(`${x}_${y}`);
            }
        }
        const tilesDiv = document.getElementById(`player-table-${this.playerId}-tiles`);
        tilesDiv.style.setProperty('--rows', `${maxX - minX + 1}`);
        tilesDiv.style.setProperty('--columns', `${maxY - minY + 1}`);
        this.tiles = new SlotStock<Tile>(this.game.tilesManager, tilesDiv, {
            slotsIds,
            mapCardToSlot: tile => `${tile.x}_${tile.y}`,
        });
        this.tiles.onCardClick = (card: Tile) => this.game.onPlayerTileClick(card);
        
        this.tiles.addCards(player.tiles);
        player.tiles.filter(tile => tile.type == 9).forEach(tile => this.game.tilesManager.getCardElement(tile).dataset.playerColor = player.color);

        this.voidStock = new VoidStock<Tile>(this.game.tilesManager, document.getElementById(`player-table-${this.playerId}-name`));
          
        player.research.forEach(researchTile => this.addResearch(researchTile));
        
        const objectiveDiv = document.getElementById(`player-table-${this.playerId}-objective`);
        this.objectives = new LineStock<Objective>(this.game.objectivesManager, objectiveDiv);
        this.objectives.addCards(player.objectives);

        player.workers.filter(worker => worker.location == 'player').forEach(worker => {
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
}