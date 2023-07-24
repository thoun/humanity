class TableCenter {
    public research: SlotStock<Research>;
    public modules: SlotStock<Module>;
        
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

        this.modules = new SlotStock<Module>(game.modulesManager, document.getElementById(`table-modules`), {
            slotsIds: [0, 1, 2, 3, 4, 5, 6, 7],
            mapCardToSlot: card => card.locationArg,
            gap: '12px',
        });
        this.modules.onCardClick = card => this.game.onTableModuleClick(card);
        this.modules.addCards(gamedatas.tableModules);

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
        const workerDiv = document.getElementById(`worker-${worker.id}`);
        workerDiv.classList.remove('selectable', 'selected');

        const tableWorkers = document.getElementById('table-workers');
        tableWorkers.querySelector(`.slot[data-slot-id="${worker.spot}"]`).appendChild(workerDiv);
    }
    
    public removeModule(module: Module) {
        this.modules.removeCard(module);
    }
    
    public shiftModule(module: Module): Promise<any> {
        return this.modules.addCard(module);
    }
    
    public newModule(module: Module): Promise<any> {
        return this.modules.addCard(module);
    }
    
    public moveArm(arm: number) {
        document.getElementById('board-2').style.setProperty('--r', `${arm}`);
    }
    
    public newResearch(tableResearch: Research[]) {
        this.research.removeAll();
        this.research.addCards(tableResearch);
    }
    
    public setSelectableModules(selectableModules: Module[] | null) {
        this.modules.setSelectionMode(selectableModules ? 'single' : 'none', selectableModules);
    }
    
    public setSelectableResearch(selectableResearch: Research[] | null) {
        this.research.setSelectionMode(selectableResearch ? 'single' : 'none', selectableResearch);
    }
    
    public resetModules(modules: Module[]) {
        this.modules.removeAll();
        this.modules.addCards(modules);
    }
}