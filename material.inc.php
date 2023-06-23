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
require_once(__DIR__.'/modules/php/objects/research.php');
require_once(__DIR__.'/modules/php/objects/tile.php');

$this->VP_BY_RESEARCH = [
    3 => 1,
    6 => 2,
    10 => 3,
    14 => 5,
];

$this->RESEARCH = [
    // A
    1 => new DestinationType([DIFFERENT => 3], [RECRUIT => 1, RESEARCH => 1, CARD => 1], [null, VP, null]),
    2 => new DestinationType([DIFFERENT => 3], [BRACELET => 1, RESEARCH => 1, CARD => 1], [null, VP, null]),
    3 => new DestinationType([DIFFERENT => 3], [BRACELET => 1, RECRUIT => 1, CARD => 1], [null, VP, null]),
    4 => new DestinationType([DIFFERENT => 3], [BRACELET => 1], [VP, RESEARCH, RECRUIT]),
    5 => new DestinationType([DIFFERENT => 3], [BRACELET => 1], [VP, RESEARCH, RECRUIT]),
    6 => new DestinationType([PURPLE => 2], [BRACELET => 1, CARD => 1], [null, VP, CARD]),
    7 => new DestinationType([PURPLE => 2], [CARD => 1], [CARD, null, VP]),
    8 => new DestinationType([PURPLE => 2], [CARD => 1], [VP, CARD, null]),
    9 => new DestinationType([BLUE => 2], [RESEARCH => 2], [null, VP, RESEARCH]),
    10 => new DestinationType([BLUE => 2], [RECRUIT => 1, RESEARCH => 1], [RESEARCH, null, VP]),
    11 => new DestinationType([BLUE => 2], [BRACELET => 1, RESEARCH => 1], [null, RESEARCH, VP]),
    12 => new DestinationType([GREEN => 2], [BRACELET => 1, RECRUIT => 1], [VP, null, RECRUIT]),
    13 => new DestinationType([GREEN => 2], [RECRUIT => 1], [RECRUIT, VP, null]),
    14 => new DestinationType([GREEN => 2], [RECRUIT => 2], [null, RECRUIT, null]),
    15 => new DestinationType([YELLOW => 2], [], [VP, VP, VP]),
    16 => new DestinationType([YELLOW => 2], [RESEARCH => 1], [VP, VP, null]),
    17 => new DestinationType([YELLOW => 2], [RECRUIT => 1], [VP, VP, null]),
    18 => new DestinationType([RED => 2], [BRACELET => 1, CARD => 1], [VP, null, VP]),
    19 => new DestinationType([RED => 2], [BRACELET => 1, RESEARCH => 1], [VP, null, VP]),
    20 => new DestinationType([RED => 2], [BRACELET => 1], [VP, VP, null]),
    // B
    21 => new DestinationType([EQUAL => 4], [VP => 5, RECRUIT => 1], [null, null, VP]),
    22 => new DestinationType([EQUAL => 4], [VP => 5, RESEARCH => 1], [null, null, VP]),
    23 => new DestinationType([EQUAL => 4], [VP => 5, BRACELET => 1], [null, null, VP]),
    24 => new DestinationType([RED => 1, YELLOW => 1, GREEN => 1, BLUE => 1, PURPLE => 1], [VP => 4, BRACELET => 1, RECRUIT => 1, RESEARCH => 1, CARD => 1], [null, null, VP]),
    25 => new DestinationType([RED => 1, YELLOW => 1, GREEN => 1, BLUE => 1, PURPLE => 1], [VP => 4, BRACELET => 1, RECRUIT => 1, RESEARCH => 1, CARD => 1], [null, null, VP]),
    26 => new DestinationType([PURPLE => 2, YELLOW => 2], [VP => 6], [null, VP, null]),
    27 => new DestinationType([PURPLE => 3, RED => 2], [VP => 8, CARD => 1], [null, null, VP]),
    28 => new DestinationType([BLUE => 2, RED => 2], [VP => 6], [null, VP, null]),
    29 => new DestinationType([BLUE => 3, PURPLE => 2], [VP => 7, RESEARCH => 2], [null, null, VP]),
    30 => new DestinationType([GREEN => 2, PURPLE => 2], [VP => 6], [null, VP, null]),
    31 => new DestinationType([GREEN => 3, BLUE => 2], [VP => 8, RECRUIT => 1], [null, null, VP]),
    32 => new DestinationType([YELLOW => 2, BLUE => 2], [VP => 6], [null, VP, null]),
    33 => new DestinationType([YELLOW => 3, GREEN => 2], [VP => 9], [null, null, VP]),
    34 => new DestinationType([RED => 2, GREEN => 2], [VP => 6], [null, VP, null]),
    35 => new DestinationType([RED => 3, YELLOW => 2], [VP => 7, BRACELET => 1], [null, null, VP]),
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
