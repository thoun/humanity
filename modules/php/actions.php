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

    public function chooseWorker(int $id) {
        self::checkAction('chooseWorker');

        $args = $this->argChooseWorker();
        $worker = $this->array_find($args['workers'], fn($worker) => $worker->id == $id);

        if ($worker == null) {
            throw new BgaUserException("Invalid worker");
        }
        
        $playerId = intval($this->getActivePlayerId());
        $stateId = intval($this->gamestate->state_id());
        
        if ($stateId == ST_PLAYER_CHOOSE_ACTION) {
            $currentAction = new CurrentAction('activate');
            $currentAction->selectedWorker = $id;
            $this->setGlobalVariable(CURRENT_ACTION, $currentAction);

            self::notifyAllPlayers('log', clienttranslate('${player_name} selects a worker of workforce ${workforce} to activate tiles'), [
                'playerId' => $playerId,
                'player_name' => $this->getPlayerName($playerId),
                'workforce' => $worker->workforce,
            ]);

            $this->gamestate->nextState('activate');
        } else {

            $currentAction = $this->getGlobalVariable(CURRENT_ACTION);
            $currentAction->selectedWorker = $id;
            $this->setGlobalVariable(CURRENT_ACTION, $currentAction);

            $upgrade = 0;
            if ($currentAction->type == 'tile') {
                $upgrade = $this->deployTile($playerId, $currentAction, $worker);
            } else if ($currentAction->type == 'research') {
                $this->deployResearch($playerId, $currentAction, $worker);
            }

            if ($upgrade > 0) {
                $currentAction->upgrade = $upgrade;
                $this->setGlobalVariable(CURRENT_ACTION, $currentAction);
            }

            $this->gamestate->nextState($upgrade > 0 ? 'upgrade' : 'endTurn');
        }
    }

    public function activateTile(int $id) {
        self::checkAction('activateTile');

        $worker = $this->getSelectedWorker();
        if ($worker == null) {
            throw new BgaUserException("No active worker");
        }

        $playerId = intval($this->getActivePlayerId());
        $argActivateTile = $this->argActivateTile($playerId);

        $tile = $this->array_find($argActivateTile['activatableTiles'], fn($t) => $t->id == $id);
        if ($tile == null) {
            throw new BgaUserException("You cannot activate this tile");
        }

        if ($worker->remainingWorkforce < $tile->workforce) {
            throw new BgaUserException("Not enough remaining workforce");
        }
        $worker->remainingWorkforce -= $tile->workforce;
        $this->DbQuery("UPDATE worker SET `remaining_workforce` = $worker->remainingWorkforce WHERE `id` = $worker->id");

        $message = null;
        $args = [];
        if ($tile->matchType) {
            if ($tile->matchType == RESEARCH_POWER_TIME) {
                $this->gainTimeUnit($playerId, 1);
            }
            $message = clienttranslate('${player_name} activates a tile to trigger TODO POWER TIME effect ${tile_image}');
        } else {
            if ($tile->r >= 3) {
                throw new BgaUserException("You cannot activate this tile (already fully activated)");
            }
            $tile->r += 1;
            $this->DbQuery("UPDATE tile SET `r` = $tile->r WHERE `card_id` = $tile->id");

            if ($tile->type == 9) {
                $message = clienttranslate('${player_name} activates an obstacle to reduce resistance to ${resistance} ${tile_image}');
                $args['resistance'] = 3 - $tile->r;
            } else {                
                $message = clienttranslate('${player_name} activates a tile to set its production to ${types} ${tile_image}');
                $args['types'] = $tile->getProduction();
            }
        }

        self::notifyAllPlayers('activateTile', $message, $args + [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'tile' => $tile,
            'icons' => $this->getPlayerIcons($playerId),
            'tile_image' => '',
            'preserve' => ['tile'],
        ]);

        if ($tile->type == 9 && $tile->r == 3) {
            $this->tiles->moveCard($tile->id, 'void');

            $this->incPlayerResearchPoints($playerId, 3);

            self::notifyAllPlayers('removeTile', clienttranslate('${player_name} removes an obstacle and gain 3 research points'), [
                'playerId' => $playerId,
                'player_name' => $this->getPlayerName($playerId),
                'tile' => $tile,
            ]);
        }

        if ($worker->remainingWorkforce > 0) {
            $this->gamestate->nextState('stay');
        } else {
            $this->applyEndOfActivation($playerId, $worker);
        }
    }

    public function chooseNewTile(int $id) {
        self::checkAction('chooseNewTile');

        $playerId = intval($this->getActivePlayerId());
        $tile = $this->getTileById($id);

        $currentAction = new CurrentAction('tile');
        $currentAction->addTileId = $id;
        $currentAction->removeTileId = $id;
        $currentAction->remainingCost = $tile->cost;
        $currentAction->workerSpot = $tile->locationArg;
        $this->setGlobalVariable(CURRENT_ACTION, $currentAction);

        self::notifyAllPlayers('log', clienttranslate('${player_name} chooses a tile to deploy ${tile_image}'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'tile' => $tile,
            'tile_image' => '',
            'preserve' => ['tile'],
        ]);

        $this->gamestate->nextState($tile->color == BLUE_OR_ORANGE ? 'chooseRadarColor' : 'pay');
    }

    public function chooseRadarColor(int $color) {
        self::checkAction('chooseRadarColor');

        if (!in_array($color, [BLUE, ORANGE])) {
            throw new BgaUserException("Invalid color");
        }

        $playerId = intval($this->getActivePlayerId());
        $currentAction = $this->getGlobalVariable(CURRENT_ACTION);

        $radarTiles = $this->getTilesByLocation('radar');
        $tile = $this->getTileById($currentAction->removeTileId);
        $tile = $this->array_find($radarTiles, fn($t) => $t->color == $color && $t->researchPoints == $tile->researchPoints);

        $currentAction->addTileId = $tile->id;
        $this->setGlobalVariable(CURRENT_ACTION, $currentAction);

        self::notifyAllPlayers('log', clienttranslate('${player_name} chooses a ${color} radar to replace the selected tile ${tile_image}'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'tile' => $tile,
            'color' => $this->getColorName($color),
            'tile_image' => '',
            'preserve' => ['tile'],
            'i18n' => ['color'],
        ]);

        $this->gamestate->nextState('pay');
    }

    public function chooseNewResearch(int $id) {
        self::checkAction('chooseNewResearch');

        $playerId = intval($this->getActivePlayerId());
        $tile = $this->getResearchById($id);

        $currentAction = new CurrentAction('research');
        $currentAction->research = $id;
        $currentAction->remainingCost = $tile->cost;
        $currentAction->workerSpot = ($tile->locationArg + $this->getArm()) % 8;
        $this->setGlobalVariable(CURRENT_ACTION, $currentAction);

        self::notifyAllPlayers('log', clienttranslate('${player_name} chooses a research tile to deploy ${research_image}'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'research' => $tile,
            'research_image' => '',
            'preserve' => ['tile'],
        ]);

        $this->gamestate->nextState('pay');
    }

    public function autoPay() {
        self::checkAction('autoPay');

        $playerId = intval($this->getActivePlayerId());
        $playerIcons = $this->getPlayerIcons($playerId);
        $playerTiles = $this->getTilesByLocation('player', $playerId);
        $playerTiles = array_values(array_filter($playerTiles, fn($t) => $t->production !== null && $t->r > 0));

        $currentAction = $this->getGlobalVariable(CURRENT_ACTION);
        
        $pay = $this->canPay((array)$currentAction->remainingCost, $playerIcons);
        if ($pay == null) {
            throw new BgaVisibleSystemException("You cannot afford this tile");
        }

        foreach ($pay as $type => $amount) {
            $remainingAmount = $amount;

            foreach ($playerTiles as $produceTile) {
                $produce = $produceTile->getProduction();
                if (array_key_exists($type, $produce)) {
                    $rotate = min($remainingAmount, $produce[$type]);
                    $remainingAmount -= $rotate;
                    $playerIcons[$type] -= $rotate;
                    $produceTile->r -= $rotate;

                    self::notifyAllPlayers('pay', '', [
                        'playerId' => $playerId,
                        'player_name' => $this->getPlayerName($playerId),
                        'tile' => $produceTile,
                        'icons' => $playerIcons,
                    ]);

                    if ($remainingAmount == 0) {
                        break;
                    }
                }
            }
        }

        self::notifyAllPlayers('log', clienttranslate('${player_name} pays ${cost} to deploy the tile'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'cost' => $pay,
        ]);

        $this->gamestate->nextState('next');
    }

    public function endTurn() {
        self::checkAction('endTurn');

        $worker = $this->getSelectedWorker();
        if ($worker == null) {
            throw new BgaUserException("No active worker");
        }

        $playerId = intval($this->getActivePlayerId());
        $this->applyEndOfActivation($playerId, $worker);
    }

    public function confirmTurn() {
        self::checkAction('confirmTurn');

        $this->gamestate->nextState('endTurn');
    }

    private function applyEndOfActivation(int $playerId, Worker $worker) {
        if ($worker->remainingWorkforce > 0) {
            $this->DbQuery("UPDATE worker SET `remaining_workforce` = 0 WHERE `id` = $worker->id");
        }

        self::notifyAllPlayers('disableWorker', '', [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'worker' => $worker,
        ]);

        $this->gamestate->nextState('endTurn');
    }

    public function upgradeWorker(int $id) {
        self::checkAction('upgradeWorker');

        $playerId = intval($this->getActivePlayerId());

        $args = $this->argUpgradeWorker();
        $worker = $this->array_find($args['workers'], fn($worker) => $worker->id == $id);

        if ($worker == null || $worker->workforce >= 4) {
            throw new BgaUserException("Invalid worker");
        }        
        
        $currentAction = $this->getGlobalVariable(CURRENT_ACTION);
        $currentAction->upgrade--;
        $this->setGlobalVariable(CURRENT_ACTION, $currentAction);

        $this->DbQuery("UPDATE worker SET `workforce` = `workforce` + 1 WHERE `id` = $worker->id");
        if ($worker->remainingWorkforce > 0) {
            $this->DbQuery("UPDATE worker SET `remaining_workforce` = `remaining_workforce` + 1 WHERE `id` = $worker->id");
        }
        $worker->workforce++;

        self::notifyAllPlayers('upgradeWorker', clienttranslate('${player_name} upgrades a worker workforce from ${from} to ${to}'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'worker' => $worker,
            'from' => $worker->workforce - 1, // for logs
            'to' => $worker->workforce, // for logs
        ]);

        $this->gamestate->nextState($currentAction->upgrade > 0 ? 'stay' : 'endTurn');
    }

    public function moveWorker(int $x, int $y) {
        self::checkAction('moveWorker');

        $playerId = intval($this->getCurrentPlayerId());
        $arg = $this->argMoveWorker($playerId);
        $worker = $arg['worker'];

        if (!$this->array_some($arg['possibleCoordinates'], fn($coordinate) => $coordinate[0] == $x && $coordinate[1] == $y)) {
            throw new BgaUserException("Invalid coordinate");
        }
        $movedWorkers = $this->getGlobalVariable(MOVED_WORKERS);
        $movedWorker = $this->array_find($movedWorkers, fn($w) => ((object)$w)->id == ((object)$worker)->id);
        $movedWorker->x = $x;
        $movedWorker->y = $y;
        $this->setGlobalVariable(MOVED_WORKERS, $movedWorkers);
        // TODO notif

        $remaining = count(array_filter($arg['playerMovedWorkers'], fn($w) => $w->x === null)) > 1;

        $this->gamestate->nextPrivateState($playerId, $remaining ? 'stay' : 'next');
    }

    public function confirmMoveWorkers() {
        self::checkAction('confirmMoveWorkers');

        $playerId = intval($this->getCurrentPlayerId());

        $movedWorkers = $this->getGlobalVariable(MOVED_WORKERS);
        $playerMovedWorkers = array_values(array_filter($movedWorkers, fn($worker) => $worker->playerId));

        foreach ($playerMovedWorkers as $worker) {
            $this->DbQuery("UPDATE worker SET `location` = 'player', `spot` = null, `x` = $worker->x, `y` = $worker->y WHERE `id` = $worker->id");
            // TODO notif
        }

        $this->gamestate->setPlayerNonMultiactive($playerId, 'next');
    }

    public function restartTurn() {
        $playerId = intval($this->getActivePlayerId());
        $undo = $this->getGlobalVariable(UNDO);

        foreach ($undo->allObjectives as $objective) {
            $this->DbQuery("UPDATE `objective` SET `card_location` = '$objective->location', `card_location_arg` = $objective->locationArg WHERE `card_id` = $objective->id");
        }

        foreach ($undo->tableTiles as $tile) {
            $this->DbQuery("UPDATE `tile` SET `card_location` = '$tile->location', `card_location_arg` = $tile->locationArg, `x` = NULL, `y` = NULL, `r` = 0 WHERE `card_id` = $tile->id");
        }
        foreach ($undo->tableResearch as $tile) {
            $this->DbQuery("UPDATE `research` SET `card_location` = '$tile->location', `card_location_arg` = $tile->locationArg, `line` = NULL WHERE `card_id` = $tile->id");
        }
       
        $this->DbQuery("UPDATE `tile` SET `card_location` = 'radar' WHERE `card_type` = 8 && `card_location` = 'player' AND `card_location_arg` = $playerId");
        foreach ($undo->tiles as $tile) {            
            $this->DbQuery("UPDATE `tile` SET `card_location` = '$tile->location', `card_location_arg` = $tile->locationArg, `x` = $tile->x, `y` = $tile->y, `r` = $tile->r WHERE `card_id` = $tile->id");
        }
        foreach ($undo->research as $tile) {
            $this->DbQuery("UPDATE `research` SET `card_location` = '$tile->location', `card_location_arg` = $tile->locationArg, `line` = $tile->line WHERE `card_id` = $tile->id");
        }

        foreach ($undo->workers as $worker) {
            $this->DbQuery("UPDATE worker SET `location` = '$worker->location', `workforce` = $worker->workforce, `remaining_workforce` = $worker->remainingWorkforce, `spot` = ".($worker->spot === null ? 'NULL' : $worker->spot).", `x` = ".($worker->x === null ? 'NULL' : $worker->x).", `y` = ".($worker->y === null ? 'NULL' : $worker->y)." WHERE `id` = $worker->id");
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
