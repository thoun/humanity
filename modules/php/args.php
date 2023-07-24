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

        $astronaut = $this->getSelectedAstronaut();
        $activatableModules = array_values(array_filter($playerModules, fn($module) => $module->workforce != null && $module->r < 3 && $module->workforce <= $astronaut->remainingWorkforce));

        return [
            'astronaut' => $astronaut,
            'remaining' => $astronaut->remainingWorkforce, // for title
            'activatableModules' => $activatableModules,
        ];
    }
   
    function argChooseAction() {
        $playerId = intval($this->getActivePlayerId());
        $playerIcons = $this->getPlayerIcons($playerId);

        $tableModules = $this->getModulesByLocation('table');
        $tableExperiments = $this->getExperimentsByLocation('table');

        $selectableModules = array_values(array_filter($tableModules, fn($module) => $this->canPay($module->cost, $playerIcons) != null));
        $selectableExperiments = array_values(array_filter($tableExperiments, fn($module) => $this->canPay($module->cost, $playerIcons) != null));

        return [
            'selectableModules' => $selectableModules,
            'selectableExperiments' => $selectableExperiments,
        ] + $this->argChooseAstronaut();
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

    function argChooseAstronaut() {
        $playerId = intval($this->getActivePlayerId());

        $astronauts = $this->getPlayerAstronauts($playerId, 'player', true);

        return [
            'astronauts' => $astronauts,
        ];
    }

    function argUpgradeAstronaut() {
        $playerId = intval($this->getActivePlayerId());

        $astronauts = $this->getPlayerAstronauts($playerId);
        $astronauts = array_values(array_filter($astronauts, fn($astronaut) => $astronaut->workforce < 4));
        
        $currentAction = $this->getGlobalVariable(CURRENT_ACTION);

        return [
            'remaining' => $currentAction->upgrade, // for title
            'astronauts' => $astronauts,
        ];
    }

    function argMoveAstronaut(int $playerId) {
        $movedAstronauts = $this->getGlobalVariable(MOVED_ASTRONAUTS);
        $playerMovedAstronauts = array_values(array_filter($movedAstronauts, fn($astronaut) => $astronaut->playerId == $playerId));
        $alreadyMovedAstronauts = array_values(array_filter($playerMovedAstronauts, fn($astronaut) => $astronaut->x !== null));
        $astronaut = $this->array_find($playerMovedAstronauts, fn($astronaut) => $astronaut->x === null);

        $possibleCoordinates = $this->getAstronautPossibleCoordinates($playerId, $alreadyMovedAstronauts);

        return [
            'playerMovedAstronauts' => $playerMovedAstronauts,
            'astronaut' => $astronaut,
            'possibleCoordinates' => $possibleCoordinates,
        ];
    }
} 
