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

$playerActionsGameStates = [

    ST_PLAYER_CHOOSE_ASTRONAUT => [
        "name" => "chooseAstronaut",
        "description" => clienttranslate('${actplayer} must choose an astronaut'),
        "descriptionmyturn" => clienttranslate('${you} must choose an astronaut'),
        "type" => "activeplayer",    
        "args" => "argChooseAstronaut",
        "possibleactions" => [ 
            "chooseAstronaut",
        ],
        "transitions" => [
            "next" => ST_PLAYER_CHOOSE_ACTION,
        ],
    ],

    ST_PLAYER_CHOOSE_ACTION => [
        "name" => "chooseAction",
        "description" => clienttranslate('${actplayer} must select a module to activate, a module to deploy or an experiment to carry out'),
        "descriptionmyturn" => clienttranslate('${you} must select a module to activate, a module to deploy or an experiment to carry out'),
        "type" => "activeplayer",    
        "args" => "argChooseAction",
        "possibleactions" => [ 
            "activateModule",
            "chooseNewModule",
            "chooseNewExperiment",
        ],
        "transitions" => [
            "stay" => ST_PLAYER_ACTIVATE_TILE,
            "endTurn" => ST_CHECK_MISSIONS,
            "chooseCommunicationColor" => ST_PLAYER_CHOOSE_COMMUNICATION_COLOR,
            "pay" => ST_PLAYER_SPEND_RESOURCES,
        ],
    ],

    ST_PLAYER_CHOOSE_COMMUNICATION_COLOR => [
        "name" => "chooseCommunicationColor",
        "description" => clienttranslate('${actplayer} must choose the communication module color'),
        "descriptionmyturn" => clienttranslate('${you} must choose the communication module color'),
        "type" => "activeplayer",   
        "args" => "argChooseCommunicationColor", 
        "possibleactions" => [ 
            "chooseCommunicationColor",
        ],
        "transitions" => [
            "pay" => ST_PLAYER_SPEND_RESOURCES,
        ],
    ],

    ST_PLAYER_SPEND_RESOURCES => [
        "name" => "pay",
        "description" => clienttranslate('${actplayer} must spend ${cost}'),
        "descriptionmyturn" => clienttranslate('Click on your modules to spend ${cost} or '),
        "descriptionmyturnConvert" => clienttranslate('Click on your modules to spend 3 basic resources to generate ${resource}'),
        "type" => "activeplayer",    
        "args" => "argPay",
        "possibleactions" => [ 
            "pay", 
            "autoPay", 
            "convertBasicResources",
            "cancelConvertBasicResources",
        ],
        "transitions" => [
            "stay" => ST_PLAYER_SPEND_RESOURCES,
            "next" => ST_DEPLOY,
        ],
    ],

    ST_PLAYER_UPGRADE_ASTRONAUT => [
        "name" => "upgradeAstronaut",
        "description" => clienttranslate('${actplayer} must choose an astronaut to upgrade (${remaining} upgrade(s) remaining)'),
        "descriptionmyturn" => clienttranslate('${you} must choose an astronaut to upgrade (${remaining} upgrade(s) remaining)'),
        "type" => "activeplayer",    
        "args" => "argUpgradeAstronaut",
        "action" => "stUpgradeAstronauts",
        "possibleactions" => [ 
            "upgradeAstronaut",
        ],
        "transitions" => [
            "stay" => ST_PLAYER_UPGRADE_ASTRONAUT,
            "endTurn" => ST_CHECK_MISSIONS,
        ],
    ],

    ST_PLAYER_ACTIVATE_TILE => [
        "name" => "activateModule",
        "description" => clienttranslate('${actplayer} can activate some modules (${remaining} work force remaining)'),
        "descriptionmyturn" => clienttranslate('${you} can activate some modules (${remaining} work force remaining)'),
        "type" => "activeplayer",
        "args" => "argActivateModule",
        "possibleactions" => [ 
            "activateModule",
            "endTurn",
        ],
        "transitions" => [
            "stay" => ST_PLAYER_ACTIVATE_TILE,
            "endTurn" => ST_CHECK_MISSIONS,
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

    ST_MULTIPLAYER_MOVE_ASTRONAUTS => [
        "name" => "moveAstronauts",
        "description" => clienttranslate('Waiting for other players'),
        "descriptionmyturn" => '',
        "type" => "multipleactiveplayer",
        "action" => "stMoveAstronauts",
        "args" => "argMoveAstronauts",
        "initialprivate" => ST_PRIVATE_MOVE_ASTRONAUT,
        "possibleactions" => [ ],
        "transitions" => [
            "next" => ST_AFTER_END_ROUND,
        ],
    ],

    ST_PRIVATE_MOVE_ASTRONAUT => [
        "name" => "moveAstronaut",
        "descriptionmyturn" => clienttranslate('${you} must choose a place for moved astronaut'),
        "type" => "private",
        "args" => "argMoveAstronaut",
        "possibleactions" => [ "moveAstronaut", "undoMoveAstronaut" ],
        "transitions" => [
            'stay' => ST_PRIVATE_MOVE_ASTRONAUT,
            'next' => ST_PRIVATE_CONFIRM_MOVE_ASTRONAUTS,
            'undo' => ST_PRIVATE_MOVE_ASTRONAUT,
        ],
    ],

    ST_PRIVATE_CONFIRM_MOVE_ASTRONAUTS => [
        "name" => "confirmMoveAstronauts",
        "descriptionmyturn" => clienttranslate('${you} must confirm moved astronauts'),
        "type" => "private",
        "possibleactions" => [ "confirmMoveAstronauts", "undoMoveAstronaut" ],
        "transitions" => [
            'undo' => ST_PRIVATE_MOVE_ASTRONAUT,
        ],
    ],
];

$gameGameStates = [

    ST_START_TURN => [
        "name" => "startTurn",
        "description" => '',
        "type" => "game",
        "action" => "stStartTurn",
        "transitions" => [
            "next" => ST_PLAYER_CHOOSE_ASTRONAUT,
            "nextPlayer" => ST_START_TURN,
            "endRound" => ST_END_ROUND,
        ]
    ],

    ST_DEPLOY => [
        "name" => "deploy",
        "description" => '',
        "type" => "game",
        "action" => "stDeploy",
        "transitions" => [
            "upgrade" => ST_PLAYER_UPGRADE_ASTRONAUT,
            "endTurn" => ST_CHECK_MISSIONS,
        ]
    ],

    ST_CHECK_MISSIONS => [
        "name" => "checkMissions",
        "description" => clienttranslate('Checking missions...'),
        "type" => "game",
        "action" => "stCheckMissions",
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
        "updateGameProgression" => true,
        "transitions" => [
            "moveAstronauts" => ST_MULTIPLAYER_MOVE_ASTRONAUTS,
            "afterEndRound" => ST_AFTER_END_ROUND,
            "endYear" => ST_END_YEAR,
        ],
    ],

    ST_AFTER_END_ROUND => [
        "name" => "afterEndRound",
        "description" => clienttranslate('Reactivating astronauts...'),
        "type" => "game",
        "action" => "stAfterEndRound",
        "updateGameProgression" => true,
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
        "updateGameProgression" => true,
        "transitions" => [
            "moveAstronauts" => ST_MULTIPLAYER_MOVE_ASTRONAUTS,
            "afterEndRound" => ST_AFTER_END_ROUND,
            "endScore" => ST_END_SCORE,
        ]
    ],

    ST_END_SCORE => [
        "name" => "endScore",
        "description" => clienttranslate('Final score...'),
        "type" => "game",
        "action" => "stEndScore",
        "transitions" => [
            "endGame" => ST_END_GAME,
        ],
    ],
];
 
$machinestates = $playerActionsGameStates + $gameGameStates;



