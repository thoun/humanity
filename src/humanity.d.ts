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
    adjacentPoints: number;
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
    location: string;
    x: number;
    y: number;
    spot: number; // table spot
}

interface HumanityPlayer extends Player {
    playerNo: number;
    
    workers: Worker[];
    tiles: Tile[];
    research: Research[];
    researchSpot: number;
    sciencePoints?: number;
    objectives: Objective[];
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
    tableObjectives: Objective[];
    tableTiles: Tile[];

    // TODO check
    cardDeckTop?: Tile;
    cardDeckCount: number;
    cardDiscardCount: number;
    centerCards: Tile[];
    //centerDestinationsDeckTop: { [letter: string]: Research };
    //centerDestinationsDeckCount: { [letter: string]: number };
    tableResearch: Research[];
    objectives?: number[];
    firstPlayerId: number;
    lastTurn: boolean;
}

interface HumanityGame extends Game {
    tilesManager: TilesManager;
    researchManager: DestinationsManager;
    objectivesManager: ObjectivesManager;

    getPlayerId(): number;
    getPlayer(playerId: number): HumanityPlayer;
    //getGain(type: number): string;
    //getColor(color: number): string;
    getTooltipGain(type: number): string;
    getTooltipColor(color: number): string;
    getGameStateName(): string;
    getCurrentPlayerTable(): PlayerTable | null;
    createWorker(worker: Worker): HTMLDivElement;

    setTooltip(id: string, html: string): void;
    onTableResearchClick(research: Research): void;
    onPlayerTileClick(card: Tile): void;
    onTableTileClick(card: Tile): void;
}

interface EnteringChooseWorkerArgs {
    workers: Worker[];
}

interface EnteringChooseActionArgs extends EnteringChooseWorkerArgs {
    // TODO
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