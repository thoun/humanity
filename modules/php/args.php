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

    function getTimeUnitUseful(int $playerId) {
        $tableAstronauts = $this->getPlayerAstronauts($playerId, 'table');
        $arm = $this->getArm();
        return count(array_filter($tableAstronauts, fn($astronaut) => $astronaut->spot != $arm)) > 0;
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

        $astronauts = $this->getPlayerAstronauts($playerId, 'player', false);
        $reactivatableAstronauts = $this->array_some($astronauts, fn($a) => $a->remainingWorkforce <= 0);

        return [
            'astronaut' => $astronaut,
            'activatableModules' => $activatableModules,
            'timeUnitUseful' => $this->getTimeUnitUseful($playerId),
            'selectableModules' => $selectableModules,
            'selectableExperiments' => $selectableExperiments,
            'reactivatableAstronauts' => $reactivatableAstronauts,
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
            'timeUnitUseful' => $this->getTimeUnitUseful($playerId),
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
        $manualAdvancedResource = property_exists($currentAction, 'manualAdvancedResource') ? $currentAction->manualAdvancedResource : null;
        $usedForManualAdvancedResource = property_exists($currentAction, 'usedForManualAdvancedResource') ? $currentAction->usedForManualAdvancedResource : null;

        $remainingCost = $manualAdvancedResource ? [$manualAdvancedResource - 10 => 3] : (array)$currentAction->remainingCost;

        $pay = $this->canPay($remainingCost, $playerId);
        
        $remainingNeededResourceTypes = array_keys($remainingCost);
        $playerModules = $this->getModulesByLocation('player', $playerId);

        $payButtons = [];
        foreach ($playerModules as $module) {
            if ($module->r > 0 && $module->production != null) {
                foreach ($module->production as $produce) {
                    if ($produce == ELECTRICITY) {
                        foreach ($remainingNeededResourceTypes as $type) {
                            if ($type < 10) {
                                $payButtons[$module->id][] = $type;
                            }
                        }
                    } else if (in_array($produce, $remainingNeededResourceTypes)) {
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
            'manualAdvancedResource' => $manualAdvancedResource,
            'usedForManualAdvancedResource' => $usedForManualAdvancedResource,
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
