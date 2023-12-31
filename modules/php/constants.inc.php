<?php

const SCIENCE_BY_EXPERIMENT_SPOT = [
    0 => 0,
    1 => 8,
    2 => 15,
    3 => 21,
    4 => 26,
    5 => 30,
    6 => 34,
    7 => 38,
    8 => 42,
    9 => 46,
    10 => 50,
];

/*
 * Color
 */
const ANY_COLOR = 0;
const BLUE_OR_ORANGE = 0;
const ORANGE = 1;
const BLUE = 2;
const PURPLE = 3;
const GREEN = 4;

/*
 * Direction
 */
const VERTICAL = 1;
const HORIZONTAL = 2;
const DIAGONAL = 3;

/*
 * Base types
 */
const ELECTRICITY = 0;
const ICE = 1;
const METHANE = 2;
const INSECT = 3;
const OXYGEN = 11;
const AIRCARBON = 12;
const PROTEIN = 13;

/*
 * Side
 */
const LEFT = 1;
const CENTRAL = 2;
const RIGHT = 3;

/*
 * Green shapes
 */
const SHAPE_JOKER = 0;
const SHAPE_ROUND = 1;
const SHAPE_RECTANGULAR = 2;
const SHAPE_OCTAGONAL = 3;

/*
 * EXPERIMENT POWERS
 */
const EXPERIMENT_POWER_REACTIVATE = 1;
const EXPERIMENT_POWER_TIME = 2;

/*
 * State constants
 */
const ST_BGA_GAME_SETUP = 1;

const ST_START_TURN = 5;

const ST_PLAYER_CHOOSE_ASTRONAUT = 10;

const ST_PLAYER_CHOOSE_ACTION = 20;
const ST_PLAYER_CHOOSE_COMMUNICATION_COLOR = 21;

const ST_PLAYER_ACTIVATE_TILE = 30;

const ST_PLAYER_SPEND_RESOURCES = 40;

const ST_DEPLOY = 50;

const ST_PLAYER_UPGRADE_ASTRONAUT = 60;

const ST_PLAYER_CONFIRM_TURN = 80;

const ST_CHECK_MISSIONS = 82;

const ST_NEXT_PLAYER = 85;

const ST_END_ROUND = 90;
const ST_MULTIPLAYER_MOVE_ASTRONAUTS = 91;
const ST_PRIVATE_MOVE_ASTRONAUT = 92;
const ST_PRIVATE_CONFIRM_MOVE_ASTRONAUTS = 93;
const ST_AFTER_END_ROUND = 94;

const ST_END_YEAR = 96;

const ST_END_SCORE = 98;

const ST_END_GAME = 99;
const END_SCORE = 100;

/*
 * Global variables
 */
const FIRST_PLAYER = 'FIRST_PLAYER';
const YEAR = 'YEAR';
const ARM = 'ARM';
const CURRENT_ACTION = 'CURRENT_ACTION';
const MOVED_ASTRONAUTS = 'MOVED_ASTRONAUTS';
const UNDO = 'UNDO';

?>
