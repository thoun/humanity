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
    vp?: number;
    color: number;
    cost: { [type: number]:number };
    workforce?: number;
    production: number[];
    adjacentResearchPoints: number;
    researchPoints: number;
    points: number;
    matchType: number;
}

interface Experiment {
    id: number;
    location: string;
    locationArg: number;
    year: number;
    number: number;
    side: number;
    cost: number[];
    researchPoints: number;
    effect?: number;
    points: number;
    line?: number;
}

interface Mission {
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
    side?: number;
    diagonal?: boolean;
}

interface Astronaut {
    id: number;
    playerId: number;
    workforce: number;
    remainingWorkforce: number;
    location: string;
    x: number;
    y: number;
    spot: number; // table spot
}

type Icons = { [type: string]: number };

interface Square {
    x: number; 
    y: number;
}

interface PlayerEndScoreSummary {
    remainingResources: number;
    squares: number;
    greenhouses: number;
    experiments: number;
    missions: number;
    modules: number;
    scienceByYear: number[];
    total: number;
}

interface HumanityPlayer extends Player {
    playerNo: number;
    
    astronauts: Astronaut[];
    modules: Module[];
    experiments: Experiment[];
    researchPoints: number;
    vp: number;
    science?: number;
    missions: Mission[];
    squares: Square[];

    icons: Icons;

    endScoreSummary?: PlayerEndScoreSummary;
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
    tableExperiments: Experiment[];
    tableMissions: Mission[];
    moduleDeckCounts: { [year: number]: number };
    moduleDeckTopCard: { [year: number]: Module };
    arm: number;
    year: number;
    inYearProgress: number;
    firstPlayerId: number;
    isEnd: boolean;

    movedAstronauts?: Astronaut[];
}

interface HumanityGame extends Game {
    astronautsManager: AstronautsManager;
    modulesManager: ModulesManager;
    experimentsManager: ExperimentsManager;
    missionsManager: MissionsManager;

    getPlayerId(): number;
    getPlayer(playerId: number): HumanityPlayer;
    getColor(color: number, blueOrOrange: boolean): string;
    getPower(power: number, timeUnits: number): string;
    getSide(side: number): string;
    getGameStateName(): string;
    getCurrentPlayerTable(): PlayerTable | null;
    getPlayerTable(playerId: number): PlayerTable;

    setTooltip(id: string, html: string): void;
    onTableExperimentClick(experiment: Experiment): void;
    onPlayerModuleClick(card: Module): void;
    onPlayerModuleSpotClick(x: number, y: number): void;
    onTableModuleClick(card: Module): void;
    onAstronautClick(astronaut: Astronaut): void;
    pay(id: number, resource: number): void;
}

interface EnteringChooseAstronautArgs {
    astronauts: Astronaut[];
}

interface EnteringAstronautArgs {
    astronaut: Astronaut;
}

interface EnteringChooseActionArgs extends EnteringActivateModuleArgs {
    selectableModules: Module[];
    selectableExperiments: Experiment[];
}

interface EnteringPayArgs extends EnteringAstronautArgs {
    cost: Icons;
    autoPay: Icons | null;
    payButtons: { [tileId: number]: number[] };
}

interface EnteringActivateModuleArgs extends EnteringAstronautArgs {
    activatableModules: Module[];
    timeUnitUseful: boolean;
    reactivatableAstronauts: boolean;
}

interface EnteringMoveAstronautArgs extends EnteringAstronautArgs {
    astronaut: Astronaut;
    possibleCoordinates: number[][];
    canUndo: boolean;
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

// disableAstronaut, upgradeAstronaut
interface NotifAstronautArgs {
    playerId: number;
    astronaut: Astronaut;
}

// gainTimeUnit
interface NotifGainTimeUnitArgs {
    playerId: number;
    astronauts: Astronaut[];
}

// moveAstronautToTable
interface NotifMoveAstronautToTableArgs {
    playerId: number;
    astronaut: Astronaut;
}

// deployModule
interface NotifDeployModuleArgs {
    playerId: number;
    module: Module;
}

// addSquares
interface NotifAddSquaresArgs {
    playerId: number;
    squares: Square[];
}

// deployExperiment
interface NotifDeployExperimentArgs {
    playerId: number;
    experiment: Experiment;
}

// score, researchPoints, science
interface NotifScoreArgs {
    playerId: number;
    new: number;
    inc: number;
    private?: boolean;
}

// endScore
interface NotifEndScoreArgs {
    playerId: number;
    field: string;
    endScoreSummary: PlayerEndScoreSummary;
}

// newFirstPlayer
interface NotifNewFirstPlayerArgs {
    playerId: number;
}  

// removeTableModule, shiftTableModule
interface NotifTableModuleArgs {
    module: Module;
}

//  newTableModule
interface NotifNewTableModuleArgs extends NotifTableModuleArgs {
    year: number;
    inYearProgress: number;
    moduleDeckCount: number;
    moduleDeckTopCard: Module;
}

// moveArm
interface NotifMoveArmArgs {
    arm: number;
    diff: number | string;
}

// newTableExperiments
interface NotifNewTableExperimentArgs {
    tableExperiments: Experiment[];
}

// reactivateAstronauts
interface NotifReactivateAstronautsArgs {
    playerId: number | null;
}

// year
interface NotifYearArgs {
    year: number | string;
    inYearProgress: number;
}

// gainMission
interface NotifGainMissionArgs {
    playerId: number;
    mission: Mission;
    fromPlayerId: number | null;
}

interface Undo {
    modules: Module[];
    experiments: Experiment[];
    astronauts: Astronaut[];
    vp: number;
    researchPoints: number;
    science: number;
    tableModules: Module[];
    tableExperiments: Experiment[];
    allMissions: Mission[];
    squares: Square[];
}

// restartTurn
interface NotifRestartTurnArgs {
    playerId: number;
    undo: Undo;
}

// moveAstronaut
interface NotifMoveAstronautArgs {
    playerId: number;
    astronaut: Astronaut;
    toConfirm: boolean;
}

// confirmMoveAstronauts
interface NotifConfirmMoveAstronautsArgs {
    astronauts: Astronaut[];
}

