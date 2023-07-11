<?php

/*
 * TODO DELETE
 */
define('A', 'A');
define('B', 'B');
define('EQUAL', -1);
define('DIFFERENT', 0);
define('RED', 1);
define('YELLOW', 2);
define('VP', 1);
define('BRACELET', 2);
define('RECRUIT', 3);
define('RESEARCH', 4);
define('CARD', 5);

/*
 * Color
 */
define('ANY_COLOR', 0);
define('BLUE_OR_ORANGE', 0);
define('ORANGE', 1);
define('BLUE', 2);
define('PURPLE', 3);
define('GREEN', 4);

/*
 * Direction
 */
define('VERTICAL', 1);
define('HORIZONTAL', 2);
define('DIAGONAL', 3);

/*
 * Base types
 */
define('ELECTRICITY', 0);
define('ICE', 1);
define('METHAN', 2);
define('INSECT', 3);
define('OXYGEN', 11);
define('AIRCARBON', 12);
define('PROTEIN', 13);

/*
 * Extremity
 */
define('LEFT', 1);
define('CENTRAL', 2);
define('RIGHT', 3);

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
define('ST_BGA_GAME_SETUP', 1);

define('ST_PLAYER_CHOOSE_WORKER', 5);

define('ST_PLAYER_PLAY_ACTION', 10);

define('ST_PLAYER_CHOOSE_NEW_CARD', 25);
define('ST_PLAYER_PAY_DESTINATION', 30);

define('ST_PLAYER_RESERVE_DESTINATION', 40);

define('ST_PLAYER_DISCARD_TABLE_CARD', 45);

define('ST_PLAYER_TRADE', 50);

define('ST_MULTIPLAYER_DISCARD_CARD', 70);
define('ST_AFTER_DISCARD_CARD', 71);

define('ST_CHECK_OBJECTIVES', 90);
define('ST_NEXT_PLAYER', 92);
define('ST_END_YEAR', 95);

define('ST_END_SCORE', 98);

define('ST_END_GAME', 99);
define('END_SCORE', 100);

/*
 * Global variables
 */
define('SELECTED_WORKER', 'SELECTED_WORKER');
define('ARM', 'ARM');

?>
