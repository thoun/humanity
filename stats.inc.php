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
 * stats.inc.php
 *
 * Humanity game statistics description
 *
 */

/*
    In this file, you are describing game statistics, that will be displayed at the end of the
    game.
    
    !! After modifying this file, you must use "Reload  statistics configuration" in BGA Studio backoffice
    ("Control Panel" / "Manage Game" / "Your Game")
    
    There are 2 types of statistics:
    _ table statistics, that are not associated to a specific player (ie: 1 value for each game).
    _ player statistics, that are associated to each players (ie: 1 value for each player in the game).

    Statistics types can be "int" for integer, "float" for floating point values, and "bool" for boolean
    
    Once you defined your statistics there, you can start using "initStat", "setStat" and "incStat" method
    in your game logic, using statistics names defined below.
    
    !! It is not a good idea to modify this file when a game is running !!

    If your game is already public on BGA, please read the following before any change:
    http://en.doc.boardgamearena.com/Post-release_phase#Changes_that_breaks_the_games_in_progress
    
    Notes:
    * Statistic index is the reference used in setStat/incStat/initStat PHP method
    * Statistic index must contains alphanumerical characters and no space. Example: 'turn_played'
    * Statistics IDs must be >=10
    * Two table statistics can't share the same ID, two player statistics can't share the same ID
    * A table statistic can have the same ID than a player statistics
    * Statistics ID is the reference used by BGA website. If you change the ID, you lost all historical statistic data. Do NOT re-use an ID of a deleted statistic
    * Statistic name is the English description of the statistic as shown to players
    
*/

require_once("modules/php/constants.inc.php");

$stats_type = [
    // Statistics global to table
    "table" => [
        "roundNumber" => [
            "id" => 10,
            "name" => totranslate("Number of rounds"),
            "type" => "int"
        ],
    ],
    
    // Statistics existing for each player
    "player" => [
            
        // 18+ obstacles
        "removedObstacles" => [
            "id" => 18,
            "name" => totranslate("Removed obstacles"),
            "type" => "int"
        ],

        // 20+ modules
        "deployedModules" => [
            "id" => 20,
            "name" => totranslate("Deployed modules"),
            "type" => "int"
        ],
        "deployedModules".ORANGE => [
            "id" => 20 + ORANGE,
            "name" => totranslate("Deployed orange modules"),
            "type" => "int"
        ],
        "deployedModules".BLUE => [
            "id" => 20 + BLUE,
            "name" => totranslate("Deployed blue modules"),
            "type" => "int"
        ],
        "deployedModules".PURPLE => [
            "id" => 20 + PURPLE,
            "name" => totranslate("Deployed purple modules"),
            "type" => "int"
        ],
        "deployedModules".GREEN => [
            "id" => 20 + GREEN,
            "name" => totranslate("Deployed green modules"),
            "type" => "int"
        ],
        
        "deployedModulesYear1" => [
            "id" => 24 + 1,
            "name" => totranslate("Deployed modules of year 1"),
            "type" => "int"
        ],
        "deployedModulesYear2" => [
            "id" => 24 + 2,
            "name" => totranslate("Deployed modules of year 2"),
            "type" => "int"
        ],
        "deployedModulesYear3" => [
            "id" => 24 + 3,
            "name" => totranslate("Deployed modules of year 3"),
            "type" => "int"
        ],

        "activatedModules" => [
            "id" => 28,
            "name" => totranslate("Activated modules"),
            "type" => "int"
        ],

        "spentModules" => [
            "id" => 29,
            "name" => totranslate("Spent modules"),
            "type" => "int"
        ],

        // 30+ experiments
        "deployedExperiments" => [
            "id" => 30,
            "name" => totranslate("Deployed experiments"),
            "type" => "int"
        ],
        "deployedExperiments".LEFT => [
            "id" => 30 + LEFT,
            "name" => totranslate("Deployed left side experiments"),
            "type" => "int"
        ],
        "deployedExperiments".CENTRAL => [
            "id" => 30 + CENTRAL,
            "name" => totranslate("Deployed center experiments"),
            "type" => "int"
        ],
        "deployedExperiments".RIGHT => [
            "id" => 30 + RIGHT,
            "name" => totranslate("Deployed right side experiments"),
            "type" => "int"
        ],

        "completeExperimentLines" => [
            "id" => 34,
            "name" => totranslate("Complete experiment lines"),
            "type" => "int"
        ],
        "uncompleteExperimentLines2" => [
            "id" => 35,
            "name" => totranslate("Uncomplete experiment lines (2 tiles)"),
            "type" => "int"
        ],
        "uncompleteExperimentLines1" => [
            "id" => 36,
            "name" => totranslate("Uncomplete experiment lines (1 tile)"),
            "type" => "int"
        ],
        
        // 40+ missions
        "gainedMissions" => [
            "id" => 40,
            "name" => totranslate("Gained missions"),
            "type" => "int"
        ],    
        "gainedMissionsFromDeck" => [
            "id" => 41,
            "name" => totranslate("Gained missions (from research board)"),
            "type" => "int"
        ],   
        "gainedMissionsFromPlayer" => [
            "id" => 42,
            "name" => totranslate("Gained missions (from another player)"),
            "type" => "int"
        ],    
        "lostMissions" => [
            "id" => 43,
            "name" => totranslate("Lost missions"),
            "type" => "int"
        ], 
        "endMissions" => [
            "id" => 44,
            "name" => totranslate("Missions at the end of the game"),
            "type" => "int"
        ],

        // 50+ astronauts
        "upgradedAstronauts" => [
            "id" => 50,
            "name" => totranslate("Upgraded astronauts"),
            "type" => "int"
        ],   
        "power".EXPERIMENT_POWER_REACTIVATE => [
            "id" => 51,
            "name" => totranslate("Use of reactivate astronauts effect"),
            "type" => "int"
        ],   
        "power".EXPERIMENT_POWER_REACTIVATE."result" => [
            "id" => 52,
            "name" => totranslate("Reactivated astronauts with effect"),
            "type" => "int"
        ],    
        "power".EXPERIMENT_POWER_TIME => [
            "id" => 53,
            "name" => totranslate("Use of time units effect"),
            "type" => "int"
        ],   
        "power".EXPERIMENT_POWER_TIME."result" => [
            "id" => 54,
            "name" => totranslate("Moved astronauts with time units effect"),
            "type" => "int"
        ], 
        "skippedAstronaut" => [
            "id" => 55,
            "name" => totranslate("Astronaut skipped with remaining work value"),
            "type" => "int"
        ], 

        // 60+ points
        "sciencePoints" => [
            "id" => 60,
            "name" => totranslate("Points gained with science"),
            "type" => "int"
        ],   
        "researchPoints" => [
            "id" => 61,
            "name" => totranslate("Gained research points"),
            "type" => "int"
        ],
        "researchPointsByScience" => [
            "id" => 62,
            "name" => totranslate("Research points cost per science"),
            "type" => "float"
        ],  
        "vpWithModules" => [
            "id" => 63,
            "name" => totranslate("VP gained with modules"),
            "type" => "int"
        ],   
        "vpWithSquares" => [
            "id" => 67,
            "name" => totranslate("VP gained with completed squares"),
            "type" => "int"
        ], 
        "vpWithExperiments" => [
            "id" => 64,
            "name" => totranslate("VP gained with experiments"),
            "type" => "int"
        ],   
        "vpWithMissions" => [
            "id" => 65,
            "name" => totranslate("VP gained with missions"),
            "type" => "int"
        ],     
        "vpWithRemainingResources" => [
            "id" => 66,
            "name" => totranslate("VP gained with remaining resources"),
            "type" => "int"
        ],    
        "vpWithGreenhouses" => [
            "id" => 68,
            "name" => totranslate("VP gained with greenhouses"),
            "type" => "int"
        ], 
    ],
];
