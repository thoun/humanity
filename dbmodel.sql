
-- ------
-- BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
-- Humanity implementation : © <Your name here> <Your email address here>
-- 
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-- -----

-- dbmodel.sql

-- This is the file where you are describing the database schema of your game
-- Basically, you just have to export from PhpMyAdmin your table structure and copy/paste
-- this export here.
-- Note that the database itself and the standard tables ("global", "stats", "gamelog" and "player") are
-- already created and must not be created here

-- Note: The database schema is created from this file when the game starts. If you modify this file,
--       you have to restart a game to see your changes in database.

-- Example 1: create a standard "card" table to be used with the "Deck" tools (see example game "hearts"):

CREATE TABLE IF NOT EXISTS `module` (
   `card_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
   `card_type` tinyint(1) NOT NULL,
   `card_type_arg` tinyint(1) NOT NULL,
   `card_location` varchar(16) NOT NULL,
   `card_location_arg` int(11) NOT NULL,
   `x` smallint(2) NULL,
   `y` smallint(2) NULL,
   `r` tinyint(1) UNSIGNED NOT NULL DEFAULT 0,
   PRIMARY KEY (`card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;

CREATE TABLE IF NOT EXISTS `research` (
   `card_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
   `card_type` tinyint(1) NOT NULL,
   `card_type_arg` tinyint(2) NOT NULL,
   `card_location` varchar(16) NOT NULL,
   `card_location_arg` int(11) NOT NULL,
   `line` smallint(2) NULL,
   PRIMARY KEY (`card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;

CREATE TABLE IF NOT EXISTS `objective` (
   `card_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
   `card_type` tinyint(1) NOT NULL,
   `card_type_arg` tinyint(2) NOT NULL,
   `card_location` varchar(16) NOT NULL,
   `card_location_arg` int(11) NOT NULL,
   PRIMARY KEY (`card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;

-- Example 2: add a custom field to the standard "player" table
ALTER TABLE `player` ADD `player_research_points` smallint UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE `player` ADD `player_vp` smallint UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE `player` ADD `player_science` smallint UNSIGNED NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS `worker` (
  `id` TINYINT unsigned NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `workforce` TINYINT unsigned NOT NULL DEFAULT 2,
  `remaining_workforce` TINYINT unsigned NOT NULL DEFAULT 2,
  `location` varchar(16) NOT NULL DEFAULT 'player',
   `x` smallint(2) NULL,
   `y` smallint(2) NULL,
   `spot` tinyint(1) UNSIGNED NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `global_variables` (
  `name` varchar(50) NOT NULL,
  `value` json,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

