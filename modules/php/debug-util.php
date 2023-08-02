<?php

trait DebugUtilTrait {

//////////////////////////////////////////////////////////////////////////////
//////////// Utility functions
////////////

    function debugSetup() {
        if ($this->getBgaEnvironment() != 'studio') { 
            return;
        } 

		/*$this->DbQuery("UPDATE module SET `card_type` = 1, `card_type_arg` = 13 WHERE x = 0 AND y = 0");
		$this->DbQuery("UPDATE module SET `card_type` = 1, `card_type_arg` = 15 WHERE x = -1 AND y = 0");
		$this->DbQuery("UPDATE module SET `card_type` = 1, `card_type_arg` = 14 WHERE x = -1 AND y = 1");
		$this->DbQuery("UPDATE astronaut SET `x` = -2, `y` = 1");

		$this->DbQuery("UPDATE module SET `card_type` = 2, `card_type_arg` = 14 WHERE card_location ='table' AND card_location_arg = 7");
		$this->DbQuery("UPDATE module SET `card_type` = 2, `card_type_arg` = 13 WHERE card_location ='table' AND card_location_arg = 1");
		$this->DbQuery("UPDATE module SET `card_type` = 2, `card_type_arg` = 15 WHERE card_location ='table' AND card_location_arg = 2");*/
        //$this->debugR(3);
        //$this->debugWorkforce();
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

    public function debugReplacePlayersIds() {
        if ($this->getBgaEnvironment() != 'studio') { 
            return;
        } 

		// These are the id's from the BGAtable I need to debug.
		/*$ids = [
            84319026,
86175279
		];*/
        $ids = array_map(fn($dbPlayer) => intval($dbPlayer['player_id']), array_values($this->getCollectionFromDb('select player_id from player order by player_no')));

		// Id of the first player in BGA Studio
		$sid = 2343492;
		
		foreach ($ids as $id) {
			// basic tables
			$this->DbQuery("UPDATE player SET player_id=$sid WHERE player_id = $id" );
			$this->DbQuery("UPDATE global SET global_value=$sid WHERE global_value = $id" );

			// 'other' game specific tables. example:
			// tables specific to your schema that use player_ids
			$this->DbQuery("UPDATE module SET card_location_arg=$sid WHERE card_location_arg = $id" );
			$this->DbQuery("UPDATE experiment SET card_location_arg=$sid WHERE card_location_arg=$id" );
			$this->DbQuery("UPDATE mission SET card_location_arg=$sid WHERE card_location_arg = $id" );
			$this->DbQuery("UPDATE astronaut SET player_id=$sid WHERE player_id = $id" );
            
			++$sid;
		}

        self::reloadPlayersBasicInfos();
	}

    function debug($debugData) {
        if ($this->getBgaEnvironment() != 'studio') { 
            return;
        }die('debug data : '.json_encode($debugData));
    }
}
