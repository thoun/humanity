class TableCenter {
    public experiments: SlotStock<Experiment>;
    public modules: SlotStock<Module>;
        
    constructor(private game: HumanityGame, gamedatas: HumanityGamedatas) {
        this.experiments = new SlotStock<Experiment>(game.experimentsManager, document.getElementById(`table-experiments`), {
            slotsIds: [0, 1, 2, 3, 4, 5, 6, 7],
            mapCardToSlot: card => card.locationArg,
        });
        this.experiments.addCards(gamedatas.tableExperiments);
        this.experiments.onCardClick = (card: Experiment) => this.game.onTableExperimentClick(card);

        this.modules = new SlotStock<Module>(game.modulesManager, document.getElementById(`table-modules`), {
            slotsIds: [0, 1, 2, 3, 4, 5, 6, 7],
            mapCardToSlot: card => card.locationArg,
            gap: '12px',
        });
        this.modules.onCardClick = card => this.game.onTableModuleClick(card);
        this.modules.addCards(gamedatas.tableModules);

        const tableAstronauts = document.getElementById('table-astronauts');
        tableAstronauts.insertAdjacentHTML('beforeend', 
            [0, 1, 2, 3, 4, 5, 6, 7].map(spot => `<div></div><div class="slot" data-slot-id="${spot}"></div>`).join('')
        );

        Object.values(gamedatas.players).forEach(player => player.astronauts.filter(astronaut => astronaut.location == 'table').forEach(astronaut => 
            tableAstronauts.querySelector(`.slot[data-slot-id="${astronaut.spot}"]`).appendChild(this.game.createAstronaut(astronaut))
        ));

        this.moveArm(gamedatas.arm);
    }
    
    public moveAstronaut(astronaut: Astronaut): void {
        const astronautDiv = document.getElementById(`astronaut-${astronaut.id}`);
        astronautDiv.classList.remove('selectable', 'selected');

        const tableAstronauts = document.getElementById('table-astronauts');
        tableAstronauts.querySelector(`.slot[data-slot-id="${astronaut.spot}"]`).appendChild(astronautDiv);
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
    
    public newExperiments(tableExperiments: Experiment[]) {
        this.experiments.removeAll();
        this.experiments.addCards(tableExperiments);
    }
    
    public setSelectableModules(selectableModules: Module[] | null) {
        this.modules.setSelectionMode(selectableModules ? 'single' : 'none', selectableModules);
    }
    
    public setSelectableExperiments(selectableExperiments: Experiment[] | null) {
        this.experiments.setSelectionMode(selectableExperiments ? 'single' : 'none', selectableExperiments);
    }
    
    public resetModules(modules: Module[]) {
        this.modules.removeAll();
        this.modules.addCards(modules);
    }
}