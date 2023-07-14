<?php

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
const METHAN = 2;
const INSECT = 3;
const OXYGEN = 11;
const AIRCARBON = 12;
const PROTEIN = 13;

/*
 * Extremity
 */
const LEFT = 1;
const CENTRAL = 2;
const RIGHT = 3;

/*
 * Green shapes
 */
const SHAPE_JOKER = 3;
const SHAPE_ROUND = 1;
const SHAPE_RECTANGULAR = 2;
const SHAPE_OCTOGONAL = 3;

/*
 * RESEARCH POWERS
 */
const RESEARCH_POWER_REACTIVATE = 1;
const RESEARCH_POWER_TIME = 2;

/*
 * State constants
 */
const ST_BGA_GAME_SETUP = 1;

const ST_PLAYER_CHOOSE_ACTION = 10;

const ST_PLAYER_ACTIVATE_TILE = 20;

const ST_PLAYER_PAY = 30;

const ST_PLAYER_CHOOSE_WORKER = 40;

const ST_CHECK_OBJECTIVES = 90;
const ST_NEXT_PLAYER = 92;

const ST_END_ROUND = 95;
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

?>
