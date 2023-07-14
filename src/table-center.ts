class TableCenter {
    public research: SlotStock<Research>;
    public tiles: SlotStock<Tile>;
        
    constructor(private game: HumanityGame, gamedatas: HumanityGamedatas) {
        /*this.researchDecks = new Deck<Destination>(game.researchManager, document.getElementById(`table-research-${letter}-deck`), {
            cardNumber: gamedatas.centerDestinationsDeckCount,
            topCard: gamedatas.centerDestinationsDeckTop,
            counter: {
                position: 'right',
            },
        });*/
        this.research = new SlotStock<Research>(game.researchManager, document.getElementById(`table-research`), {
            slotsIds: [0, 1, 2, 3, 4, 5, 6, 7],
            mapCardToSlot: card => card.locationArg,
        });
        this.research.addCards(gamedatas.tableResearch);
        this.research.onCardClick = (card: Research) => this.game.onTableResearchClick(card);

        this.tiles = new SlotStock<Tile>(game.tilesManager, document.getElementById(`table-tiles`), {
            slotsIds: [0, 1, 2, 3, 4, 5, 6, 7],
            mapCardToSlot: card => card.locationArg,
            gap: '12px',
        });
        this.tiles.onCardClick = card => this.game.onTableTileClick(card);
        this.tiles.addCards(gamedatas.tableTiles);

        const tableWorkers = document.getElementById('table-workers');
        tableWorkers.insertAdjacentHTML('beforeend', 
            [0, 1, 2, 3, 4, 5, 6, 7].map(spot => `<div></div><div class="slot" data-slot-id="${spot}"></div>`).join('')
        );

        Object.values(gamedatas.players).forEach(player => player.workers.filter(worker => worker.location == 'table').forEach(worker => 
            tableWorkers.querySelector(`.slot[data-slot-id="${worker.spot}"]`).appendChild(this.game.createWorker(worker))
        ));

        this.moveArm(gamedatas.arm);
    }
    
    public moveWorker(worker: Worker): void {
        const tableWorkers = document.getElementById('table-workers');
        tableWorkers.querySelector(`.slot[data-slot-id="${worker.spot}"]`).appendChild(
            document.getElementById(`worker-${worker.id}`)
        );
    }
    
    public removeTile(tile: Tile) {
        this.tiles.removeCard(tile);
    }
    
    public shiftTile(tile: Tile) {
        this.tiles.addCard(tile);
    }
    
    public moveArm(arm: number) {
        document.getElementById('board-2').style.setProperty('--r', `${arm}`);
    }
}