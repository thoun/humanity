<?php

trait WorkerTrait {

    function setupWorkers(array $playersIds) {
        $sql = "INSERT INTO worker (`player_id`, `location`, `x`, `y`, `spot`) VALUES ";
        $values = [];
        foreach($playersIds as $index => $playerId) {
            $startPosition = 7 - $index - (4 - count($playersIds));
            $values[] = "($playerId, 'player', -1, -1, NULL)";
            $values[] = "($playerId, 'player', 1, -1, NULL)";
            $values[] = "($playerId, 'table', NULL, NULL, $startPosition)";
        }

        $sql .= implode(',', $values);
        $this->DbQuery($sql);
    } 

    function getWorkerById(int $id) {
        $sql = "SELECT * FROM worker WHERE `id` = $id";
        $dbWorkers = $this->getCollectionFromDB($sql);
        return array_map(fn($dbWorker) => new Worker($dbWorker), array_values($dbWorkers))[0];
    }

    function getPlayerWorkers(int $playerId, ?string $location = null, bool $filterRemainingWorkforce = false) {
        $sql = "SELECT * FROM worker WHERE `player_id` = $playerId";
        if ($location !== null) {
            $sql .= " AND `location` = '$location'";
        }
        if ($filterRemainingWorkforce) {
            $sql .= " AND `remaining_workforce` > 0";
        }
        $dbWorkers = $this->getCollectionFromDB($sql);
        return array_map(fn($dbWorker) => new Worker($dbWorker), array_values($dbWorkers));
    }

    function getTableWorkers() {
        $sql = "SELECT * FROM worker WHERE `location` = 'table'";
        $dbWorkers = $this->getCollectionFromDB($sql);
        return array_map(fn($dbWorker) => new Worker($dbWorker), array_values($dbWorkers));
    }

    function countRemainingWorkers(?int $playerId = null) {
        $sql = "SELECT count(*) FROM worker WHERE `location` = 'player' && `remaining_workforce` > 0";
        if ($playerId !== null) {
            $sql .= " AND `player_id` = '$playerId'";
        }
        return intval($this->getUniqueValueFromDB($sql));
    }

    function getSelectedWorker() {
        $currentAction = $this->getGlobalVariable(CURRENT_ACTION);
        return $currentAction != null ? $this->getWorkerById($currentAction->selectedWorker) : null;
    }

    function gainTimeUnit(int $playerId, int $amount) {
        $workers = $this->getPlayerWorkers($playerId, 'table');
        $arm = $this->getArm();
        $movedWorkers = [];

        foreach ($workers as $worker) {
            if (($worker->spot - $amount + 7 % 7) != $arm) {

                $moved = min($amount, (($worker->spot - $amount + 8) % 8) - $arm);
                self::notifyAllPlayers('log', "arm $arm, init spot $worker->spot, moved $moved, new spot ".($worker->spot - $moved), []);
                $worker->spot -= $moved;
                $this->DbQuery("UPDATE worker SET `spot` = $worker->spot WHERE `id` = $worker->id");

                $movedWorkers[] = $worker;
            }
        }

        self::notifyAllPlayers('gainTimeUnit', clienttranslate('${player_name} gains ${amount} time unit and shift its table workers'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'workers' => $movedWorkers,
            'amount' => $amount, // for logs
        ]);
    }

    function reactivatePlayerWorkers(?int $playerId) {
        $sql = "UPDATE worker SET `remaining_workforce` = `workforce`";
        if ($playerId !== null) {
            $sql .= " WHERE `player_id` = $playerId";

        }
        $this->DbQuery($sql);

        $message = $playerId !== null ?
            clienttranslate('${player_name} reactivates table workers') :
            clienttranslate('All players reactivates table workers');

        self::notifyAllPlayers('reactivateWorkers', $message, [
            'playerId' => $playerId,
            'player_name' => $playerId !== null ? $this->getPlayerName($playerId) : null,
        ]);
    }
    
    function moveWorkerToTable(int $playerId,  Worker $worker, int $spot) {
        $this->DbQuery("UPDATE worker SET `location` = 'table', `x` = null, `y` = null, `spot` = $spot WHERE `id` = $worker->id");
        $worker->location = 'table';
        $worker->spot = $spot;

        self::notifyAllPlayers('moveWorkerToTable', '', [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'worker' => $worker,
        ]);
    }

    function getWorkerPossibleCoordinates(int $playerId, array $alreadyMovedWorkers) {
        $workers = $this->getPlayerWorkers($playerId);
        $tilesAndObstacles = ($this->getTilesByLocation('player', $playerId));
        $tiles = array_values(array_filter($tilesAndObstacles, fn($tile) => $tile->type !== 9));
        $possibleCoordinates = [];

        foreach ($tiles as $tile) {    
            for ($dx = -1; $dx <= 1; $dx++) {
                for ($dy = -1; $dy <= 1; $dy++) {
                    if ($dx == 0 && $dy == 0) { continue; }
                    if ($dx != 0 && $dy != 0) { continue; }

                    $x = $tile->x + $dx;
                    $y = $tile->y + $dy;

                    if (
                        !$this->array_some($tilesAndObstacles, fn($t) => $t->x == $x && $t->y == $y) // no tile or obstacle in this place
                        && !$this->array_some($workers, fn($w) => $w->x == $x && $w->y == $y) // no worker in this place
                        && !$this->array_some($alreadyMovedWorkers, fn($w) => $w->x == $x && $w->y == $y) // not already moved worker in this place
                        && !$this->array_some($possibleCoordinates, fn($pc) => $pc[0] == $x && $pc[1] == $y) // not already in the array
                    ) {
                        $possibleCoordinates[] = [$x, $y];
                    }
                }
            }
        }

        return $possibleCoordinates;
    }

}