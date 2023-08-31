<?php

trait StateTrait {

//////////////////////////////////////////////////////////////////////////////
//////////// Game state actions
////////////

    /*
        Here, you can create methods defined as "game state actions" (see "action" property in states.inc.php).
        The action method of state X is called everytime the current game state is set to X.
    */

    function stStartTurn() {
        $playerId = intval($this->getActivePlayerId());

        // in case a player start the round with no active astronaut
        if ($this->countRemainingAstronauts($playerId) == 0) {
            if ($this->countRemainingAstronauts() > 0) {

                $this->activeNextPlayer();
                $playerId = $this->getActivePlayerId();
                while ($this->countRemainingAstronauts($playerId) == 0) {
                    $this->activeNextPlayer();
                    $playerId = $this->getActivePlayerId();
                }
                
                $this->gamestate->nextState('nextPlayer');
                return;
            } else {
                self::notifyAllPlayers('log', clienttranslate('All astronauts are exhausted or around the AMBS'), []);

                $this->gamestate->nextState('endRound');
                return;
            }
        }


        $this->setGlobalVariable(UNDO, new Undo(
            $this->getModulesByLocation('player', $playerId),
            $this->getExperimentsByLocation('player', $playerId),
            $this->getPlayerAstronauts($playerId),
            $this->getPlayer($playerId),
            $this->getModulesByLocation('table'),
            $this->getExperimentsByLocation('table'),
            $this->getMissionsByLocation(),
            $this->getCollectionFromDb("SELECT stats_id, stats_value FROM `stats` WHERE stats_player_id = $playerId", true),
            $this->getPlayerSquares($playerId),
        ));
        
        $this->gamestate->nextState('next');
    }

    function stDeploy() {
        $playerId = intval($this->getActivePlayerId());

        $currentAction = $this->getGlobalVariable(CURRENT_ACTION);
        $astronaut = $this->getAstronautById($currentAction->selectedAstronaut);

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

    function stUpgradeAstronauts() {
        $args = $this->argUpgradeAstronaut();

        if (count($args['astronauts']) == 0) {
            $this->gamestate->nextState('endTurn');
        }
    }

    function stCheckMissions() {
        $playerId = intval($this->getActivePlayerId());

        $missions = $this->getMissionsByLocation();

        foreach($missions as $mission) {
            if ($mission->location != 'player' || $mission->locationArg != $playerId) {
                if ($this->shouldGainMission($playerId, $mission)) {
                    $this->gainMission($playerId, $mission);
                }
            }
        }
        
        $this->gamestate->nextState('next');
    }

    function stNextPlayer() {
        $playerId = intval($this->getActivePlayerId());

        $this->deleteGlobalVariables([CURRENT_ACTION]);

        if ($this->countRemainingAstronauts() > 0) {

            $this->activeNextPlayer();
            $playerId = $this->getActivePlayerId();
            while ($this->countRemainingAstronauts($playerId) == 0) {
                $this->activeNextPlayer();
                $playerId = $this->getActivePlayerId();
            }
    
            $this->giveExtraTime($playerId);
            
            $this->gamestate->nextState('nextPlayer');

        } else {
            self::notifyAllPlayers('log', clienttranslate('All astronauts are exhausted or around the AMBS'), []);

            $this->gamestate->nextState('endRound');
        }
    }

    function stEndRound() {
        $this->incStat(1, 'roundNumber');

        // change first player
        $newFirstPlayer = intval($this->getPlayerAfter($this->getGlobalVariable(FIRST_PLAYER)));
        $this->setGlobalVariable(FIRST_PLAYER, $newFirstPlayer);
        $this->gamestate->changeActivePlayer($newFirstPlayer);
        self::notifyAllPlayers('newFirstPlayer', clienttranslate('${player_name} is the new first player'), [
            'playerId' => $newFirstPlayer,
            'player_name' => $this->getPlayerName($newFirstPlayer),
        ]);

        // remove first 2 modules
        $armBefore = $this->getArm();
        $tableModules = $this->getModulesByLocation('table');
        foreach ([1, 2] as $moduleIndex) {
            $spot = ($armBefore + $moduleIndex) % 8;
            $spotModule = $this->array_find($tableModules, fn($tableModule) => $tableModule->locationArg == $spot);
            if ($spotModule) {
                $this->modules->moveCard($spotModule->id, 'void');
                self::notifyAllPlayers('removeTableModule', clienttranslate('There is a module remaining under a white cross, the module is removed ${module_image}'), [
                    'module' => $spotModule,
                    'module_image' => '',
                    'preserve' => ['module'],
                ]);
                $tableModules = array_values(array_filter($tableModules, fn($tableModule) => $tableModule->id != $spotModule->id));
            }
        }

        $orderedModulesDesc = []; // remaining modules, from farest to closest from arm
        for ($i = 1; $i <= 7; $i++) {
            $spot = ($armBefore + $i) % 8;
            $spotModule = $this->array_find($tableModules, fn($tableModule) => $tableModule->locationArg == $spot);
            if ($spotModule) {
                array_unshift($orderedModulesDesc, $spotModule);
            }
        }

        $shifted = 0;
        // shift remaining modules
        for ($i = 0; $i < count($orderedModulesDesc); $i++) {
            $spot = ($armBefore + 7 - $i) % 8;
            if ($orderedModulesDesc[$i]->locationArg != $spot) {
                $orderedModulesDesc[$i]->locationArg = $spot;
                $this->modules->moveCard($orderedModulesDesc[$i]->id, 'table', $spot);
                $shifted++;

                self::notifyAllPlayers('shiftTableModule', '', [
                    'module' => $orderedModulesDesc[$i],
                ]);
            }
        }

        if ($shifted > 0) {
            self::notifyAllPlayers('log', clienttranslate('${diff} modules were shifted on the free spots before the arm'), [
                'diff' => $shifted,
            ]);
        }

        // move arm
        $tableModules = $this->getModulesByLocation('table');
        $armAfter = $armBefore;
        $diff = 0;
        while (!$this->array_some($tableModules, fn($tableModule) => $tableModule->locationArg == (($armAfter + 1) % 8)) && $diff < 8) {
            $armAfter = ($armAfter + 1) % 8;
            $diff++;
        }
        $this->setGlobalVariable(ARM, $armAfter);
        self::notifyAllPlayers('moveArm', clienttranslate('Arm moves ${diff} hangars'), [
            'arm' => $armAfter,
            'diff' => $diff
        ]);

        // reset astronauts in arm range
        $tableAstronauts = $this->getTableAstronauts();
        $movedAstronauts = [];        
        for ($i = $armBefore; $i < $armBefore + $diff; $i++) {
            $spot = $i % 8;
            foreach ($tableAstronauts as $astronaut) {
                if ($astronaut->spot == $spot) {
                    $movedAstronauts[] = $astronaut;
                }
            }
        }
        $this->setGlobalVariable(MOVED_ASTRONAUTS, $movedAstronauts);

        // place new modules
        $year = $this->getYear();
        $tableModules = $this->getModulesByLocation('table');
        for ($i = 1; $i < 8; $i++) {
            $spot = ($armAfter + $i) % 8;
            $spotModule = $this->array_find($tableModules, fn($tableModule) => $tableModule->locationArg == $spot);
            if (!$spotModule) {
                $newModule = $this->getModuleFromDb($this->modules->pickCardForLocation('deck'.$year, 'table', $spot));
                if ($newModule == null) {
                    self::notifyAllPlayers('log', clienttranslate('Impossible to refill the modules, moving to next year'), []);
                    
                    $this->gamestate->nextState('endYear');
                    return;
                } else {
                    self::notifyAllPlayers('newTableModule', clienttranslate('A new module is added to the board to fill an empty hangar ${module_image}'), [
                        'module' => $newModule,
                        'module_image' => '',
                        'preserve' => ['module'],
                        
                        'year' => $year,
                        'moduleDeckCount' => intval($this->modules->countCardInLocation("deck$year")),
                        'moduleDeckTopCard' => Module::onlyId($this->getModuleFromDb($this->modules->getCardOnTop("deck$year"))),
                    ]);
                }
            }
        }

        // move astronauts
        if (count($movedAstronauts)) {
            $this->gamestate->nextState('moveAstronauts');
        } else {
            $this->gamestate->nextState('afterEndRound');
        }
    }

    function stMoveAstronauts() {
        $playersIds = $this->getPlayersIds();
        $movedAstronauts = $this->getGlobalVariable(MOVED_ASTRONAUTS);
        $activePlayersIds = array_values(array_unique(array_map(fn($astronaut) => $astronaut->playerId, $movedAstronauts)));

        foreach($playersIds as $playerId) {
            $this->notifyAllPlayers('log', clienttranslate('${player_name} has ${number} astronaut(s) to place back on its area'), [
                'playerId' => $playerId,
                'player_name' => $this->getPlayerName($playerId),
                'number' => count(array_filter($movedAstronauts, fn($astronaut) => $astronaut->playerId == $playerId)),
            ]);
        }

        $this->gamestate->setPlayersMultiactive($activePlayersIds, 'next');
        $this->gamestate->initializePrivateStateForAllActivePlayers(); 
    }

    function stAfterEndRound() {
        $movedAstronauts = $this->getGlobalVariable(MOVED_ASTRONAUTS);

        foreach ($movedAstronauts as &$astronaut) {
            $astronaut->location = 'player';
            $this->DbQuery("UPDATE astronaut SET `location` = 'player', `spot` = null, `x` = $astronaut->x, `y` = $astronaut->y WHERE `id` = $astronaut->id");
        }

        self::notifyAllPlayers('confirmMoveAstronauts', '', [
            'astronauts' => $movedAstronauts,
        ]);

        $this->deleteGlobalVariable(MOVED_ASTRONAUTS);
        $this->reactivatePlayerAstronauts(null);

        $this->gamestate->nextState('nextRound');
    }

    function stEndYear() {
        $playersIds = $this->getPlayersIds();
        $year = $this->getYear();

        // gain science points based on year research
        foreach($playersIds as $playerId) {
            $sciencePoints = 0;
            $playerResearchPoints = $this->getPlayer($playerId)->researchPoints;
            foreach (SCIENCE_BY_EXPERIMENT_SPOT as $inc => $minSpot) {
                if ($playerResearchPoints >= $minSpot) {
                    $sciencePoints = $inc;
                }
            }

            $this->incPlayerScience($playerId, $sciencePoints, '${player_name} gains ${inc} science point(s) with year research');

            $playersBehind = intval($this->getUniqueValueFromDB("SELECT count(*) FROM player WHERE player_research_points < $playerResearchPoints"));
            $bonus = count($playersIds) == 2 ? 2 : 1;
            $gainedSciencePoints = $bonus * $playersBehind;
            $this->incPlayerScience($playerId, $gainedSciencePoints, '${player_name} gains ${inc} science point(s) with ${number} player(s) behind', ['number' => $playersBehind]);
        }

        $this->DbQuery("UPDATE player SET `player_research_points` = 0");   
        foreach($playersIds as $playerId) {
            $this->notifyAllPlayers('researchPoints', '', [
                'playerId' => $playerId,
                'player_name' => $this->getPlayerName($playerId),
                'new' => 0,
            ]);
        }

        // don't go further if last year
        if ($year >= 3) {
            $this->gamestate->nextState('endScore');
            return;
        }

        $year++;
        $this->setGlobalVariable(YEAR, $year);
        $this->notifyAllPlayers('year', clienttranslate('Year ${year} begins'), [
            'year' => $year,
        ]);

        // replace all experiment tiles
        $this->experiments->moveAllCardsInLocation('table', 'void');
        foreach ([1, 2, 3, 4, 5, 6, 7] as $spot) {
            $this->experiments->pickCardForLocation('deck'.$year, 'table', $spot);
        }
        self::notifyAllPlayers('newTableExperiments', '', [
            'tableExperiments' => $this->getExperimentsByLocation('table'),
        ]);

        // continue to fill modules with new year modules
        $arm = $this->getArm();
        $tableModules = $this->getModulesByLocation('table');
        for ($i = 1; $i < 8; $i++) {
            $spot = ($arm + $i) % 8;
            $spotModule = $this->array_find($tableModules, fn($tableModule) => $tableModule->locationArg == $spot);
            if (!$spotModule) {
                $newModule = $this->getModuleFromDb($this->modules->pickCardForLocation('deck'.$year, 'table', $spot));
                self::notifyAllPlayers('newTableModule', clienttranslate('A new module is added to the board to fill an empty hangar ${module_image}'), [
                    'module' => $newModule,
                    'module_image' => '',
                    'preserve' => ['module'],
                    
                    'year' => $year,
                    'moduleDeckCount' => intval($this->modules->countCardInLocation("deck$year")),
                    'moduleDeckTopCard' => Module::onlyId($this->getModuleFromDb($this->modules->getCardOnTop("deck$year"))),
                ]);
            }
        }

        // move astronauts
        $movedAstronauts = $this->getGlobalVariable(MOVED_ASTRONAUTS);
        if (count($movedAstronauts)) {
            $this->gamestate->nextState('moveAstronauts');
        } else {
            $this->gamestate->nextState('afterEndRound');
        }
    }

    function stEndScore() {
        $playersIds = $this->getPlayersIds();
        $playerEndScoreSummary = [];

        foreach($playersIds as $playerId) {
            $player = $this->getPlayer($playerId);

            // score science points
            $this->setStat($player->science, 'sciencePoints', $playerId);
            $this->setStat($player->science == 0 ? 0 : $this->getStat('researchPoints', $playerId) / $player->science, 'researchPointsByScience', $playerId);
            
            // score remaining sets of 5 resources
            $icons = $this->getPlayerIcons($playerId);
            $iconsSum = array_reduce($icons, fn($a, $b) => $a + $b, 0);
            $iconPoints = floor($iconsSum / 5);
            $this->incPlayerVP($playerId, $iconPoints, clienttranslate('${player_name} gains ${inc} points from with ${resources} remaining resources'), [
                'resources' => $iconsSum,
            ]);
            $this->setStat($iconPoints, 'vpWithRemainingResources', $playerId);

            // final score & tiebreak
            $scoreAux1 = 0;
            $scoreAux2 = 0;
            $scoreAux3 = 0;
            foreach ($icons as $key => $quantity) {
                $type = json_decode($key)[0];
                if ($type > 10) {
                    $scoreAux2 += $quantity;
                } else if ($type > 0) {
                    $scoreAux3 += $quantity;
                } else if ($type == 0) {
                    $scoreAux1 += $quantity;
                }
            }
            $scoreAux = 10000 * $scoreAux1 + 100 * $scoreAux2 + $scoreAux3;
            $this->DbQuery("UPDATE player SET player_score = player_vp + player_science, player_score_aux = $scoreAux WHERE player_id = $playerId");


            $playerExperiments = $this->getExperimentsByLocation('player', $playerId);
            $playerExperimentsLines = array_map(fn($experiment) => $experiment->line, $playerExperiments);

            $linesWithAtLeast = [0 => 0, 1 => 0, 2 => 0, 3 => 0];
            if (count($playerExperimentsLines) > 0) {
                for ($i = 0; $i <= max($playerExperimentsLines); $i++) {
                    $experimentsInLine = count(array_filter($playerExperimentsLines, fn($line) => $line == $i));
                    $linesWithAtLeast[$experimentsInLine]++;
                }
            }        

            $this->setStat($linesWithAtLeast[3], 'completeExperimentLines', $playerId);
            $this->setStat($linesWithAtLeast[2], 'uncompleteExperimentLines2', $playerId);
            $this->setStat($linesWithAtLeast[1], 'uncompleteExperimentLines1', $playerId);

            $playerMissions = $this->getMissionsByLocation('player', $playerId);
            $this->setStat(count($playerMissions), 'endMissions', $playerId);

            $playerEndScoreSummary[$playerId] = $this->getPlayerEndScoreSummary($playerId);
        }
        
        foreach([
            'remainingResources',
            'squares', 
            'greenhouses',
            'experiments',
            'missions',
            'modules',
            'scienceByYear',
            'total',
        ] as $field) {
            foreach($playersIds as $playerId) {
                if ($field == 'total') {
                    $player = $this->getPlayer($playerId);
                    self::notifyAllPlayers('score', clienttranslate('${player_name} gains ${inc} points from with ${inc} science points'), [
                        'playerId' => $playerId,
                        'player_name' => $this->getPlayerName($playerId),
                        'new' => $player->score,
                        'inc' => $player->science,
                        'endScoreSummary' => $playerEndScoreSummary[$playerId],
                    ]);
                }

                self::notifyAllPlayers('endScore', '', [
                    'playerId' => $playerId,
                    'field' => $field,
                    'endScoreSummary' => $playerEndScoreSummary[$playerId],
                ]);
            }
        }

        $this->gamestate->nextState('endGame');
    }
}
