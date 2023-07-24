const isDebug = window.location.host == 'studio.boardgamearena.com' || window.location.hash.indexOf('debug') > -1;;
const log = isDebug ? console.log.bind(window.console) : function () { };

class ModuleStock extends SlotStock<Module> {
    constructor(protected game: HumanityGame, protected element: HTMLElement, slotsIds: string[]) {
        super(game.modulesManager, element, {
            slotsIds,
            mapCardToSlot: module => `${module.x}_${module.y}`,
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
    public voidStock: VoidStock<Module>;
    public modules: ModuleStock;
    public experimentsLines: SlotStock<Experiment>[] = [];
    public missions: LineStock<Mission>;

    private currentPlayer: boolean;
    private moduleMinX: number;
    private moduleMaxX: number;
    private moduleMinY: number;
    private moduleMaxY: number;

    constructor(private game: HumanityGame, player: HumanityPlayer) {
        this.playerId = Number(player.id);
        this.currentPlayer = this.playerId == this.game.getPlayerId();

        let html = `
        <div id="player-table-${this.playerId}" class="player-table" style="--player-color: #${player.color};">
            <div id="player-table-${this.playerId}-name" class="name-wrapper">${player.name}</div>
            <div id="player-table-${this.playerId}-modules" class="modules"></div>
            <div id="player-table-${this.playerId}-experiments-lines" class="experiments-lines"></div>
            <div id="player-table-${this.playerId}-mission" class="mission"></div>
        </div>
        `;

        dojo.place(html, document.getElementById('tables'));

        const playerAstronauts = player.astronauts.filter(astronaut => astronaut.location == 'player');

        const slotsIds = [];
        const xs = [...player.modules.map(module => module.x), ...playerAstronauts.map(astronaut => astronaut.x)];
        const ys = [...player.modules.map(module => module.y), ...playerAstronauts.map(astronaut => astronaut.y)];
        this.moduleMinX = Math.min(...xs);
        this.moduleMaxX = Math.max(...xs);
        this.moduleMinY = Math.min(...ys);
        this.moduleMaxY = Math.max(...ys);
        for (let y = this.moduleMinY; y <= this.moduleMaxY; y++) {
            for (let x = this.moduleMinX; x <= this.moduleMaxX; x++) {
                slotsIds.push(`${x}_${y}`);
            }
        }
        const modulesDiv = document.getElementById(`player-table-${this.playerId}-modules`);
        modulesDiv.style.setProperty('--rows', `${this.moduleMaxX - this.moduleMinX + 1}`);
        modulesDiv.style.setProperty('--columns', `${this.moduleMaxY - this.moduleMinY + 1}`);
        this.modules = new ModuleStock(this.game, modulesDiv, slotsIds);
        this.updateGridTemplateAreas();
        slotsIds.forEach(slotId => {
            const slotDiv = modulesDiv.querySelector(`[data-slot-id="${slotId}"]`);
            slotDiv.addEventListener('click', () => {
                if (slotDiv.classList.contains('selectable')) {
                    const coordinates = slotId.split('_').map(val => Number(val));
                    this.game.onPlayerModuleSpotClick(coordinates[0], coordinates[1]);
                }
            })
        });
        this.modules.onCardClick = (card: Module) => this.game.onPlayerModuleClick(card);
        
        this.modules.addCards(player.modules);
        player.modules.filter(module => module.type == 9).forEach(module => this.game.modulesManager.getCardElement(module).dataset.playerColor = player.color);

        this.voidStock = new VoidStock<Module>(this.game.modulesManager, document.getElementById(`player-table-${this.playerId}-name`));
          
        player.experiments.forEach(experiment => this.addExperiment(experiment));
        
        const missionDiv = document.getElementById(`player-table-${this.playerId}-mission`);
        this.missions = new LineStock<Mission>(this.game.missionsManager, missionDiv);
        this.missions.addCards(player.missions);

        playerAstronauts.forEach(astronaut => {
            modulesDiv.querySelector(`[data-slot-id="${astronaut.x}_${astronaut.y}"]`).appendChild(this.game.createAstronaut(astronaut));
            if (!astronaut.remainingWorkforce) {
                document.getElementById(`astronaut-${astronaut.id}`).classList.add('disabled-astronaut');
            }
        });
    }
    
    public setSelectableAstronauts(astronauts: Astronaut[]) {
        document.getElementById(`player-table-${this.playerId}-modules`).querySelectorAll('.astronaut').forEach((astronaut: HTMLDivElement) => 
            astronaut.classList.toggle('selectable', astronauts.some(w => w.id == Number(astronaut.dataset.id)))
        );
    }
    
    public setSelectedAstronaut(selectedAstronaut: Astronaut) {
        document.getElementById(`player-table-${this.playerId}-modules`).querySelectorAll('.astronaut').forEach((astronaut: HTMLDivElement) => 
            astronaut.classList.toggle('selected', selectedAstronaut?.id == Number(astronaut.dataset.id))
        );
    }
    
    public setSelectableModules(selectableModules: Module[] | null) {
        this.modules.setSelectionMode(selectableModules ? 'single' : 'none', selectableModules);
    }
    
    public rotateModule(module: Module) {
        const moduleDiv = this.game.modulesManager.getCardElement(module);
        moduleDiv.dataset.r = `${module.r}`;
    }
    
    public addModule(module: Module): Promise<any> {
        this.makeSlotForCoordinates(module.x, module.y);
        const promise = this.modules.addCard(module);
        this.game.modulesManager.getCardElement(module).dataset.r = `${module.r}`;

        return promise;
    }
    
    public removeModule(module: Module) {
        this.modules.removeCard(module);
    }

    private createExperimentsLine(line: number) {
        const lineDiv = document.createElement('div');
        document.getElementById(`player-table-${this.playerId}-experiments-lines`).insertAdjacentElement('beforeend', lineDiv);        
        this.experimentsLines[line] = new SlotStock<Experiment>(this.game.experimentsManager, lineDiv, {
            gap: '0',
            slotsIds: [1, 2, 3],
            mapCardToSlot: card => card.extremity,
        });
    }
    
    public addExperiment(experiment: Experiment): Promise<any> {
        if (!this.experimentsLines[experiment.line]) {
            this.createExperimentsLine(experiment.line);
        }
        return this.experimentsLines[experiment.line].addCard(experiment);
    }
    
    public reactivateAstronauts(): void {
        document.getElementById(`player-table-${this.playerId}-modules`).querySelectorAll('.astronaut').forEach((astronaut: HTMLDivElement) => 
            astronaut.classList.remove('disabled-astronaut')
        );
    }

    public updateGridTemplateAreas() {
        const modulesDiv = document.getElementById(`player-table-${this.playerId}-modules`);

        const linesAreas = [];
        for (let y = this.moduleMinY; y <= this.moduleMaxY; y++) {
            const lineAreas = [];
            for (let x = this.moduleMinX; x <= this.moduleMaxX; x++) {
                lineAreas.push(`slot${x * 1000 + y}`);
            }
            linesAreas.push(lineAreas.join(' '));
        }

        modulesDiv.style.gridTemplateAreas = linesAreas.map(line => `"${line}"`).join(' ');
    }

    private addLeftCol() {
        this.moduleMinX = this.moduleMinX - 1;

        const newSlotsIds = [];
        for (let y = this.moduleMinY; y <= this.moduleMaxY; y++) {
            newSlotsIds.push(`${this.moduleMinX}_${y}`);
        }
        this.addNewSlotsIds(newSlotsIds, 'column');
    }

    private addRightCol() {
        this.moduleMaxX = this.moduleMaxX + 1;

        const newSlotsIds = [];
        for (let y = this.moduleMinY; y <= this.moduleMaxY; y++) {
            newSlotsIds.push(`${this.moduleMaxX}_${y}`);
        }
        this.addNewSlotsIds(newSlotsIds, 'column');
    }

    private addTopRow() {
        this.moduleMinY = this.moduleMinY - 1;

        const newSlotsIds = [];
        for (let x = this.moduleMinX; x <= this.moduleMaxX; x++) {
            newSlotsIds.push(`${x}_${this.moduleMinY}`);
        }
        this.addNewSlotsIds(newSlotsIds, 'row');
    }

    private addBottomRow() {
        this.moduleMaxY = this.moduleMaxY + 1;

        const newSlotsIds = [];
        for (let x = this.moduleMinX; x <= this.moduleMaxX; x++) {
            newSlotsIds.push(`${x}_${this.moduleMaxY}`);
        }
        this.addNewSlotsIds(newSlotsIds, 'row');
    }

    private addNewSlotsIds(newSlotsIds: string[], type: 'row' | 'column') {
        const modulesDiv = document.getElementById(`player-table-${this.playerId}-modules`);
        if (type == 'row') {
            modulesDiv.style.setProperty('--rows', `${this.moduleMaxX - this.moduleMinX + 1}`);
        } else if (type == 'column') {
            modulesDiv.style.setProperty('--columns', `${this.moduleMaxY - this.moduleMinY + 1}`);
        }
        this.updateGridTemplateAreas();
        this.modules.addSlotsIds(newSlotsIds);
        newSlotsIds.forEach(slotId => {
            const slotDiv = modulesDiv.querySelector(`[data-slot-id="${slotId}"]`);
            slotDiv.addEventListener('click', () => {
                if (slotDiv.classList.contains('selectable')) {
                    const coordinates = slotId.split('_').map(val => Number(val));
                    this.game.onPlayerModuleSpotClick(coordinates[0], coordinates[1]);
                }
            })
        });
    }

    public makeSlotForCoordinates(x: number, y: number) {
        while (x < this.moduleMinX) {
            this.addLeftCol();
        }
        while (x > this.moduleMaxX) {
            this.addRightCol();
        }
        while (y < this.moduleMinY) {
            this.addTopRow();
        }
        while (y > this.moduleMaxY) {
            this.addBottomRow();
        }
    }
    
    public setSelectableModuleSpots(possibleCoordinates: number[][] | null) {
        const modulesDiv = document.getElementById(`player-table-${this.playerId}-modules`);
        if (possibleCoordinates) {
            possibleCoordinates.forEach(coordinate => {
                this.makeSlotForCoordinates(coordinate[0], coordinate[1]);
                modulesDiv.querySelector(`[data-slot-id="${coordinate[0]}_${coordinate[1]}"]`)?.classList.add('selectable');
            });
        } else {
            modulesDiv.querySelectorAll('.slot.selectable').forEach(elem => elem.classList.remove('selectable'))
        }
    }

    public resetModules(modules: Module[]) {
        this.modules.removeAll(modules);
        this.modules.addCards(modules);
    }

    public resetExperiments(experiments: Experiment[]) {
        document.getElementById(`player-table-${this.playerId}-experiments-lines`).innerHTML = ``;
        this.experimentsLines = [];
        experiments.forEach(experiment => this.addExperiment(experiment));
    }
    
    public resetMissions(missions: Mission[]) {
        this.missions.removeAll();
        this.missions.addCards(missions);
    }

    public addMission(mission: Mission): Promise<any> {
        return this.missions.addCard(mission);
    }
}