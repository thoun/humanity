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

    function argActivateModule() {
        $playerId = intval($this->getActivePlayerId());

        $playerModules = $this->getModulesByLocation('player', $playerId);

        $worker = $this->getSelectedWorker();
        $activatableModules = array_values(array_filter($playerModules, fn($module) => $module->workforce != null && $module->r < 3 && $module->workforce <= $worker->remainingWorkforce));

        return [
            'worker' => $worker,
            'remaining' => $worker->remainingWorkforce, // for title
            'activatableModules' => $activatableModules,
        ];
    }
   
    function argChooseAction() {
        $playerId = intval($this->getActivePlayerId());
        $playerIcons = $this->getPlayerIcons($playerId);

        $tableModules = $this->getModulesByLocation('table');
        $tableResearch = $this->getResearchsByLocation('table');

        $selectableModules = array_values(array_filter($tableModules, fn($module) => $this->canPay($module->cost, $playerIcons) != null));
        $selectableResearch = array_values(array_filter($tableResearch, fn($module) => $this->canPay($module->cost, $playerIcons) != null));

        return [
            'selectableModules' => $selectableModules,
            'selectableResearch' => $selectableResearch,
        ] + $this->argChooseWorker();
    }

    function argPay() {
        $playerId = intval($this->getActivePlayerId());
        $playerIcons = $this->getPlayerIcons($playerId);
        
        $currentAction = $this->getGlobalVariable(CURRENT_ACTION);
        
        $pay = $this->canPay((array)$currentAction->remainingCost, $playerIcons);

        return [
            'cost' => $currentAction->remainingCost,
            'pay' => $pay,
        ];
    }

    function argChooseWorker() {
        $playerId = intval($this->getActivePlayerId());

        $workers = $this->getPlayerWorkers($playerId, 'player', true);

        return [
            'workers' => $workers,
        ];
    }

    function argUpgradeWorker() {
        $playerId = intval($this->getActivePlayerId());

        $workers = $this->getPlayerWorkers($playerId);
        $workers = array_values(array_filter($workers, fn($worker) => $worker->workforce < 4));
        
        $currentAction = $this->getGlobalVariable(CURRENT_ACTION);

        return [
            'remaining' => $currentAction->upgrade, // for title
            'workers' => $workers,
        ];
    }

    function argMoveWorker(int $playerId) {
        $movedWorkers = $this->getGlobalVariable(MOVED_WORKERS);
        $playerMovedWorkers = array_values(array_filter($movedWorkers, fn($worker) => $worker->playerId == $playerId));
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
