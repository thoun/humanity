/**
 * Your game interfaces
 */

interface Card {
    id: number;
    location: string;
    locationArg: number;
    color: number;
    gain: number;
}

interface Research {
    id: number;
    location: string;
    locationArg: number;
    year: number;
    number: number;
    extremity: number;
    cost: number[];
    researchPoints: number;
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

interface HumanityPlayer extends Player {
    playerNo: number;
    objectives: Objective[];
    
    // TODO check
    research: number;
    recruit: number;
    bracelet: number;
    //handCount: number;
    hand?: Card[];
    playedCards: { [color: number]: Card[] };
    research: Research[];
    reservedDestinations?: Research[];
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

    // TODO check
    cardDeckTop?: Card;
    cardDeckCount: number;
    cardDiscardCount: number;
    centerCards: Card[];
    //centerDestinationsDeckTop: { [letter: string]: Research };
    //centerDestinationsDeckCount: { [letter: string]: number };
    tableResearch: Research[];
    objectives?: number[];
    firstPlayerId: number;
    lastTurn: boolean;
}

interface HumanityGame extends Game {
    cardsManager: CardsManager;
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

    setTooltip(id: string, html: string): void;
    highlightPlayerTokens(playerId: number | null): void;
    onTableDestinationClick(research: Research): void;
    onHandCardClick(card: Card): void;
    onTableCardClick(card: Card): void;
    onPlayedCardClick(card: Card): void;
}

interface EnteringPlayActionArgs {
    canRecruit: boolean;
    canExplore: boolean;
    canTrade: boolean;
    possibleDestinations: Research[];
}

interface EnteringChooseNewCardArgs {
    centerCards: Card[];
    freeColor: number;
    recruits: number;
    allFree: boolean;
}

interface EnteringPayDestinationArgs {
    selectedDestination: Research;
    recruits: number;
}

interface EnteringTradeArgs {
    bracelets: number;
    gainsByBracelets: { [bracelets: number]: number };
}

// playCard
interface NotifPlayCardArgs {
    playerId: number;
    card: Card;
    newHandCard: Card;
    effectiveGains: { [type: number]: number };
}

// card
interface NotifNewCardArgs {
    playerId: number;
    card: Card;
    cardDeckTop?: Card;
    cardDeckCount: number;
}

// takeDestination
interface NotifTakeDestinationArgs {
    playerId: number;
    research: Research;
    effectiveGains: { [type: number]: number };
}

// newTableDestination
interface NotifNewTableDestinationArgs {
    research: Research;
    letter: string;    
    researchDeckTop?: Research;
    researchDeckCount: number;
}

// trade
interface NotifTradeArgs {
    playerId: number;
    effectiveGains: { [type: number]: number };
}

// discardCards
interface NotifDiscardCardsArgs {
    playerId: number;
    cards: Card[];
    cardDiscardCount: number;
}

// discardTableCard
interface NotifDiscardTableCardArgs {
    card: Card;
}

// reserveDestination
interface NotifReserveDestinationArgs {
    playerId: number;
    research: Research;
}

// score
interface NotifScoreArgs {
    playerId: number;
    newScore: number;
    incScore: number;
}

// cardDeckReset
interface NotifCardDeckResetArgs {  
    cardDeckTop?: Card;
    cardDeckCount: number;
    cardDiscardCount: number;
}
