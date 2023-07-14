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
        $playerIcons = $this->getPlayerIcons($playerId);

        $tableTiles = $this->getTilesByLocation('table');
        $tableResearch = $this->getResearchsByLocation('table');

        $selectableTiles = array_values(array_filter($tableTiles, fn($tile) => $this->canPay($tile->cost, $playerIcons) != null));
        $selectableResearch = array_values(array_filter($tableResearch, fn($tile) => $this->canPay($tile->cost, $playerIcons) != null));

        return [
            'selectableTiles' => $selectableTiles,
            'selectableResearch' => $selectableResearch,
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

    function argMoveWorker(int $playerId) {
        $movedWorkers = $this->getGlobalVariable(MOVED_WORKERS);
        $playerMovedWorkers = array_values(array_filter($movedWorkers, fn($worker) => $worker->playerId));
        $alreadyMovedWorkers = array_values(array_filter($playerMovedWorkers, fn($worker) => $worker->x !== null));
        $worker = $this->array_find($playerMovedWorkers, fn($worker) => $worker->x === null);

        $possibleCoordinates = $this->getWorkerPossibleCoordinates($playerId, $alreadyMovedWorkers);

        return [
            'playerMovedWorkers' => $playerMovedWorkers,
            'worker' => $worker,
            'possibleCoordinates' => $possibleCoordinates,
        ];
    }
} 
