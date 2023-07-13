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

    function argActivateTile() {
        $playerId = intval($this->getActivePlayerId());

        $playerTiles = $this->getTilesByLocation('player', $playerId);

        $worker = $this->getSelectedWorker();
        $activatableTiles = array_values(array_filter($playerTiles, fn($tile) => $tile->workforce != null && $tile->r < 3));

        return [
            'remaining' => $worker->remainingWorkforce, // for title
            'activatableTiles' => $activatableTiles,
        ];
    }
   
    function argChooseAction() {
        $playerId = intval($this->getActivePlayerId());

        return [
        ] + $this->argChooseWorker();
    }

    function argPay() {
        $playerId = intval($this->getActivePlayerId());

        return [
            // TODO
        ];
    }

    function argChooseWorker() {
        $playerId = intval($this->getActivePlayerId());

        $workers = $this->getPlayerWorkers($playerId, 'player', true);

        return [
            'workers' => $workers,
        ];
    }
} 
