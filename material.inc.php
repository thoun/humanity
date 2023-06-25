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
 * material.inc.php
 *
 * Humanity game material description
 *
 * Here, you can describe the material of your game with PHP variables.
 *   
 * This file is loaded in your game logic class constructor, ie these variables
 * are available everywhere in your game logic code.
 *
 */

require_once(__DIR__.'/modules/php/constants.inc.php');
require_once(__DIR__.'/modules/php/objects/tile.php');
require_once(__DIR__.'/modules/php/objects/research.php');
require_once(__DIR__.'/modules/php/objects/objective.php');

$this->VP_BY_RESEARCH = [
    3 => 1,
    6 => 2,
    10 => 3,
    14 => 5,
];

$this->RESEARCH = [
    1 => [
        1 => new ResearchType(CENTRAL, [INSECT, ICE], 2, RESEARCH_POWER_REACTIVATE),
        2 => new ResearchType(CENTRAL, [INSECT, METHAN], 2, RESEARCH_POWER_TIME),
        3 => new ResearchType(LEFT, [ICE, METHAN], 2, RESEARCH_POWER_TIME),
        4 => new ResearchType(RIGHT, [INSECT, METHAN], 4),
        5 => new ResearchType(LEFT, [INSECT, METHAN], 2, RESEARCH_POWER_REACTIVATE),
        6 => new ResearchType(LEFT, [INSECT, ICE], 4),
        7 => new ResearchType(CENTRAL,[ICE, METHAN], 4),
        8 => new ResearchType(RIGHT, [ICE, METHAN], 2, RESEARCH_POWER_REACTIVATE),
        9 => new ResearchType(RIGHT, [INSECT, ICE], 2, RESEARCH_POWER_TIME),
    ],

    2 => [
        1 => new ResearchType(LEFT, [AIRCARBON], 5),
        2 => new ResearchType(LEFT, [OXYGEN], 3, RESEARCH_POWER_REACTIVATE),
        3 => new ResearchType(LEFT, [PROTEIN], 3, RESEARCH_POWER_TIME),
        4 => new ResearchType(CENTRAL, [AIRCARBON], 3, RESEARCH_POWER_TIME),
        5 => new ResearchType(CENTRAL, [OXYGEN], 5),
        6 => new ResearchType(RIGHT, [OXYGEN], 3, RESEARCH_POWER_TIME),
        7 => new ResearchType(RIGHT, [AIRCARBON], 3, RESEARCH_POWER_REACTIVATE),
        8 => new ResearchType(RIGHT, [PROTEIN], 5),
        9 => new ResearchType(CENTRAL, [PROTEIN], 3, RESEARCH_POWER_REACTIVATE),
    ],

    3 => [
        1 => new ResearchType(LEFT, [OXYGEN, METHAN], 6, null, 1),
        2 => new ResearchType(LEFT, [PROTEIN, METHAN], 4, RESEARCH_POWER_REACTIVATE, 1),
        3 => new ResearchType(LEFT, [AIRCARBON, METHAN], 4, RESEARCH_POWER_TIME, 1),
        4 => new ResearchType(CENTRAL, [PROTEIN, INSECT], 6, null, 1),
        5 => new ResearchType(CENTRAL, [INSECT, AIRCARBON], 4, RESEARCH_POWER_REACTIVATE, 1),
        6 => new ResearchType(CENTRAL, [INSECT, OXYGEN], 4, RESEARCH_POWER_TIME, 1),
        7 => new ResearchType(RIGHT, [ICE, AIRCARBON], 6, null, 1),
        8 => new ResearchType(RIGHT, [OXYGEN, ICE], 4, RESEARCH_POWER_REACTIVATE, 1),
        9 => new ResearchType(RIGHT, [PROTEIN, ICE], 4, RESEARCH_POWER_TIME, 1),
    ],
];

$this->TILES = [    
    new TileType(BLUE, VP, [2 => 2, 3 => 3, 4 => 4]),
    new TileType(BLUE, BRACELET, [2 => 1, 3 => 2, 4 => 2]),
    new TileType(BLUE, RECRUIT, [2 => 1, 3 => 1, 4 => 1]),
    new TileType(BLUE, RESEARCH, [2 => 2, 3 => 2, 4 => 3]),

    new TileType(YELLOW, VP, [2 => 3, 3 => 4, 4 => 5]),
    new TileType(YELLOW, BRACELET, [2 => 1, 3 => 1, 4 => 2]),
    new TileType(YELLOW, RECRUIT, [2 => 0, 3 => 1, 4 => 1]),
    new TileType(YELLOW, RESEARCH, [2 => 2, 3 => 2, 4 => 2]),

    new TileType(PURPLE, VP, [2 => 1, 3 => 2, 4 => 4]),
    new TileType(PURPLE, BRACELET, [2 => 2, 3 => 2, 4 => 2]),
    new TileType(PURPLE, RECRUIT, [2 => 2, 3 => 2, 4 => 2]),
    new TileType(PURPLE, RESEARCH, [2 => 1, 3 => 2, 4 => 2]),

    new TileType(GREEN, VP, [2 => 2, 3 => 3, 4 => 4]),
    new TileType(GREEN, BRACELET, [2 => 1, 3 => 1, 4 => 2]),
    new TileType(GREEN, RECRUIT, [2 => 2, 3 => 3, 4 => 3]),
    new TileType(GREEN, RESEARCH, [2 => 1, 3 => 1, 4 => 1]),

    new TileType(RED, VP, [2 => 3, 3 => 3, 4 => 4]),
    new TileType(RED, BRACELET, [2 => 2, 3 => 3, 4 => 3]),
    new TileType(RED, RECRUIT, [2 => 1, 3 => 1, 4 => 2]),
    new TileType(RED, RESEARCH, [2 => 0, 3 => 1, 4 => 1]),
];

$this->OBJECTIVES = [
    1 => [
        1 => new ObjectiveTypeA(4, ORANGE, true),
        2 => new ObjectiveTypeA(3, BLUE, true),
        3 => new ObjectiveTypeA(3, PURPLE, true), // TODO allow diagonal for PURPLE & adjacent

        4 => new ObjectiveTypeA(6, ORANGE, false),
        5 => new ObjectiveTypeA(4, BLUE, false),
        6 => new ObjectiveTypeA(3, PURPLE, false),
    ],

    2 => [
        1 => new ObjectiveTypeB(4, VERTICAL, false),
        2 => new ObjectiveTypeB(5, HORIZONTAL, false),
        3 => new ObjectiveTypeB(4, DIAGONAL, false),

        4 => new ObjectiveTypeB(3, VERTICAL, true),
        5 => new ObjectiveTypeB(3, HORIZONTAL, true),
        6 => new ObjectiveTypeB(3, DIAGONAL, true),
    ],

    3 => [
        1 => new ObjectiveTypeC(4, ICE, null),
        2 => new ObjectiveTypeC(4, METHAN, null),
        3 => new ObjectiveTypeC(4, INSECT, null),

        4 => new ObjectiveTypeC(3, null, LEFT),
        5 => new ObjectiveTypeC(3, null, CENTRAL),
        6 => new ObjectiveTypeC(3, null, RIGHT),
    ],
];
