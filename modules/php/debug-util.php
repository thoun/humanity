<?php

trait DebugUtilTrait {

//////////////////////////////////////////////////////////////////////////////
//////////// Utility functions
////////////

    function debugSetup() {
        if ($this->getBgaEnvironment() != 'studio') { 
            return;
        } 
        
	    //$this->DbQuery("UPDATE player SET `player_vp` = 36, `player_science` = 10");
        //$this->DbQuery("UPDATE player SET player_research_points = 49");

	    /*$this->DbQuery("UPDATE module SET `card_type` = 1, `card_type_arg` = 13 WHERE x = 0 AND y = 0");
		$this->DbQuery("UPDATE module SET `card_type` = 1, `card_type_arg` = 15 WHERE x = -1 AND y = 0");
		$this->DbQuery("UPDATE module SET `card_type` = 1, `card_type_arg` = 14 WHERE x = -1 AND y = 1");
		$this->DbQuery("UPDATE astronaut SET `x` = -2, `y` = 1");

		$this->DbQuery("UPDATE module SET `card_type` = 2, `card_type_arg` = 14 WHERE card_location ='table' AND card_location_arg = 7");
		$this->DbQuery("UPDATE module SET `card_type` = 2, `card_type_arg` = 13 WHERE card_location ='table' AND card_location_arg = 1");
		$this->DbQuery("UPDATE module SET `card_type` = 2, `card_type_arg` = 15 WHERE card_location ='table' AND card_location_arg = 2");*/
        //$this->debugR(0);
        //$this->debugWorkforce();

        //$this->debugRemoveObstacles();
        //$this->debugNewAstronauts(2343492);
        //$this->debugNewAstronauts(2343493);*/
		//$this->DbQuery("UPDATE module SET `card_type` = 1, `card_type_arg` = 3 WHERE x = -1 AND y = 1");
	    /*$this->DbQuery("UPDATE player SET `player_research_points` = 6 WHERE player_id = 2343492");
	    $this->DbQuery("UPDATE player SET `player_research_points` = 9 WHERE player_id = 2343493");
	    $this->DbQuery("UPDATE player SET `player_research_points` = 9 WHERE player_id = 2343494");
	    $this->DbQuery("UPDATE player SET `player_research_points` = 30 WHERE player_id = 2343495");*/
        //$this->DbQuery("UPDATE module SET `r` = 1 WHERE card_location_arg = 2343492 AND `card_type` = 0 AND `card_type_arg` = 4");
        //$this->DbQuery("UPDATE module SET `r` = 3, `card_location` = 'player', card_location_arg = 2343492, x = -1, y = 2 WHERE `card_type` = 1 AND `card_type_arg` = 5");
        //$this->DbQuery("UPDATE module SET `r` = 3, `card_location` = 'player', card_location_arg = 2343492, x = -1, y = 3 WHERE `card_type` = 1 AND `card_type_arg` = 6");
        //$this->DbQuery("UPDATE experiment SET card_location ='table', card_location_arg = 0 WHERE `card_type` = 3 AND `card_type_arg` = 1");

        //$this->setGlobalVariable(YEAR, 3);
        //$this->debugEndYear(3);
    }

    function debugR($r) {
		$this->DbQuery("UPDATE module SET `r` = $r WHERE card_location = 'player'");
    }
    
    function debugWorkforce() {
		$this->DbQuery("UPDATE astronaut SET `workforce` = 10, `remaining_workforce` = 10");
    }
    
    // debugEndYear(1)
    // debugEndYear(2)
    // debugEndYear(3)
    function debugEndYear($year) {
		$this->DbQuery("UPDATE module SET `card_location` = 'void' WHERE `card_location` = 'deck$year'");
    }

    function debugEnd() {
		$this->gamestate->jumpToState(ST_END_SCORE);
    }

    function debugRemoveObstacles() {
        $this->DbQuery("DELETE FROM module WHERE `card_type` = 9");
    }

    function debugNewAstronauts($playerId) {
        $modules = $this->getModulesByLocation('player', $playerId);
        $diagonal = true;

        foreach($modules as $module) {
            for ($x = -1; $x <= 1; $x++) {
                for ($y = -1; $y <= 1; $y++) {
                    if ($x === 0 && $y === 0) { continue; }
                    if (!$diagonal && $x !== 0 && $y !== 0) { continue; }

                    $adjacentModule = $this->array_find($modules, fn($m) => 
                        $m->x === $module->x + $x && $m->y === $module->y + $y
                    );

                    $ax = $module->x + $x;
                    $ay = $module->y + $y;
                    if ($adjacentModule == null && intval($this->getUniqueValueFromDB("SELECT count(*) FROM astronaut WHERE x = $ax AND y = $ay AND player_id = $playerId")) == 0) {
                        $this->DbQuery("INSERT INTO astronaut (`player_id`, `location`, `x`, `y`) VALUES ($playerId, 'player', $ax, $ay)");
                    }
                }
            }
        }
    }
}
