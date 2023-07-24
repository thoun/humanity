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
require_once(__DIR__.'/modules/php/objects/module.php');
require_once(__DIR__.'/modules/php/objects/experiment.php');
require_once(__DIR__.'/modules/php/objects/mission.php');

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

$this->EXPERIMENT = [
    1 => [
        1 => new ExperimentType(CENTRAL, [INSECT => 1, ICE => 1], 2, EXPERIMENT_POWER_REACTIVATE),
        2 => new ExperimentType(CENTRAL, [INSECT => 1, METHAN => 1], 2, EXPERIMENT_POWER_TIME),
        3 => new ExperimentType(LEFT, [ICE => 1, METHAN => 1], 2, EXPERIMENT_POWER_TIME),
        4 => new ExperimentType(RIGHT, [INSECT => 1, METHAN => 1], 4),
        5 => new ExperimentType(LEFT, [INSECT => 1, METHAN => 1], 2, EXPERIMENT_POWER_REACTIVATE),
        6 => new ExperimentType(LEFT, [INSECT => 1, ICE => 1], 4),
        7 => new ExperimentType(CENTRAL,[ICE => 1, METHAN => 1], 4),
        8 => new ExperimentType(RIGHT, [ICE => 1, METHAN => 1], 2, EXPERIMENT_POWER_REACTIVATE),
        9 => new ExperimentType(RIGHT, [INSECT => 1, ICE => 1], 2, EXPERIMENT_POWER_TIME),
    ],

    2 => [
        1 => new ExperimentType(LEFT, [AIRCARBON => 1], 5),
        2 => new ExperimentType(LEFT, [OXYGEN => 1], 3, EXPERIMENT_POWER_REACTIVATE),
        3 => new ExperimentType(LEFT, [PROTEIN => 1], 3, EXPERIMENT_POWER_TIME),
        4 => new ExperimentType(CENTRAL, [AIRCARBON => 1], 3, EXPERIMENT_POWER_TIME),
        5 => new ExperimentType(CENTRAL, [OXYGEN => 1], 5),
        6 => new ExperimentType(RIGHT, [OXYGEN => 1], 3, EXPERIMENT_POWER_TIME),
        7 => new ExperimentType(RIGHT, [AIRCARBON => 1], 3, EXPERIMENT_POWER_REACTIVATE),
        8 => new ExperimentType(RIGHT, [PROTEIN => 1], 5),
        9 => new ExperimentType(CENTRAL, [PROTEIN => 1], 3, EXPERIMENT_POWER_REACTIVATE),
    ],

    3 => [
        1 => new ExperimentType(LEFT, [OXYGEN => 1, METHAN => 1], 6, null, 1),
        2 => new ExperimentType(LEFT, [PROTEIN => 1, METHAN => 1], 4, EXPERIMENT_POWER_REACTIVATE, 1),
        3 => new ExperimentType(LEFT, [AIRCARBON => 1, METHAN => 1], 4, EXPERIMENT_POWER_TIME, 1),
        4 => new ExperimentType(CENTRAL, [PROTEIN => 1, INSECT => 1], 6, null, 1),
        5 => new ExperimentType(CENTRAL, [INSECT => 1, AIRCARBON => 1], 4, EXPERIMENT_POWER_REACTIVATE, 1),
        6 => new ExperimentType(CENTRAL, [INSECT => 1, OXYGEN => 1], 4, EXPERIMENT_POWER_TIME, 1),
        7 => new ExperimentType(RIGHT, [ICE => 1, AIRCARBON => 1], 6, null, 1),
        8 => new ExperimentType(RIGHT, [OXYGEN => 1, ICE => 1], 4, EXPERIMENT_POWER_REACTIVATE, 1),
        9 => new ExperimentType(RIGHT, [PROTEIN => 1, ICE => 1], 4, EXPERIMENT_POWER_TIME, 1),
    ],
];

$this->TILES = [ //public int $type; // 0 start, 1..3 year, 8 communication, 9 obstacle
    0 => [ // start
        1 => new OrangeModuleType([], 1, [[], [ICE => 1], [ICE => 2], [ICE => 3]]),
        2 => new OrangeModuleType([], 1, [[], [INSECT => 1], [INSECT => 2], [INSECT => 3]]),
        3 => new OrangeModuleType([], 1, [[], [METHAN => 1], [METHAN => 2], [METHAN => 3]]),
        4 => new BlueModuleType([], 2, [[], [ELECTRICITY => 1], [ELECTRICITY => 2], [ELECTRICITY => 3]]),
    ],

    1 => [
        1 => new ModuleType(BLUE_OR_ORANGE, [INSECT => 1, ICE => 1, METHAN => 1], null, null, 0, 3),
        2 => new ModuleType(BLUE_OR_ORANGE, [INSECT => 1, ICE => 1, METHAN => 1], null, null, 0, 3),
        3 => new OrangeModuleType([INSECT => 1, ICE => 1, METHAN => 1], null, null, EXPERIMENT_POWER_TIME),
        4 => new OrangeModuleType([ICE => 2], 1, [[], [INSECT => 1, METHAN => 1], [INSECT => 2, METHAN => 2], [INSECT => 3, METHAN => 3]]),
        5 => new OrangeModuleType([METHAN => 2], 1, [[], [INSECT => 1, ICE => 1], [INSECT => 2, ICE => 2], [INSECT => 3, ICE => 3]]),
        6 => new OrangeModuleType([INSECT => 2], 1, [[], [METHAN => 1, ICE => 1], [METHAN => 2, ICE => 2], [METHAN => 3, ICE => 3]]),
        7 => new BlueModuleType([ICE => 3], 2, [[], [OXYGEN => 1], [OXYGEN => 2], [OXYGEN => 3]]),
        8 => new BlueModuleType([METHAN => 3], 2, [[], [AIRCARBON => 1], [AIRCARBON => 2], [AIRCARBON => 3]]),
        9 => new BlueModuleType([INSECT => 3], 2, [[], [PROTEIN => 1], [PROTEIN => 2], [PROTEIN => 3]]),
        10 => new PurpleModuleType([ELECTRICITY => 1, METHAN => 1], 3, 2, GREEN),
        11 => new PurpleModuleType([ELECTRICITY => 1, ICE => 1], 3, 2, BLUE),
        12 => new PurpleModuleType([ELECTRICITY => 1, INSECT => 1], 3, 2, ORANGE),
        13 => new GreenModuleType([ICE => 2], SHAPE_OCTOGONAL),
        14 => new GreenModuleType([METHAN => 2], SHAPE_RECTANGULAR),
        15 => new GreenModuleType([INSECT => 2], SHAPE_ROUND),
    ],

    2 => [
        1 => new ModuleType(BLUE_OR_ORANGE, [OXYGEN => 1, ICE => 1, METHAN => 1], null, null, 0, 4),
        2 => new ModuleType(BLUE_OR_ORANGE, [PROTEIN => 1, INSECT => 1, METHAN => 1], null, null, 0, 4),
        3 => new OrangeModuleType([PROTEIN => 1, ICE => 1, METHAN => 1], null, null, EXPERIMENT_POWER_TIME),
        4 => new OrangeModuleType([INSECT => 1, OXYGEN => 1], 1, [[], [ELECTRICITY => 1], [ELECTRICITY => 2], [ELECTRICITY => 3]]),
        5 => new OrangeModuleType([INSECT => 1, AIRCARBON => 1], 1, [[], [ELECTRICITY => 1], [ELECTRICITY => 2], [ELECTRICITY => 3]]),
        6 => new BlueModuleType([INSECT => 2, ICE => 2], 2, [[], [PROTEIN => 1, OXYGEN => 1], [PROTEIN => 2, OXYGEN => 2], [PROTEIN => 3, OXYGEN => 3]]),
        7 => new BlueModuleType([ICE => 2, METHAN => 2], 2, [[], [AIRCARBON => 1, OXYGEN => 1], [AIRCARBON => 2, OXYGEN => 2], [AIRCARBON => 3, OXYGEN => 3]]),
        8 => new BlueModuleType([INSECT => 2, METHAN => 2], 2, [[], [PROTEIN => 1, AIRCARBON => 1], [PROTEIN => 2, AIRCARBON => 2], [PROTEIN => 3, AIRCARBON => 3]]),
        9 => new PurpleModuleType([ELECTRICITY => 1, PROTEIN => 1], 4, 1, ORANGE),
        10 => new PurpleModuleType([ELECTRICITY => 1, INSECT => 1, ICE => 1, METHAN => 1], 3, 2, ANY_COLOR),
        11 => new PurpleModuleType([ELECTRICITY => 1, AIRCARBON => 1], 4, 1, GREEN),
        12 => new PurpleModuleType([ELECTRICITY => 1, OXYGEN => 1], 4, 1, BLUE),
        13 => new GreenModuleType([PROTEIN => 1], SHAPE_ROUND),
        14 => new GreenModuleType([OXYGEN => 1], SHAPE_OCTOGONAL),
        15 => new GreenModuleType([AIRCARBON => 1], SHAPE_RECTANGULAR),
    ],

    3 => [
        1 => new ModuleType(BLUE_OR_ORANGE, [INSECT => 1, OXYGEN => 1, METHAN => 1], null, null, 0, 5),
        2 => new OrangeModuleType([PROTEIN => 1, ICE => 1], null, null, null, 1),
        3 => new OrangeModuleType([OXYGEN => 1, METHAN => 1], null, null, null, 1),
        4 => new OrangeModuleType([INSECT => 1, AIRCARBON => 1], null, null, null, 1),
        5 => new BlueModuleType([INSECT => 1, OXYGEN => 1], null, null, null, 1),
        6 => new BlueModuleType([ICE => 1, AIRCARBON => 1], null, null, null, 1),
        7 => new BlueModuleType([PROTEIN => 1, METHAN => 1], null, null, null, 1),
        8 => new PurpleModuleType([ELECTRICITY => 1, OXYGEN => 1, METHAN => 1], 5, 0, BLUE),
        9 => new PurpleModuleType([ELECTRICITY => 1, PROTEIN => 1, ICE => 1], 5, 0, ORANGE),
        10 => new PurpleModuleType([ELECTRICITY => 1, INSECT => 1, AIRCARBON => 1], 5, 0, GREEN),
        11 => new PurpleModuleType([ELECTRICITY => 1, PROTEIN => 1, METHAN => 1], 4, 1, ANY_COLOR),
        12 => new GreenModuleType([OXYGEN => 1, ICE => 1], SHAPE_OCTOGONAL, 1),
        13 => new GreenModuleType([AIRCARBON => 1, METHAN => 1], SHAPE_RECTANGULAR, 1),
        14 => new GreenModuleType([PROTEIN => 1, INSECT => 1], SHAPE_ROUND, 1),
        15 => new GreenModuleType([ELECTRICITY => 1, ICE => 1, AIRCARBON => 1], SHAPE_JOKER, 1),
    ],

    8 => [
        1 => new ModuleType(ORANGE, [], null, null, 0, 3),
        2 => new ModuleType(ORANGE, [], null, null, 0, 4),
        3 => new ModuleType(ORANGE, [], null, null, 0, 5),
        4 => new ModuleType(BLUE, [], null, null, 0, 3),
        5 => new ModuleType(BLUE, [], null, null, 0, 4),
        6 => new ModuleType(BLUE, [], null, null, 0, 5),
    ],

    9 => [
        0 => new ModuleType(0, [], 1),
    ],
];

$this->MISSIONS = [
    1 => [
        1 => new MissionTypeA(4, ORANGE, true),
        2 => new MissionTypeA(3, BLUE, true),
        3 => new MissionTypeA(3, PURPLE, true, true),

        4 => new MissionTypeA(6, ORANGE, false),
        5 => new MissionTypeA(4, BLUE, false),
        6 => new MissionTypeA(3, PURPLE, false),
    ],

    2 => [
        1 => new MissionTypeB(4, VERTICAL, false),
        2 => new MissionTypeB(5, HORIZONTAL, false),
        3 => new MissionTypeB(4, DIAGONAL, false),

        4 => new MissionTypeB(3, VERTICAL, true),
        5 => new MissionTypeB(3, HORIZONTAL, true),
        6 => new MissionTypeB(3, DIAGONAL, true),
    ],

    3 => [
        1 => new MissionTypeC(4, ICE, null),
        2 => new MissionTypeC(4, METHAN, null),
        3 => new MissionTypeC(4, INSECT, null),

        4 => new MissionTypeC(3, null, LEFT),
        5 => new MissionTypeC(3, null, CENTRAL),
        6 => new MissionTypeC(3, null, RIGHT),
    ],
];
