/**
 * Your game interfaces
 */

interface Tile {
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
    adjacentScience: number;
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

type PlayerIcons = { [type: number]: number };

interface HumanityPlayer extends Player {
    playerNo: number;
    
    workers: Worker[];
    tiles: Tile[];
    research: Research[];
    researchSpot: number;
    science?: number;
    objectives: Objective[];

    icons: PlayerIcons;
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
    tableTiles: Tile[];
    tableResearch: Research[];
    tableObjectives: Objective[];
    arm: number;
    year: number;
    firstPlayerId: number;
    isEnd: boolean;
}

interface HumanityGame extends Game {
    tilesManager: TilesManager;
    researchManager: DestinationsManager;
    objectivesManager: ObjectivesManager;

    getPlayerId(): number;
    getPlayer(playerId: number): HumanityPlayer;
    //getColor(color: number): string;
    getTooltipColor(color: number): string;
    getGameStateName(): string;
    getCurrentPlayerTable(): PlayerTable | null;
    createWorker(worker: Worker): HTMLDivElement;

    setTooltip(id: string, html: string): void;
    onTableResearchClick(research: Research): void;
    onPlayerTileClick(card: Tile): void;
    onPlayerTileSpotClick(x: number, y: number): void;
    onTableTileClick(card: Tile): void;
}

interface EnteringChooseWorkerArgs {
    workers: Worker[];
}

interface EnteringChooseActionArgs extends EnteringChooseWorkerArgs {
    // TODO
}

interface EnteringMoveWorkerArgs {
    worker: Worker;
    possibleCoordinates: number[][];
}

interface NotifFirstPlayerTokenArgs {
    playerId: number;
}

// activateTile
interface NotifActivateTileArgs {
    playerId: number;
    tile: Tile;
}

// removeTile
interface NotifRemoveTileArgs {
    playerId: number;
    tile: Tile;
}

// disableWorker
interface NotifDisableWorkerArgs {
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

// deployTile
interface NotifDeployTileArgs {
    playerId: number;
    tile: Tile;
}

// deployResearch
interface NotifDeployResearchArgs {
    playerId: number;
    research: Research;
}

// score, researchSpot, science
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

// removeTableTile, shiftTableTile, newTableTile
interface NotifTableTileArgs {
    tile: Tile;
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
