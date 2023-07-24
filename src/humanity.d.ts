/**
 * Your game interfaces
 */

interface Module {
    id: number;
    location: string;
    locationArg: number;
    type: number;
    number: number;
    x: number;
    y: number;
    r: number;
    color: number;
    cost: { [type: number]:number };
    workforce?: number;
    production: { [type: number]:number }[];
    adjacentResearchPoints: number;
    researchPoints: number;
    points: number;
    matchType: number;
}

interface Research {
    id: number;
    location: string;
    locationArg: number;
    year: number;
    number: number;
    extremity: number;
    cost: number[];
    sciencePoints: number;
    effect?: number;
    points: number;
    line?: number;
}

interface Objective {
    id: number;
    location: string;
    locationArg: number;
    type: number;
    number: number;
    minimum: number;
    color?: number;
    adjacent?: boolean;
    direction?: number;
    sameColor?: boolean;
    baseType?: number;
    extremity?: number;
}

interface Worker {
    id: number;
    playerId: number;
    workforce: number;
    remainingWorkforce: number;
    location: string;
    x: number;
    y: number;
    spot: number; // table spot
}

type Icons = { [type: number]: number };

interface HumanityPlayer extends Player {
    playerNo: number;
    
    workers: Worker[];
    modules: Module[];
    research: Research[];
    researchPoints: number;
    vp: number;
    science?: number;
    objectives: Objective[];

    icons: Icons;
}

interface HumanityGamedatas {
    current_player_id: string;
    decision: {decision_type: string};
    game_result_neutralized: string;
    gamestate: Gamestate;
    gamestates: { [gamestateId: number]: Gamestate };
    neutralized_player_id: string;
    notifications: {last_packet_id: string, move_nbr: string}
    playerorder: (string | number)[];
    players: { [playerId: number]: HumanityPlayer };
    tablespeed: string;

    // Add here variables you set up in getAllDatas
    tableModules: Module[];
    tableResearch: Research[];
    tableObjectives: Objective[];
    arm: number;
    year: number;
    firstPlayerId: number;
    isEnd: boolean;

    movedWorkers?: Worker[];
}

interface HumanityGame extends Game {
    modulesManager: ModulesManager;
    researchManager: DestinationsManager;
    objectivesManager: ObjectivesManager;

    getPlayerId(): number;
    getPlayer(playerId: number): HumanityPlayer;
    getColor(color: number, blueOrOrange: boolean): string;
    getGameStateName(): string;
    getCurrentPlayerTable(): PlayerTable | null;
    createWorker(worker: Worker): HTMLDivElement;

    setTooltip(id: string, html: string): void;
    onTableResearchClick(research: Research): void;
    onPlayerModuleClick(card: Module): void;
    onPlayerModuleSpotClick(x: number, y: number): void;
    onTableModuleClick(card: Module): void;
}

interface EnteringChooseWorkerArgs {
    workers: Worker[];
}

interface EnteringChooseActionArgs extends EnteringChooseWorkerArgs {
    selectableModules: Module[];
    selectableResearch: Research[];
}

interface EnteringPayArgs {
    cost: Icons;
    pay: Icons;
}

interface EnteringActivateModuleArgs {
    worker: Worker;
    activatableModules: Module[];
}

interface EnteringMoveWorkerArgs {
    worker: Worker;
    possibleCoordinates: number[][];
}

interface NotifFirstPlayerTokenArgs {
    playerId: number;
}

// activateModule, pay
interface NotifRotateModuleArgs {
    playerId: number;
    module: Module;
}

// removeModule
interface NotifRemoveModuleArgs {
    playerId: number;
    module: Module;
}

// disableWorker, upgradeWorker
interface NotifWorkerArgs {
    playerId: number;
    worker: Worker;
}

// gainTimeUnit
interface NotifGainTimeUnitArgs {
    playerId: number;
    workers: Worker[];
}

// moveWorkerToTable
interface NotifMoveWorkerToTableArgs {
    playerId: number;
    worker: Worker;
}

// deployModule
interface NotifDeployModuleArgs {
    playerId: number;
    module: Module;
}

// deployResearch
interface NotifDeployResearchArgs {
    playerId: number;
    research: Research;
}

// score, researchPoints, science
interface NotifScoreArgs {
    playerId: number;
    new: number;
    inc: number;
    private?: boolean;
}

// newFirstPlayer
interface NotifNewFirstPlayerArgs {
    playerId: number;
}  

// removeTableModule, shiftTableModule, newTableModule
interface NotifTableModuleArgs {
    module: Module;
}

// moveArm
interface NotifMoveArmArgs {
    arm: number;
}

// newTableResearch
interface NotifNewTableResearchArgs {
    tableResearch: Research[];
}

// reactivateWorkers
interface NotifReactivateWorkersArgs {
    playerId: number | null;
}

// year
interface NotifYearArgs {
    year: number | string;
}

// gainObjective
interface NotifGainObjectiveArgs {
    playerId: number;
    objective: Objective;
    fromPlayerId: number | null;
}

interface Undo {
    modules: Module[];
    research: Research[];
    workers: Worker[];
    vp: number;
    researchPoints: number;
    science: number;
    tableModules: Module[];
    tableResearch: Research[];
    allObjectives: Objective[];
}

// restartTurn
interface NotifRestartTurnArgs {
    playerId: number;
    undo: Undo;
}

// moveWorker
interface NotifMoveWorkerArgs {
    playerId: number;
    worker: Worker;
    toConfirm: boolean;
}

// confirmMoveWorkers
interface NotifConfirmMoveWorkersArgs {
    playerId: number;
    workers: Worker[];
}

