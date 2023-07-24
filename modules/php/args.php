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
   
    function argChooseAction() {
        $playerId = intval($this->getActivePlayerId());

        $astronauts = $this->getPlayerAstronauts($playerId, 'player', true);

        $tableModules = $this->getModulesByLocation('table');
        $tableExperiments = $this->getExperimentsByLocation('table');

        $selectableModules = array_values(array_filter($tableModules, fn($module) => 
            $this->canPay($module->cost, $playerId) != null && 
            ($module->color != GREEN || $this->array_some($astronauts, fn($astronaut) => $this->canPlaceGreenhouse($playerId, $module, $astronaut))))
        );
        $selectableExperiments = array_values(array_filter($tableExperiments, fn($module) => $this->canPay($module->cost, $playerId) != null));
        

        return [
            'astronauts' => $astronauts,
            'selectableModules' => $selectableModules,
            'selectableExperiments' => $selectableExperiments,
        ];
    }

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

    function argPay() {
        $playerId = intval($this->getActivePlayerId());
        
        $currentAction = $this->getGlobalVariable(CURRENT_ACTION);
        
        $pay = $this->canPay((array)$currentAction->remainingCost, $playerId)['payWith'];

        return [
            'cost' => $currentAction->remainingCost,
            'pay' => $pay,
        ];
    }

    function argChooseAstronaut() {
        $playerId = intval($this->getActivePlayerId());

        $astronauts = $this->getPlayerAstronauts($playerId, 'player', true);
        
        $currentAction = $this->getGlobalVariable(CURRENT_ACTION);
        if ($currentAction->type == 'module') {
            $module = $this->getModuleById($currentAction->addModuleId);

            if ($module->color == GREEN) {
                $astronauts = array_values(array_filter($astronauts, fn($astronaut) => $this->canPlaceGreenhouse($playerId, $module, $astronaut)));
            }
        }

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
