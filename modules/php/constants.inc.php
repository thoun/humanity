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
define('OBJECTIVE_MEAD_CUP', 1);
define('OBJECTIVE_SILVER_COIN', 2);
define('OBJECTIVE_CAULDRON', 3);
define('OBJECTIVE_GOLDEN_BRACELET', 4);
define('OBJECTIVE_HELMET', 5);
define('OBJECTIVE_AMULET', 6);
define('OBJECTIVE_WEATHERVANE', 7);

/*
 * Color
 */
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
 * Constants
 */
define('LAST_TURN', 10);
define('RECRUIT_DONE', 11);
define('EXPLORE_DONE', 12);
define('TRADE_DONE', 15);
define('GO_DISCARD_TABLE_CARD', 16);
define('GO_RESERVE', 17);
define('PLAYED_CARD_COLOR', 20);
define('SELECTED_DESTINATION', 21);
define('COMPLETED_LINES', 22);

/*
 * Options
 */
define('BOAT_SIDE_OPTION', 100);
define('VARIANT_OPTION', 110);

/*
 * Global variables
 */
define('OBJECTIVES', 'Objectives');
define('REMAINING_CARDS_TO_TAKE', 'RemainingCardsToTake');
//define('UNDO', 'undo');

?>
