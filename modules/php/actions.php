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
        
        $stateId = intval($this->gamestate->state_id());
        
        if ($stateId == ST_PLAYER_CHOOSE_ACTION) {
            $currentAction = new CurrentAction('activate');
            $currentAction->selectedWorker = $id;
            $this->setGlobalVariable(CURRENT_ACTION, $currentAction);

            $this->gamestate->nextState('activate');
        } else {
            $playerId = intval($this->getActivePlayerId());

            $currentAction = $this->getGlobalVariable(CURRENT_ACTION);
            $currentAction->selectedWorker = $id;
            $this->setGlobalVariable(CURRENT_ACTION, $currentAction);

            if ($currentAction->type == 'tile') {
                $this->deployTile($playerId, $currentAction, $worker);
            } else if ($currentAction->type == 'research') {
                $this->deployResearch($playerId, $currentAction, $worker);
            }

            $this->gamestate->nextState('endTurn');
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

        if ($tile->matchType) {
            if ($tile->matchType == RESEARCH_POWER_TIME) {
                $this->gainTimeUnit($playerId, 1);
            }
        } else {
            if ($tile->r >= 3) {
                throw new BgaUserException("You cannot activate this tile (already fully activated)");
            }
            $tile->r += 1;
            $this->DbQuery("UPDATE tile SET `r` = $tile->r WHERE `card_id` = $tile->id");
        }

        self::notifyAllPlayers('activateTile', clienttranslate('${player_name} activates tile'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'tile' => $tile,
            'icons' => $this->getPlayerIcons($playerId),
        ]);

        if ($tile->type == 9 && $tile->r == 3) {
            $this->DbQuery("DELETE from tile WHERE `card_id` = $tile->id");

            $this->incPlayerScience($playerId, 3, '');

            self::notifyAllPlayers('removeTile', clienttranslate('${player_name} removes an obstacle and gain 3 science points'), [
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

        $currentAction = new CurrentAction('tile');
        $currentAction->tile = $id;
        $currentAction->spot = 1; // TODO
        $this->setGlobalVariable(CURRENT_ACTION, $currentAction);

        $this->gamestate->nextState('pay');
    }

    public function chooseNewResearch(int $id) {
        self::checkAction('chooseNewResearch');

        $currentAction = new CurrentAction('research');
        $currentAction->research = $id;
        $currentAction->spot = 2; // TODO
        $this->setGlobalVariable(CURRENT_ACTION, $currentAction);

        $this->gamestate->nextState('pay');
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
}
