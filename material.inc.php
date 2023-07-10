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

$this->STARTING_TILE_POSITIONS = [
    1 => [-1, 0],
    2 => [0, 1],
    3 => [1, 0],
    4 => [0, 0],
];

$this->OBSTACLE_POSITIONS = [
    0 => [-1, 1],
    1 => [0, -1],
    2 => [1, 1],
];

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

$this->TILES = [ //public int $type; // 0 start, 1..3 year, 8 communication, 9 obstacle
    0 => [ // start
        1 => new OrangeTileType([], 1, [[ICE => 1], [ICE => 2], [ICE => 3], []]),
        2 => new OrangeTileType([], 1, [[INSECT => 1], [INSECT => 2], [INSECT => 3], []]),
        3 => new OrangeTileType([], 1, [[METHAN => 1], [METHAN => 2], [METHAN => 3], []]),
        4 => new BlueTileType([], 2, [[ELECTRICITY => 1], [ELECTRICITY => 2], [ELECTRICITY => 3], []]),
    ],

    1 => [
        1 => new TileType(BLUE_OR_ORANGE, [INSECT => 1, ICE => 1, METHAN => 1], null, null, null, 3),
        2 => new OrangeTileType([INSECT => 1, ICE => 1, METHAN => 1], null, null), // TODO power ? RESEARCH_POWER_TIME
        3 => new OrangeTileType([ICE => 2], 1, [[INSECT => 1, METHAN => 1], [INSECT => 2, METHAN => 2], [INSECT => 3, METHAN => 3], []]),
        4 => new OrangeTileType([METHAN => 2], 1, [[INSECT => 1, ICE => 1], [INSECT => 2, ICE => 2], [INSECT => 3, ICE => 3], []]),
        5 => new OrangeTileType([INSECT => 2], 1, [[METHAN => 1, ICE => 1], [METHAN => 2, ICE => 2], [METHAN => 3, ICE => 3], []]),
        6 => new BlueTileType([ICE => 3], 2, [[OXYGEN => 1], [OXYGEN => 2], [OXYGEN => 3], []]),
        7 => new BlueTileType([METHAN => 3], 2, [[AIRCARBON => 1], [AIRCARBON => 2], [AIRCARBON => 3], []]),
        8 => new BlueTileType([INSECT => 3], 2, [[PROTEIN => 1], [PROTEIN => 2], [PROTEIN => 3], []]),
        9 => new PurpleTileType([ELECTRICITY => 1, METHAN => 1], 3, 2, GREEN),
        10 => new PurpleTileType([ELECTRICITY => 1, ICE => 1], 3, 2, BLUE),
        11 => new PurpleTileType([ELECTRICITY => 1, INSECT => 1], 3, 2, ORANGE),
        12 => new GreenTileType([ICE => 2], SHAPE_OCTOGONAL),
        13 => new GreenTileType([METHAN => 2], SHAPE_RECTANGULAR),
        14 => new GreenTileType([INSECT => 2], SHAPE_ROUND),
    ],

    2 => [
        1 => new TileType(BLUE_OR_ORANGE, [OXYGEN => 1, ICE => 1, METHAN => 1], null, null, null, 4),
        2 => new TileType(BLUE_OR_ORANGE, [PROTEIN => 1, INSECT => 1, METHAN => 1], null, null, null, 4),
        3 => new OrangeTileType([PROTEIN => 1, ICE => 1, METHAN => 1], null, null), // TODO power ? RESEARCH_POWER_TIME
        4 => new OrangeTileType([INSECT => 1, OXYGEN => 1], 1, [[ELECTRICITY => 1], [ELECTRICITY => 2], [ELECTRICITY => 3], []]),
        5 => new OrangeTileType([INSECT => 1, AIRCARBON => 1], 1, [[ELECTRICITY => 1], [ELECTRICITY => 2], [ELECTRICITY => 3], []]),
        6 => new BlueTileType([INSECT => 2, ICE => 2], 2, [[PROTEIN => 1, OXYGEN => 1], [PROTEIN => 2, OXYGEN => 2], [PROTEIN => 3, OXYGEN => 3], []]),
        7 => new BlueTileType([ICE => 2, METHAN => 2], 2, [[AIRCARBON => 1, OXYGEN => 1], [AIRCARBON => 2, OXYGEN => 2], [AIRCARBON => 3, OXYGEN => 3], []]),
        8 => new BlueTileType([INSECT => 2, METHAN => 2], 2, [[PROTEIN => 1, AIRCARBON => 1], [PROTEIN => 2, AIRCARBON => 2], [PROTEIN => 3, AIRCARBON => 3], []]),
        9 => new PurpleTileType([ELECTRICITY => 1, PROTEIN => 1], 4, 1, ORANGE),
        10 => new PurpleTileType([ELECTRICITY => 1, INSECT => 1, ICE => 1, METHAN => 1], 3, 2, ANY_COLOR),
        11 => new PurpleTileType([ELECTRICITY => 1, AIRCARBON => 1], 4, 1, GREEN),
        12 => new PurpleTileType([ELECTRICITY => 1, OXYGEN => 1], 4, 1, BLUE),
        13 => new GreenTileType([PROTEIN => 1], SHAPE_ROUND),
        14 => new GreenTileType([OXYGEN => 1], SHAPE_OCTOGONAL),
        15 => new GreenTileType([AIRCARBON => 1], SHAPE_RECTANGULAR),
    ],

    3 => [
        1 => new TileType(BLUE_OR_ORANGE, [INSECT => 1, OXYGEN => 1, METHAN => 1], null, null, null, 5),
        2 => new OrangeTileType([PROTEIN => 1, ICE => 1]), // TODO 1 point for theses colors
        3 => new OrangeTileType([OXYGEN => 1, METHAN => 1]),
        4 => new OrangeTileType([INSECT => 1, AIRCARBON => 1]),
        5 => new BlueTileType([INSECT => 1, OXYGEN => 1]), // TODO 1 point for theses colors
        6 => new BlueTileType([ICE => 1, AIRCARBON => 1]),
        7 => new BlueTileType([PROTEIN => 1, METHAN => 1]),
        8 => new PurpleTileType([ELECTRICITY => 1, OXYGEN => 1, METHAN => 1], 5, 0, BLUE),
        9 => new PurpleTileType([ELECTRICITY => 1, PROTEIN => 1, ICE => 1], 5, 0, ORANGE),
        10 => new PurpleTileType([ELECTRICITY => 1, INSECT => 1, AIRCARBON => 1], 5, 0, GREEN),
        11 => new PurpleTileType([ELECTRICITY => 1, PROTEIN => 1, METHAN => 1], 4, 1, ANY_COLOR),
        12 => new GreenTileType([OXYGEN => 1, ICE => 1], SHAPE_OCTOGONAL), // TODO 1 point for theses colors
        13 => new GreenTileType([AIRCARBON => 1, METHAN => 1], SHAPE_RECTANGULAR),
        14 => new GreenTileType([PROTEIN => 1, INSECT => 1], SHAPE_ROUND),
        15 => new GreenTileType([ELECTRICITY => 1, ICE => 1, AIRCARBON => 1], SHAPE_JOKER),
    ],

    8 => [
        1 => new TileType(ORANGE, [], null, null, null, 3),
        2 => new TileType(ORANGE, [], null, null, null, 4),
        3 => new TileType(ORANGE, [], null, null, null, 5),
        4 => new TileType(BLUE, [], null, null, null, 3),
        5 => new TileType(BLUE, [], null, null, null, 4),
        6 => new TileType(BLUE, [], null, null, null, 5),
    ],

    9 => [
        0 => new TileType(0, []),
    ],
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
