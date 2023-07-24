<?php

trait DebugUtilTrait {

//////////////////////////////////////////////////////////////////////////////
//////////// Utility functions
////////////

    function debugSetup() {
        if ($this->getBgaEnvironment() != 'studio') { 
            return;
        } 

        //$this->debugR(3);
        //$this->debugWorkforce();
    }

    function debugR($r) {
		$this->DbQuery("UPDATE module SET `r` = $r WHERE card_location = 'player'");
    }
    
    function debugWorkforce() {
		$this->DbQuery("UPDATE worker SET `workforce` = 10, `remaining_workforce` = 10");
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
			foreach ([1,2,3,4,5] as $i) { $this->DbQuery("UPDATE module SET card_location='played$sid-$i' WHERE card_location='played$id-$i'" ); }
			$this->DbQuery("UPDATE experiment SET card_location='played$sid' WHERE card_location='played$id'" );
			$this->DbQuery("UPDATE experiment SET card_location_arg=$sid WHERE card_location_arg = $id" );

            
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
