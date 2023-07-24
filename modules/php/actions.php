<?php

if (!function_exists('str_starts_with')) {
    function str_starts_with($haystack, $needle) {
        return (string)$needle !== '' && strncmp($haystack, $needle, strlen($needle)) === 0;
    }
}

trait ActionTrait {

    //////////////////////////////////////////////////////////////////////////////
    //////////// Player actions
    //////////// 
    
    /*
        Each time a player is doing some game action, one of the methods below is called.
        (note: each method below must match an input method in nicodemus.action.php)
    */

    public function chooseAstronaut(int $id) {
        self::checkAction('chooseAstronaut');

        $args = $this->argChooseAstronaut();
        $astronaut = $this->array_find($args['astronauts'], fn($astronaut) => $astronaut->id == $id);

        if ($astronaut == null) {
            throw new BgaUserException("Invalid astronaut");
        }
        
        $playerId = intval($this->getActivePlayerId());
        $stateId = intval($this->gamestate->state_id());
        
        if ($stateId == ST_PLAYER_CHOOSE_ACTION) {
            $currentAction = new CurrentAction('activate');
            $currentAction->selectedAstronaut = $id;
            $this->setGlobalVariable(CURRENT_ACTION, $currentAction);

            self::notifyAllPlayers('log', clienttranslate('${player_name} selects a astronaut of work value ${work_value} to activate modules'), [
                'playerId' => $playerId,
                'player_name' => $this->getPlayerName($playerId),
                'work_value' => $astronaut->workforce,
            ]);

            $this->gamestate->nextState('activate');
        } else {

            $currentAction = $this->getGlobalVariable(CURRENT_ACTION);
            $currentAction->selectedAstronaut = $id;
            $this->setGlobalVariable(CURRENT_ACTION, $currentAction);

            $upgrade = 0;
            if ($currentAction->type == 'module') {
                $upgrade = $this->deployModule($playerId, $currentAction, $astronaut);
            } else if ($currentAction->type == 'experiment') {
                $this->deployExperiment($playerId, $currentAction, $astronaut);
            }

            if ($upgrade > 0) {
                $currentAction->upgrade = $upgrade;
                $this->setGlobalVariable(CURRENT_ACTION, $currentAction);
            }

            $this->gamestate->nextState($upgrade > 0 ? 'upgrade' : 'endTurn');
        }
    }

    public function activateModule(int $id) {
        self::checkAction('activateModule');

        $astronaut = $this->getSelectedAstronaut();
        if ($astronaut == null) {
            throw new BgaUserException("No active astronaut");
        }

        $playerId = intval($this->getActivePlayerId());
        $argActivateModule = $this->argActivateModule($playerId);

        $module = $this->array_find($argActivateModule['activatableModules'], fn($t) => $t->id == $id);
        if ($module == null) {
            throw new BgaUserException("You cannot activate this module");
        }

        if ($astronaut->remainingWorkforce < $module->workforce) {
            throw new BgaUserException("Not enough remaining work value");
        }
        $astronaut->remainingWorkforce -= $module->workforce;
        $this->DbQuery("UPDATE astronaut SET `remaining_workforce` = $astronaut->remainingWorkforce WHERE `id` = $astronaut->id");

        $message = null;
        $args = [];
        if ($module->matchType) {
            if ($module->matchType == EXPERIMENT_POWER_TIME) {
                $this->gainTimeUnit($playerId, 1);
            }
            $message = clienttranslate('${player_name} activates a module to trigger TODO POWER TIME effect ${module_image}');
        } else {
            if ($module->r >= 3) {
                throw new BgaUserException("You cannot activate this module (already fully activated)");
            }
            $module->r += 1;
            $this->DbQuery("UPDATE module SET `r` = $module->r WHERE `card_id` = $module->id");

            if ($module->type == 9) {
                $message = clienttranslate('${player_name} activates an obstacle to reduce resistance to ${resistance} ${module_image}');
                $args['resistance'] = 3 - $module->r;
            } else {                
                $message = clienttranslate('${player_name} activates a module to set its production to ${types} ${module_image}');
                $args['types'] = $module->getProduction();
            }
        }

        self::notifyAllPlayers('activateModule', $message, $args + [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'module' => $module,
            'icons' => $this->getPlayerIcons($playerId),
            'module_image' => '',
            'preserve' => ['module'],
        ]);

        if ($module->type == 9 && $module->r == 3) {
            $this->modules->moveCard($module->id, 'void');

            $this->incPlayerResearchPoints($playerId, 3);

            self::notifyAllPlayers('removeModule', clienttranslate('${player_name} removes an obstacle and gain 3 research points'), [
                'playerId' => $playerId,
                'player_name' => $this->getPlayerName($playerId),
                'module' => $module,
            ]);
        }

        if ($astronaut->remainingWorkforce > 0) {
            $this->gamestate->nextState('stay');
        } else {
            $this->applyEndOfActivation($playerId, $astronaut);
        }
    }

    public function chooseNewModule(int $id) {
        self::checkAction('chooseNewModule');

        $playerId = intval($this->getActivePlayerId());
        $module = $this->getModuleById($id);

        $currentAction = new CurrentAction('module');
        $currentAction->addModuleId = $id;
        $currentAction->removeModuleId = $id;
        $currentAction->remainingCost = $module->cost;
        $currentAction->astronautSpot = $module->locationArg;
        $this->setGlobalVariable(CURRENT_ACTION, $currentAction);

        self::notifyAllPlayers('log', clienttranslate('${player_name} chooses a module to deploy ${module_image}'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'module' => $module,
            'module_image' => '',
            'preserve' => ['module'],
        ]);

        $this->gamestate->nextState($module->color == BLUE_OR_ORANGE ? 'chooseCommunicationColor' : 'pay');
    }

    public function chooseCommunicationColor(int $color) {
        self::checkAction('chooseCommunicationColor');

        if (!in_array($color, [BLUE, ORANGE])) {
            throw new BgaUserException("Invalid color");
        }

        $playerId = intval($this->getActivePlayerId());
        $currentAction = $this->getGlobalVariable(CURRENT_ACTION);

        $communicationModules = $this->getModulesByLocation('communication');
        $module = $this->getModuleById($currentAction->removeModuleId);
        $module = $this->array_find($communicationModules, fn($t) => $t->color == $color && $t->researchPoints == $module->researchPoints);

        $currentAction->addModuleId = $module->id;
        $this->setGlobalVariable(CURRENT_ACTION, $currentAction);

        self::notifyAllPlayers('log', clienttranslate('${player_name} chooses a ${color} communication module to replace the selected module ${module_image}'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'module' => $module,
            'color' => $this->getColorName($color),
            'module_image' => '',
            'preserve' => ['module'],
            'i18n' => ['color'],
        ]);

        $this->gamestate->nextState('pay');
    }

    public function chooseNewExperiment(int $id) {
        self::checkAction('chooseNewExperiment');

        $playerId = intval($this->getActivePlayerId());
        $module = $this->getExperimentById($id);

        $currentAction = new CurrentAction('experiment');
        $currentAction->experiment = $id;
        $currentAction->remainingCost = $module->cost;
        $currentAction->astronautSpot = ($module->locationArg + $this->getArm()) % 8;
        $this->setGlobalVariable(CURRENT_ACTION, $currentAction);

        self::notifyAllPlayers('log', clienttranslate('${player_name} chooses an experiment to deploy ${experiment_image}'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'experiment' => $module,
            'experiment_image' => '',
            'preserve' => ['module'],
        ]);

        $this->gamestate->nextState('pay');
    }

    public function autoPay() {
        self::checkAction('autoPay');

        $playerId = intval($this->getActivePlayerId());
        $playerIcons = $this->getPlayerIcons($playerId);
        $playerModules = $this->getModulesByLocation('player', $playerId);
        $playerModules = array_values(array_filter($playerModules, fn($t) => $t->production !== null && $t->r > 0));

        $currentAction = $this->getGlobalVariable(CURRENT_ACTION);
        
        $pay = $this->canPay((array)$currentAction->remainingCost, $playerIcons);
        if ($pay == null) {
            throw new BgaVisibleSystemException("You cannot afford this module");
        }

        foreach ($pay as $type => $amount) {
            $remainingAmount = $amount;

            foreach ($playerModules as $produceModule) {
                $produce = $produceModule->getProduction();
                if (array_key_exists($type, $produce)) {
                    $rotate = min($remainingAmount, $produce[$type]);
                    $remainingAmount -= $rotate;
                    $playerIcons[$type] -= $rotate;
                    $produceModule->r -= $rotate;

                    self::notifyAllPlayers('pay', '', [
                        'playerId' => $playerId,
                        'player_name' => $this->getPlayerName($playerId),
                        'module' => $produceModule,
                        'icons' => $playerIcons,
                    ]);

                    if ($remainingAmount == 0) {
                        break;
                    }
                }
            }
        }

        self::notifyAllPlayers('log', clienttranslate('${player_name} pays ${cost} to deploy the module'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'cost' => $pay,
        ]);

        $this->gamestate->nextState('next');
    }

    public function endTurn() {
        self::checkAction('endTurn');

        $astronaut = $this->getSelectedAstronaut();
        if ($astronaut == null) {
            throw new BgaUserException("No active astronaut");
        }

        $playerId = intval($this->getActivePlayerId());
        $this->applyEndOfActivation($playerId, $astronaut);
    }

    public function confirmTurn() {
        self::checkAction('confirmTurn');

        $this->gamestate->nextState('endTurn');
    }

    private function applyEndOfActivation(int $playerId, Astronaut $astronaut) {
        if ($astronaut->remainingWorkforce > 0) {
            $this->DbQuery("UPDATE astronaut SET `remaining_workforce` = 0 WHERE `id` = $astronaut->id");
        }

        self::notifyAllPlayers('disableAstronaut', '', [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'astronaut' => $astronaut,
        ]);

        $this->gamestate->nextState('endTurn');
    }

    public function upgradeAstronaut(int $id) {
        self::checkAction('upgradeAstronaut');

        $playerId = intval($this->getActivePlayerId());

        $args = $this->argUpgradeAstronaut();
        $astronaut = $this->array_find($args['astronauts'], fn($astronaut) => $astronaut->id == $id);

        if ($astronaut == null || $astronaut->workforce >= 4) {
            throw new BgaUserException("Invalid astronaut");
        }        
        
        $currentAction = $this->getGlobalVariable(CURRENT_ACTION);
        $currentAction->upgrade--;
        $this->setGlobalVariable(CURRENT_ACTION, $currentAction);

        $this->DbQuery("UPDATE astronaut SET `workforce` = `workforce` + 1 WHERE `id` = $astronaut->id");
        if ($astronaut->remainingWorkforce > 0) {
            $this->DbQuery("UPDATE astronaut SET `remaining_workforce` = `remaining_workforce` + 1 WHERE `id` = $astronaut->id");
        }
        $astronaut->workforce++;

        self::notifyAllPlayers('upgradeAstronaut', clienttranslate('${player_name} upgrades a astronaut work value from ${from} to ${to}'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'astronaut' => $astronaut,
            'from' => $astronaut->workforce - 1, // for logs
            'to' => $astronaut->workforce, // for logs
        ]);

        $this->gamestate->nextState($currentAction->upgrade > 0 ? 'stay' : 'endTurn');
    }

    public function moveAstronaut(int $x, int $y) {
        self::checkAction('moveAstronaut');

        $playerId = intval($this->getCurrentPlayerId());
        $arg = $this->argMoveAstronaut($playerId);
        $astronaut = $arg['astronaut'];

        if (!$this->array_some($arg['possibleCoordinates'], fn($coordinate) => $coordinate[0] == $x && $coordinate[1] == $y)) {
            throw new BgaUserException("Invalid coordinate");
        }
        $movedAstronauts = $this->getGlobalVariable(MOVED_ASTRONAUTS);
        $movedAstronaut = $this->array_find($movedAstronauts, fn($w) => ((object)$w)->id == ((object)$astronaut)->id);
        $movedAstronaut->x = $x;
        $movedAstronaut->y = $y;
        $this->setGlobalVariable(MOVED_ASTRONAUTS, $movedAstronauts);

        self::notifyAllPlayers('moveAstronaut', '', [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'astronaut' => $movedAstronaut,
            'toConfirm' => true,
        ]);

        $remaining = count(array_filter($arg['playerMovedAstronauts'], fn($w) => $w->x === null)) > 1;

        $this->gamestate->nextPrivateState($playerId, $remaining ? 'stay' : 'next');
    }

    public function confirmMoveAstronauts() {
        self::checkAction('confirmMoveAstronauts');

        $playerId = intval($this->getCurrentPlayerId());

        $movedAstronauts = $this->getGlobalVariable(MOVED_ASTRONAUTS);
        $playerMovedAstronauts = array_values(array_filter($movedAstronauts, fn($astronaut) => $astronaut->playerId == $playerId));

        foreach ($playerMovedAstronauts as $astronaut) {
            $this->DbQuery("UPDATE astronaut SET `location` = 'player', `spot` = null, `x` = $astronaut->x, `y` = $astronaut->y WHERE `id` = $astronaut->id");
        }

        self::notifyAllPlayers('confirmMoveAstronauts', '', [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'astronauts' => $playerMovedAstronauts,
        ]);

        $this->gamestate->setPlayerNonMultiactive($playerId, 'next');
    }

    public function restartMoveAstronauts() {
        self::checkAction('restartMoveAstronauts');

        $playerId = intval($this->getCurrentPlayerId());

        $movedAstronauts = $this->getGlobalVariable(MOVED_ASTRONAUTS);
        $playerMovedAstronauts = array_values(array_filter($movedAstronauts, fn($astronaut) => $astronaut->playerId == $playerId));

        foreach ($playerMovedAstronauts as $astronaut) {
            if ($astronaut->x !== null) {
                $movedAstronaut = $this->array_find($movedAstronauts, fn($w) => ((object)$w)->id == ((object)$astronaut)->id);
                $movedAstronaut->x = null;
                $movedAstronaut->y = null;

                self::notifyAllPlayers('moveAstronaut', '', [
                    'playerId' => $playerId,
                    'player_name' => $this->getPlayerName($playerId),
                    'astronaut' => $movedAstronaut,
                    'toConfirm' => false,
                ]);
            }
        }
        $this->setGlobalVariable(MOVED_ASTRONAUTS, $movedAstronauts);

        $this->gamestate->nextPrivateState($playerId, 'restart');
    }

    public function restartTurn() {
        $playerId = intval($this->getActivePlayerId());
        $undo = $this->getGlobalVariable(UNDO);

        foreach ($undo->allMissions as $mission) {
            $this->DbQuery("UPDATE `mission` SET `card_location` = '$mission->location', `card_location_arg` = $mission->locationArg WHERE `card_id` = $mission->id");
        }

        foreach ($undo->tableModules as $module) {
            $this->DbQuery("UPDATE `module` SET `card_location` = '$module->location', `card_location_arg` = $module->locationArg, `x` = NULL, `y` = NULL, `r` = 0 WHERE `card_id` = $module->id");
        }
        foreach ($undo->tableExperiments as $experiment) {
            $this->DbQuery("UPDATE `experiment` SET `card_location` = '$experiment->location', `card_location_arg` = $experiment->locationArg, `line` = NULL WHERE `card_id` = $experiment->id");
        }
       
        $this->DbQuery("UPDATE `module` SET `card_location` = 'communication' WHERE `card_type` = 8 && `card_location` = 'player' AND `card_location_arg` = $playerId");
        foreach ($undo->modules as $module) {            
            $this->DbQuery("UPDATE `module` SET `card_location` = '$module->location', `card_location_arg` = $module->locationArg, `x` = $module->x, `y` = $module->y, `r` = $module->r WHERE `card_id` = $module->id");
        }
        foreach ($undo->experiments as $experiment) {
            $this->DbQuery("UPDATE `experiment` SET `card_location` = '$module->experiment', `card_location_arg` = $experiment->locationArg, `line` = $experiment->line WHERE `card_id` = $experiment->id");
        }

        foreach ($undo->astronauts as $astronaut) {
            $this->DbQuery("UPDATE astronaut SET `location` = '$astronaut->location', `workforce` = $astronaut->workforce, `remaining_workforce` = $astronaut->remainingWorkforce, `spot` = ".($astronaut->spot === null ? 'NULL' : $astronaut->spot).", `x` = ".($astronaut->x === null ? 'NULL' : $astronaut->x).", `y` = ".($astronaut->y === null ? 'NULL' : $astronaut->y)." WHERE `id` = $astronaut->id");
        }

        $this->DbQuery("UPDATE player SET `player_vp` = $undo->vp, `player_research_points` = $undo->researchPoints, `player_science` = $undo->science WHERE `player_id` = $playerId");

        self::notifyAllPlayers('restartTurn', clienttranslate('${player_name} restarts its turn'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'undo' => $undo,
            'icons' => $this->getPlayerIcons($playerId),
        ]);

        $this->gamestate->jumpToState(ST_PLAYER_CHOOSE_ACTION);
    }
}
