<?php
/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Humanity implementation : © <Your name here> <Your email address here>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 * 
 * states.inc.php
 *
 * Humanity game states description
 *
 */

/*
   Game state machine is a tool used to facilitate game developpement by doing common stuff that can be set up
   in a very easy way from this configuration file.

   Please check the BGA Studio presentation about game state to understand this, and associated documentation.

   Summary:

   States types:
   _ activeplayer: in this type of state, we expect some action from the active player.
   _ multipleactiveplayer: in this type of state, we expect some action from multiple players (the active players)
   _ game: this is an intermediary state where we don't expect any actions from players. Your game logic must decide what is the next game state.
   _ manager: special type for initial and final state

   Arguments of game states:
   _ name: the name of the GameState, in order you can recognize it on your own code.
   _ description: the description of the current game state is always displayed in the action status bar on
                  the top of the game. Most of the time this is useless for game state with "game" type.
   _ descriptionmyturn: the description of the current game state when it's your turn.
   _ type: defines the type of game states (activeplayer / multipleactiveplayer / game / manager)
   _ action: name of the method to call when this game state become the current game state. Usually, the
             action method is prefixed by "st" (ex: "stMyGameStateName").
   _ possibleactions: array that specify possible player actions on this step. It allows you to use "checkAction"
                      method on both client side (Javacript: this.checkAction) and server side (PHP: self::checkAction).
   _ transitions: the transitions are the possible paths to go from a game state to another. You must name
                  transitions in order to use transition names in "nextState" PHP method, and use IDs to
                  specify the next game state for each transition.
   _ args: name of the method to call to retrieve arguments for this gamestate. Arguments are sent to the
           client side to be used on "onEnteringState" or to set arguments in the gamestate description.
   _ updateGameProgression: when specified, the game progression is updated (=> call to your getGameProgression
                            method).
*/
require_once("modules/php/constants.inc.php");

$basicGameStates = [

    // The initial state. Please do not modify.
    ST_BGA_GAME_SETUP => [
        "name" => "gameSetup",
        "description" => clienttranslate("Game setup"),
        "type" => "manager",
        "action" => "stGameSetup",
        "transitions" => [ "" => ST_START_TURN ]
    ],
   
    // Final state.
    // Please do not modify.
    ST_END_GAME => [
        "name" => "gameEnd",
        "description" => clienttranslate("End of game"),
        "type" => "manager",
        "action" => "stGameEnd",
        "args" => "argGameEnd",
    ],
];

$playerActionsGameStates = [

    ST_PLAYER_CHOOSE_ACTION => [
        "name" => "chooseAction",
        "description" => clienttranslate('${actplayer} must select a worker to activate tiles, or select a tile or research to deploy'),
        "descriptionmyturn" => clienttranslate('${you} must select a worker to activate tiles, or select a tile or research to deploy'),
        "type" => "activeplayer",    
        "args" => "argChooseAction",
        "possibleactions" => [ 
            "chooseWorker",
            "chooseNewTile",
            "chooseNewResearch",
        ],
        "transitions" => [
            "activate" => ST_PLAYER_ACTIVATE_TILE,
            "chooseRadarColor" => ST_PLAYER_CHOOSE_RADAR_COLOR,
            "pay" => ST_PLAYER_PAY,
        ],
    ],

    ST_PLAYER_CHOOSE_RADAR_COLOR => [
        "name" => "chooseRadarColor",
        "description" => clienttranslate('${actplayer} must choose radar color'),
        "descriptionmyturn" => clienttranslate('${you} must choose radar color'),
        "type" => "activeplayer",    
        "possibleactions" => [ 
            "chooseRadarColor",
        ],
        "transitions" => [
            "pay" => ST_PLAYER_PAY,
        ],
    ],

    ST_PLAYER_PAY => [
        "name" => "pay",
        "description" => clienttranslate('${actplayer} must pay ${cost}'),
        "descriptionmyturn" => clienttranslate('${you} must pay ${cost}'),
        "type" => "activeplayer",    
        "args" => "argPay",
        "possibleactions" => [ 
            "autoPay",
        ],
        "transitions" => [
            "next" => ST_PLAYER_CHOOSE_WORKER,
        ],
    ],

    ST_PLAYER_CHOOSE_WORKER => [
        "name" => "chooseWorker",
        "description" => clienttranslate('${actplayer} must choose a worker'),
        "descriptionmyturn" => clienttranslate('${you} must choose a worker'),
        "type" => "activeplayer",    
        "args" => "argChooseWorker",
        "possibleactions" => [ 
            "chooseWorker",
        ],
        "transitions" => [
            "upgrade" => ST_PLAYER_UPGRADE_WORKER,
            "endTurn" => ST_CHECK_OBJECTIVES,
        ],
    ],

    ST_PLAYER_UPGRADE_WORKER => [
        "name" => "upgradeWorker",
        "description" => clienttranslate('${actplayer} must choose a worker to upgrade (${remaining} upgrade(s) remaining)'),
        "descriptionmyturn" => clienttranslate('${you} must choose a worker to upgrade (${remaining} upgrade(s) remaining)'),
        "type" => "activeplayer",    
        "args" => "argUpgradeWorker",
        "action" => "stUpgradeWorkers",
        "possibleactions" => [ 
            "upgradeWorker",
        ],
        "transitions" => [
            "stay" => ST_PLAYER_UPGRADE_WORKER,
            "endTurn" => ST_CHECK_OBJECTIVES,
        ],
    ],

    ST_PLAYER_ACTIVATE_TILE => [
        "name" => "activateTile",
        "description" => clienttranslate('${actplayer} can activate some tiles (${remaining} workforce remaining)'),
        "descriptionmyturn" => clienttranslate('${you} can activate some tiles (${remaining} workforce remaining)'),
        "type" => "activeplayer",
        "args" => "argActivateTile",
        "possibleactions" => [ 
            "activateTile",
            "endTurn",
        ],
        "transitions" => [
            "stay" => ST_PLAYER_ACTIVATE_TILE,
            "endTurn" => ST_CHECK_OBJECTIVES,
        ]
    ],

    ST_PLAYER_CONFIRM_TURN => [
        "name" => "confirmTurn",
        "description" => clienttranslate('${actplayer} must confirm turn'),
        "descriptionmyturn" => clienttranslate('${you} must confirm turn'),
        "type" => "activeplayer",
        "possibleactions" => [ 
            "confirmTurn",
        ],
        "transitions" => [
            "endTurn" => ST_NEXT_PLAYER,
        ]
    ],    

    ST_MULTIPLAYER_MOVE_WORKERS => [
        "name" => "moveWorkers",
        "description" => clienttranslate('Waiting for other players'),
        "descriptionmyturn" => '',
        "type" => "multipleactiveplayer",
        "action" => "stMoveWorkers",
        "initialprivate" => ST_PRIVATE_MOVE_WORKER,
        "possibleactions" => [ ],
        "transitions" => [
            "next" => ST_AFTER_END_ROUND,
        ],
    ],

    ST_PRIVATE_MOVE_WORKER => [
        "name" => "moveWorker",
        "descriptionmyturn" => clienttranslate('Phase 2 : ${you} must choose a place for moved worker'),
        "type" => "private",
        "args" => "argMoveWorker",
        "possibleactions" => [ "moveWorker" ],
        "transitions" => [
            'stay' => ST_PRIVATE_MOVE_WORKER,
            'next' => ST_PRIVATE_CONFIRM_MOVE_WORKERS,
        ],
    ],

    ST_PRIVATE_CONFIRM_MOVE_WORKERS => [
        "name" => "confirmMoveWorkers",
        "descriptionmyturn" => clienttranslate('${you} must confirm moved workers'),
        "type" => "private",
        "possibleactions" => [ "confirmMoveWorkers" ],
        "transitions" => [],
    ],
];

$gameGameStates = [

    ST_START_TURN => [
        "name" => "startTurn",
        "description" => clienttranslate('Scoring research points...'),
        "type" => "game",
        "action" => "stStartTurn",
        "transitions" => [
            "next" => ST_PLAYER_CHOOSE_ACTION,
        ]
    ],

    ST_CHECK_OBJECTIVES => [
        "name" => "checkObjectives",
        "description" => clienttranslate('Checking objectives...'),
        "type" => "game",
        "action" => "stCheckObjectives",
        "transitions" => [
            "next" => ST_PLAYER_CONFIRM_TURN,
        ]
    ],

    ST_NEXT_PLAYER => [
        "name" => "nextPlayer",
        "description" => "",
        "type" => "game",
        "action" => "stNextPlayer",
        "updateGameProgression" => true,
        "transitions" => [
            "nextPlayer" => ST_START_TURN,
            "endRound" => ST_END_ROUND,
        ],
    ],

    ST_END_ROUND => [
        "name" => "endRound",
        "description" => clienttranslate('Update and refill board...'),
        "type" => "game",
        "action" => "stEndRound",
        "transitions" => [
            "moveWorkers" => ST_MULTIPLAYER_MOVE_WORKERS,
            "afterEndRound" => ST_AFTER_END_ROUND,
            "endYear" => ST_END_YEAR,
        ],
    ],

    ST_AFTER_END_ROUND => [
        "name" => "afterEndRound",
        "description" => clienttranslate('Reactivating workers...'),
        "type" => "game",
        "action" => "stAfterEndRound",
        "transitions" => [
            "nextRound" => ST_START_TURN,
            "endYear" => ST_END_YEAR,
        ],
    ],

    ST_END_YEAR => [
        "name" => "endYear",
        "description" => clienttranslate('Scoring research points...'),
        "type" => "game",
        "action" => "stEndYear",
        "transitions" => [
            "moveWorkers" => ST_MULTIPLAYER_MOVE_WORKERS,
            "afterEndRound" => ST_AFTER_END_ROUND,
            "endScore" => ST_END_SCORE,
        ]
    ],

    ST_END_SCORE => [
        "name" => "endScore",
        "description" => "",
        "type" => "game",
        "action" => "stEndScore",
        "transitions" => [
            "endGame" => ST_END_GAME,
        ],
    ],
];
 
$machinestates = $basicGameStates + $playerActionsGameStates + $gameGameStates;



