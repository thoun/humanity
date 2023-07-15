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

        $this->setGlobalVariable(UNDO, new Undo(
            $this->getTilesByLocation('player', $playerId),
            $this->getResearchsByLocation('player', $playerId),
            $this->getPlayerWorkers($playerId),
            $this->getPlayer($playerId),
            $this->getTilesByLocation('table'),
            $this->getResearchsByLocation('table'),
            $this->getObjectivesByLocation(),
        ));
        
        $this->gamestate->nextState('next');
    }

    function stUpgradeWorkers() {
        $args = $this->argUpgradeWorker();

        if (count($args['workers']) == 0) {
            $this->gamestate->nextState('endTurn');
        }
    }

    function stCheckObjectives() {
        $playerId = intval($this->getActivePlayerId());

        $objectives = $this->getObjectivesByLocation();

        foreach($objectives as $objective) {
            if ($objective->location != 'player' || $objective->locationArg != $playerId) {
                if ($this->fulfillObjective($playerId, $objective)) {
                    $this->gainObjective($playerId, $objective);
                }
            }
        }
        
        $this->gamestate->nextState('next');
    }

    function stNextPlayer() {
        $playerId = intval($this->getActivePlayerId());

        $this->deleteGlobalVariables([CURRENT_ACTION]);

        if ($this->countRemainingWorkers() > 0) {

            $this->activeNextPlayer();
            $playerId = $this->getActivePlayerId();
            while ($this->countRemainingWorkers($playerId) == 0) {
                $this->activeNextPlayer();
                $playerId = $this->getActivePlayerId();
            }
    
            $this->giveExtraTime($playerId);
            
            $this->gamestate->nextState('nextPlayer');

        } else {
            $this->gamestate->nextState('endRound');
        }
    }

    function stEndRound() {
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
        $tableTiles = $this->getTilesByLocation('table');
        foreach ([1, 2] as $moduleIndex) {
            $spot = ($armBefore + $moduleIndex) % 8;
            $spotTile = $this->array_find($tableTiles, fn($tableTile) => $tableTile->locationArg == $spot);
            if ($spotTile) {
                $this->tiles->moveCard($spotTile->id, 'void');
                self::notifyAllPlayers('removeTableTile', clienttranslate('There is a tile remaining under a white cross, the tile is removed ${tile_image}'), [
                    'tile' => $spotTile,
                    'tile_image' => '',
                    'preserve' => ['tile'],
                ]);
                $tableTiles = array_values(array_filter($tableTiles, fn($tableTile) => $tableTile->id != $spotTile->id));
            }
        }

        $orderedTilesDesc = []; // remaining tiles, from farest to closest from arm
        for ($i = 1; $i <= 7; $i++) {
            $spot = ($armBefore + $i) % 8;
            $spotTile = $this->array_find($tableTiles, fn($tableTile) => $tableTile->locationArg == $spot);
            if ($spotTile) {
                array_unshift($orderedTilesDesc, $spotTile);
            }
        }

        $shifted = 0;
        // shift remaining modules
        for ($i = 0; $i < count($orderedTilesDesc); $i++) {
            $spot = ($armBefore + 7 - $i) % 8;
            if ($orderedTilesDesc[$i]->locationArg != $spot) {
                $orderedTilesDesc[$i]->locationArg = $spot;
                $this->tiles->moveCard($orderedTilesDesc[$i]->id, 'table', $spot);
                $shifted++;

                self::notifyAllPlayers('shiftTableTile', '', [
                    'tile' => $orderedTilesDesc[$i],
                ]);
            }
        }

        if ($shifted > 0) {
            self::notifyAllPlayers('log', clienttranslate('${diff} tiles were shifted on the free spots before the arm'), [
                'diff' => $shifted,
            ]);
        }

        // move arm
        $tableTiles = $this->getTilesByLocation('table');
        $armAfter = $armBefore;
        while (!$this->array_some($tableTiles, fn($tableTile) => $tableTile->locationArg == (($armAfter + 1) % 8))) {
            $armAfter = ($armAfter + 1) % 8;
        }
        $this->setGlobalVariable(ARM, $armAfter);
        $diff = $armAfter - $armBefore;
        if ($diff < 0) {
            $diff += 8;
        }
        self::notifyAllPlayers('moveArm', clienttranslate('Arm moves ${diff} hangars'), [
            'arm' => $armAfter,
            'diff' => $diff
        ]);

        // reset workers in arm range
        $tableWorkers = $this->getTableWorkers();
        $movedWorkers = [];
        foreach ($tableWorkers as $worker) {
            if ($worker->spot >= $armBefore && $worker->spot <= $armAfter) {
                $movedWorkers[] = $worker;
            }
        }
        $this->setGlobalVariable(MOVED_WORKERS, $movedWorkers);

        // place new tiles
        $age = $this->getYear();
        $tableTiles = $this->getTilesByLocation('table');
        for ($i = 1; $i < 8; $i++) {
            $spot = ($armAfter + $i) % 8;
            $spotTile = $this->array_find($tableTiles, fn($tableTile) => $tableTile->locationArg == $spot);
            if (!$spotTile) {
                $newTile = $this->getTileFromDb($this->tiles->pickCardForLocation('deck'.$age, 'table', $spot));
                if ($newTile == null) {
                    self::notifyAllPlayers('log', clienttranslate('Impossible to refill the tiles, moving to next year'), []);
                    
                    $this->gamestate->nextState('endYear');
                    return;
                } else {
                    self::notifyAllPlayers('newTableTile', clienttranslate('A new tile is added to the board to fill an empty hangar ${tile_image}'), [
                        'tile' => $newTile,
                        'tile_image' => '',
                        'preserve' => ['tile'],
                    ]);
                }
            }
        }

        // move workers
        if (count($movedWorkers)) {
            $this->gamestate->nextState('moveWorkers');
        } else {
            $this->gamestate->nextState('afterEndRound');
        }
    }

    function stMoveWorkers() {
        $movedWorkers = $this->getGlobalVariable(MOVED_WORKERS);
        $playersIds = array_values(array_unique(array_map(fn($worker) =>$worker->playerId, $movedWorkers)));

        $this->gamestate->setPlayersMultiactive($playersIds, 'next');
        $this->gamestate->initializePrivateStateForAllActivePlayers(); 
    }

    function stAfterEndRound() {
        $this->deleteGlobalVariable(MOVED_WORKERS);
        $this->reactivatePlayerWorkers(null);

        $this->gamestate->nextState('nextRound');
    }

    function stEndYear() {
        $playersIds = $this->getPlayersIds();

        // gain science points based on year research
        foreach($playersIds as $playerId) {
            $sciencePoints = 0;
            $playerResearchPoints = $this->getPlayer($playerId)->researchPoints;
            foreach (SCIENCE_BY_RESEARCH_SPOT as $inc => $minSpot) {
                if ($playerResearchPoints >= $minSpot) {
                    $sciencePoints = $inc;
                }
            }

            $this->incPlayerScience($playerId, $sciencePoints, '${player_name} gains ${inc} science points with year research');

            $this->DbQuery("UPDATE player SET `player_research_points` = 0 WHERE player_id = $playerId");                
            $this->notifyAllPlayers('researchPoints', '', [
                'playerId' => $playerId,
                'player_name' => $this->getPlayerName($playerId),
                'new' => 0,
            ]);
        }

        $year = $this->getYear();
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

        // replace all research tiles
        $this->research->moveAllCardsInLocation('table', 'void');
        foreach ([1, 2, 3, 4, 5, 6, 7] as $spot) {
            $this->research->pickCardForLocation('deck'.$year, 'table', $spot);
        }
        self::notifyAllPlayers('newTableResearch', '', [
            'tableResearch' => $this->getResearchsByLocation('table'),
        ]);

        // continue to fill tiles with new age tiles
        $arm = $this->getArm();
        $tableTiles = $this->getTilesByLocation('table');
        for ($i = 1; $i < 8; $i++) {
            $spot = ($arm + $i) % 8;
            $spotTile = $this->array_find($tableTiles, fn($tableTile) => $tableTile->locationArg == $spot);
            if (!$spotTile) {
                $newTile = $this->getTileFromDb($this->tiles->pickCardForLocation('deck'.$year, 'table', $spot));
                self::notifyAllPlayers('newTableTile', '', [
                    'tile' => $newTile,
                ]);
            }
        }

        // move workers
        $movedWorkers = $this->getGlobalVariable(MOVED_WORKERS);
        if (count($movedWorkers)) {
            $this->gamestate->nextState('moveWorkers');
        } else {
            $this->gamestate->nextState('afterEndRound');
        }
    }

    function stEndScore() {
        $playersIds = $this->getPlayersIds();

        foreach($playersIds as $playerId) {
            $player = $this->getPlayer($playerId);

            // score science points
            $this->incPlayerVP($playerId, $player->science, clienttranslate('${player_name} gains ${inc} points from with ${inc} science points'));
            
            // socre remaining sets of 5 resources
            $icons = $this->getPlayerIcons($playerId);
            $iconsSum = array_reduce($icons, fn($a, $b) => $a + $b);
            $iconPoints = floor($iconsSum / 5);
            $this->incPlayerVP($playerId, $iconPoints, clienttranslate('${player_name} gains ${inc} points from with ${resources} remaining resources'), [
                'resources' => $iconsSum,
            ]);

            // final score & tiebreak
            $scoreAux1 = $icons[ELECTRICITY];
            $scoreAux2 = $icons[11] + $icons[12] + $icons[13];
            $scoreAux3 = $icons[1] + $icons[2] + $icons[3];
            $scoreAux = 10000 * $scoreAux1 + 100 * $scoreAux2 + $scoreAux3;
            $this->DbQuery("UPDATE player SET player_score = player_vp + player_science, player_score_aux = $scoreAux WHERE player_id = $playerId");

            self::notifyAllPlayers('score', '', [
                'playerId' => $playerId,
                'new' => $this->getPlayer($playerId)->score,
            ]);
        }

        $this->gamestate->nextState('endGame');
    }
}
