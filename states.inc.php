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
        "transitions" => [ "" => ST_PLAYER_CHOOSE_ACTION ]
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
        "description" => clienttranslate('${actplayer} must A. Travaillez dans la base, B. Déployez un module, C. Réalisez une expérience'),
        "descriptionmyturn" => clienttranslate('${you} must A. Travaillez dans la base, B. Déployez un module, C. Réalisez une expérience'),
        "type" => "activeplayer",    
        "args" => "argChooseAction",
        "possibleactions" => [ 
            "chooseWorker",
            "chooseNewTile",
            "chooseNewResearch",
        ],
        "transitions" => [
            "activate" => ST_PLAYER_ACTIVATE_TILE,
            "pay" => ST_PLAYER_PAY,
        ],
    ],

    ST_PLAYER_PAY => [
        "name" => "pay",
        "description" => clienttranslate('${actplayer} must pay'),
        "descriptionmyturn" => clienttranslate('${you} must pay'),
        "type" => "activeplayer",    
        "args" => "argPay", 
        "action" => "stPay",
        "possibleactions" => [ 
            "pay",
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
            "next" => ST_PLAYER_CHOOSE_ACTION,
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
];

$gameGameStates = [

    ST_CHECK_OBJECTIVES => [
        "name" => "checkObjectives",
        "description" => clienttranslate('Scoring research points...'),
        "type" => "game",
        "action" => "stCheckObjectives",
        "transitions" => [
            "next" => ST_NEXT_PLAYER,
        ]
    ],

    ST_NEXT_PLAYER => [
        "name" => "nextPlayer",
        "description" => "",
        "type" => "game",
        "action" => "stNextPlayer",
        "updateGameProgression" => true,
        "transitions" => [
            "nextPlayer" => ST_PLAYER_CHOOSE_ACTION,
            "endRound" => ST_END_ROUND,
        ],
    ],

    ST_END_ROUND => [
        "name" => "endRound",
        "description" => "",
        "type" => "game",
        "action" => "stEndRound",
        "transitions" => [
            "next" => ST_PLAYER_CHOOSE_ACTION,
            "endYear" => ST_END_YEAR,
        ],
    ],

    ST_END_YEAR => [
        "name" => "endYear",
        "description" => clienttranslate('Scoring research points...'),
        "type" => "game",
        "action" => "stEndYear",
        "transitions" => [
            "next" => ST_PLAYER_CHOOSE_ACTION,
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



