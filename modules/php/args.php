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

    function argChooseAstronaut() {
        $playerId = intval($this->getActivePlayerId());

        $astronauts = $this->getPlayerAstronauts($playerId, 'player', true);

        return [
            'astronauts' => $astronauts,
        ];
    }
   
    function argChooseAction() {
        $playerId = intval($this->getActivePlayerId());

        $astronaut = $this->getSelectedAstronaut();
        $tableModules = $this->getModulesByLocation('table');
        $tableExperiments = $this->getExperimentsByLocation('table');

        $selectableModules = array_values(array_filter($tableModules, fn($module) => 
            $this->canPay($module->cost, $playerId) != null && 
            ($module->color != GREEN || $this->canPlaceGreenhouse($playerId, $module, $astronaut)))
        );
        $selectableExperiments = array_values(array_filter($tableExperiments, fn($module) => $this->canPay($module->cost, $playerId) != null));
        

        $playerModules = $this->getModulesByLocation('player', $playerId);
        $activatableModules = array_values(array_filter($playerModules, fn($module) => $module->workforce != null && $module->r < 3 && $module->workforce <= $astronaut->remainingWorkforce));

        return [
            'astronaut' => $astronaut,
            'activatableModules' => $activatableModules,
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

    function argChooseCommunicationColor() {
        $astronaut = $this->getSelectedAstronaut();

        return [
            'astronaut' => $astronaut,
        ];
    }

    function argPay() {
        $playerId = intval($this->getActivePlayerId());
        
        $currentAction = $this->getGlobalVariable(CURRENT_ACTION);
        $astronaut = $this->getAstronautById($currentAction->selectedAstronaut);
        

        $pay = $this->canPay((array)$currentAction->remainingCost, $playerId);
        
        $remainingNeededResourceTypes = array_keys((array)$currentAction->remainingCost);
        $playerModules = $this->getModulesByLocation('player', $playerId);

        $payButtons = [];
        foreach ($playerModules as $module) {
            if ($module->r > 0 && $module->production != null) {
                foreach ($module->production as $produce) {
                    if (in_array($produce, $remainingNeededResourceTypes)) {
                        $payButtons[$module->id][] = $produce;
                    }
                }
            }
        };

        return [
            'astronaut' => $astronaut,
            'cost' => $currentAction->remainingCost,
            'autoPay' => $pay ? $pay['payWith'] : null,
            'payButtons' => $payButtons,
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
            'canUndo' => count($alreadyMovedAstronauts) > 0,
        ];
    }

    function argMoveAstronauts() {
        $movedAstronauts = $this->getGlobalVariable(MOVED_ASTRONAUTS);
        $activePlayersIds = array_values(array_unique(array_map(fn($astronaut) => $astronaut->playerId, $movedAstronauts)));

        return [
            'activePlayersIds' => $activePlayersIds,
        ];
    }
} 
