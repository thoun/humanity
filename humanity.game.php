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
  * humanity.game.php
  *
  * This is the main file for your game logic.
  *
  * In this PHP file, you are going to defines the rules of the game.
  *
  */


require_once(APP_GAMEMODULE_PATH.'module/table/table.game.php');

require_once('modules/php/objects/worker.php');
require_once('modules/php/objects/module.php');
require_once('modules/php/objects/experiment.php');
require_once('modules/php/objects/mission.php');
require_once('modules/php/objects/player.php');
require_once('modules/php/objects/current-action.php');
require_once('modules/php/objects/undo.php');
require_once('modules/php/constants.inc.php');
require_once('modules/php/utils.php');
require_once('modules/php/workers.php');
require_once('modules/php/modules.php');
require_once('modules/php/missions.php');
require_once('modules/php/experiments.php');
require_once('modules/php/actions.php');
require_once('modules/php/states.php');
require_once('modules/php/args.php');
require_once('modules/php/debug-util.php');

class Humanity extends Table {
    use UtilTrait;
    use WorkerTrait;
    use ModuleTrait;
    use MissionTrait;
    use ExperimentTrait;
    use ActionTrait;
    use StateTrait;
    use ArgsTrait;
    use DebugUtilTrait;

	function __construct() {
        // Your global variables labels:
        //  Here, you can assign labels to global variables you are using for this game.
        //  You can use any number of global variables with IDs between 10 and 99.
        //  If your game has options (variants), you also have to associate here a label to
        //  the corresponding ID in gameoptions.inc.php.
        // Note: afterwards, you can get/set the global variables with getGameStateValue/setGameStateInitialValue/setGameStateValue
        parent::__construct();
        
        self::initGameStateLabels([]);   
		
        $this->modules = $this->getNew("module.common.deck");
        $this->modules->init("module");
		
        $this->experiments = $this->getNew("module.common.deck");
        $this->experiments->init("experiment");   
		
        $this->missions = $this->getNew("module.common.deck");
        $this->missions->init("mission");  
	}
	
    protected function getGameName() {
		// Used for translations and stuff. Please do not modify.
        return "humanity";
    }	

    /*
        setupNewGame:
        
        This method is called only once, when a new game is launched.
        In this method, you must setup the game according to the game rules, so that
        the game is ready to be played.
    */
    protected function setupNewGame( $players, $options = []) {    
        // Set the colors of the players with HTML color code
        // The default below is red/green/blue/orange/brown
        // The number of colors defined here must correspond to the maximum number of players allowed for the gams
        $gameinfos = self::getGameinfos();
        $default_colors = $gameinfos['player_colors'];
 
        // Create players
        // Note: if you added some extra field on "player" table in the database (dbmodel.sql), you can initialize it there.
        $sql = "INSERT INTO player (player_id, player_color, player_canal, player_name, player_avatar) VALUES ";
        $values = [];

        $firstPlayer = null;
        foreach( $players as $player_id => $player ) {
            if ($firstPlayer === null) {
                $firstPlayer = $player_id;
            }
            $color = array_shift( $default_colors );

            $values[] = "('".$player_id."','$color','".$player['player_canal']."','".addslashes( $player['player_name'] )."','".addslashes( $player['player_avatar'] )."')";
        }
        $sql .= implode(',', $values);
        self::DbQuery( $sql );
        self::reattributeColorsBasedOnPreferences( $players, $gameinfos['player_colors'] );
        self::reloadPlayersBasicInfos();
        
        /************ Start the game initialization *****/

        // Init global values with their initial values
        $this->setGlobalVariable(FIRST_PLAYER, $firstPlayer);
        
        // Init game statistics
        // (note: statistics used in this file must be defined in your stats.inc.php file)
        $this->initStat('table', 'roundNumber', 0);
        foreach(['table', 'player'] as $type) {
            foreach([
                "sciencePoints", 
                // cards
                "playedCards", 
                "assetsCollectedByPlayedCards", "assetsCollectedByPlayedCards1", "assetsCollectedByPlayedCards2", "assetsCollectedByPlayedCards3", "assetsCollectedByPlayedCards4", 
                "recruitsUsedToChooseCard", "discardedCards",
                // research
                "discoveredDestinations", "discoveredDestinations1", "discoveredDestinations2",
                "assetsCollectedByDestination", "assetsCollectedByDestination1", "assetsCollectedByDestination2", "assetsCollectedByDestination3", "assetsCollectedByDestination4", "assetsCollectedByDestination5",
                "recruitsUsedToPayDestination",
                // trade
                "tradeActions", "tradeActions1", "tradeActions2", "tradeActions3", "braceletsUsed",
                "assetsCollectedByTrade", "assetsCollectedByTrade1", "assetsCollectedByTrade2", "assetsCollectedByTrade3", "assetsCollectedByTrade4", "assetsCollectedByTrade5",
                //	miscellaneous
                "recruitsMissed", "braceletsMissed",
            ] as $name) {
                $this->initStat($type, $name, 0);
            }
        }

        // setup the initial game situation here
        $this->setupWorkers(array_keys($players));
        $this->setupModules($players);
        $this->setupExperiments();
        $this->setupMissions();

        // Activate first player (which is in general a good idea :) )
        $this->activeNextPlayer();

        // TODO TEMP
        $this->debugSetup();

        /************ End of the game initialization *****/
    }

    /*
        getAllDatas: 
        
        Gather all informations about current game situation (visible by the current player).
        
        The method is called each time the game interface is displayed to a player, ie:
        _ when the game starts
        _ when a player refreshes the game page (F5)
    */
    protected function getAllDatas() {
        $result = [];
    
        $currentPlayerId = intval(self::getCurrentPlayerId());    // !! We must only return informations visible by this player !!
    
        // Get information about players
        // Note: you can retrieve some extra field you added for "player" table in "dbmodel.sql" if you need it.
        $sql = "SELECT player_id id, player_no playerNo, player_research_points researchPoints, player_vp vp, player_science science, player_science science FROM player ";
        $result['players'] = self::getCollectionFromDb( $sql );
  
        // Gather all information about current game situation (visible by player $current_player_id).

        $isEndScore = intval($this->gamestate->state_id()) >= ST_END_SCORE;
        
        foreach($result['players'] as $playerId => &$player) {
            $player['playerNo'] = intval($player['playerNo']);
            
            $player['workers'] = $this->getPlayerWorkers($playerId);
            $player['researchPoints'] = intval($player['researchPoints']);
            $player['vp'] = intval($player['vp']);
            $player['science'] = $isEndScore || $playerId == $currentPlayerId ? intval($player['science']) : null;
            $player['modules'] = $this->getModulesByLocation('player', $playerId);
            $player['experiments'] = $this->getExperimentsByLocation('player', $playerId);
            $player['missions'] = $this->getMissionsByLocation('player', $playerId);
            if ($isEndScore) {
                $player['score'] = $player['vp'] + $player['science'];
            }

            $player['icons'] = $this->getPlayerIcons($playerId);
        }

        $result['tableModules'] = $this->getModulesByLocation('table');
        $result['tableExperiments'] = $this->getExperimentsByLocation('table');
        $result['tableMissions'] = $this->getMissionsByLocation('table');      

        $result['arm'] = $this->getArm();
        $result['year'] = $this->getYear();
        $result['firstPlayerId'] = $this->getGlobalVariable(FIRST_PLAYER);
        $result['isEnd'] = $isEndScore;

        $result['movedWorkers'] = $this->getGlobalVariable(MOVED_WORKERS);
  
        return $result;
    }

    /*
        getGameProgression:
        
        Compute and return the current game progression.
        The number returned must be an integer beween 0 (=the game just started) and
        100 (= the game is finished or almost finished).
    
        This method is called each time we are in a game state with the "updateGameProgression" property set to true 
        (see states.inc.php)
    */
    function getGameProgression() {
        return ($this->getGlobalVariable(YEAR) - 1) * 100 / 3;
    }

//////////////////////////////////////////////////////////////////////////////
//////////// Zombie
////////////

    /*
        zombieTurn:
        
        This method is called each time it is the turn of a player who has quit the game (= "zombie" player).
        You can do whatever you want in order to make sure the turn of this player ends appropriately
        (ex: pass).
        
        Important: your zombie code will be called when the player leaves the game. This action is triggered
        from the main site and propagated to the gameserver from a server, not from a browser.
        As a consequence, there is no current player associated to this action. In your zombieTurn function,
        you must _never_ use getCurrentPlayerId() or getCurrentPlayerName(), otherwise it will fail with a "Not logged" error message. 
    */

    function zombieTurn( $state, $active_player )
    {
    	$statename = $state['name'];
    	
        if ($state['type'] === "activeplayer") {
            switch ($statename) {
                default:
                    $this->gamestate->jumpToState(ST_NEXT_PLAYER);
                    break;
            }

            return;
        }

        if ($state['type'] === "multipleactiveplayer") {
            // Make sure player is in a non blocking status for role turn
            $this->gamestate->setPlayerNonMultiactive( $active_player, 'next');
            
            return;
        }

        throw new feException( "Zombie mode not supported at this game state: ".$statename );
    }
    
///////////////////////////////////////////////////////////////////////////////////:
////////// DB upgrade
//////////

    /*
        upgradeTableDb:
        
        You don't have to care about this until your game has been published on BGA.
        Once your game is on BGA, this method is called everytime the system detects a game running with your old
        Database scheme.
        In this case, if you change your Database scheme, you just have to apply the needed changes in order to
        update the game database and allow the game to continue to run with your new version.
    
    */
    
    function upgradeTableDb($from_version) {
        // $from_version is the current version of this game database, in numerical form.
        // For example, if the game was running with a release of your game named "140430-1345",
        // $from_version is equal to 1404301345

        /*if ($from_version <= 2305241900) {
            // ! important ! Use DBPREFIX_<table_name> for all tables
            self::applyDbUpgradeToAllDB("ALTER TABLE DBPREFIX_player CHANGE COLUMN `player_fame` `player_research` tinyint UNSIGNED NOT NULL DEFAULT 0");
        }*/
    }    
}
