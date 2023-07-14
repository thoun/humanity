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

    function gainTimeUnit(int $playerId, int $amount) { // TODO test
        $workers = $this->getPlayerWorkers($playerId, 'table');
        $arm = $this->getArm();
        $movedWorkers = [];

        foreach ($workers as $worker) {
            if ($worker->spot - 1 > $arm) { // TODO handle % if $arm >= $worker

                $moved = min($amount, $worker->spot - 1 - $arm);
                $worker->spot -= $moved;
                $this->DbQuery("UPDATE worker SET `spot` = $worker->spot WHERE `id` = $worker->id");

                $movedWorkers = $worker;
            }
        }

        self::notifyAllPlayers('gainTimeUnit', clienttranslate('${player_name} gains ${amount} time unit and shift its table workers'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'workers' => $movedWorkers,
            'amount' => $amount, // for logs
        ]);
    }

    function reactivatePlayerWorkers() {
        $this->DbQuery("UPDATE worker SET `remaining_workforce` = `workforce`");
    }
    
    function moveWorkerToTable(int $playerId,  Worker $worker, int $spot) {
        $this->DbQuery("UPDATE worker SET `location` = 'table', `spot` = $spot WHERE `id` = $worker->id");
        $worker->location = 'table';
        $worker->spot = $spot;

        self::notifyAllPlayers('moveWorkerToTable', '', [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'worker' => $worker,
        ]);
    }

}
