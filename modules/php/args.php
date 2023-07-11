<?php

trait ArgsTrait {
    
//////////////////////////////////////////////////////////////////////////////
//////////// Game state arguments
////////////

    /*
        Here, you can create methods defined as "game state arguments" (see "args" property in states.inc.php).
        These methods function is to return some additional information that is specific to the current
        game state.
    */

    function argChooseWorker() {
        $playerId = intval($this->getActivePlayerId());

        $workers = $this->getPlayerWorkers($playerId, 'player', true);

        return [
            'workers' => $workers,
        ];
    }

    function argActivateTile(int $playerId) {
        $playerTiles = $this->getTilesByLocation('player', $playerId);

        $activatableTiles = array_values(array_filter($playerTiles, fn($tile) => $tile->workforce != null && $tile->r < 3));

        return [
            'activatableTiles' => $activatableTiles,
        ];
    }
   
    function argPlayAction() {
        $playerId = intval($this->getActivePlayerId());

        $worker = $this->getSelectedWorker();
        $argActivateTile = $this->argActivateTile($playerId);

        return [
            'worker' => $worker,
        ] + $argActivateTile;
    }
} 
