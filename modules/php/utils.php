<?php

trait UtilTrait {

    //////////////////////////////////////////////////////////////////////////////
    //////////// Utility functions
    ////////////

    function array_find(array $array, callable $fn) {
        foreach ($array as $value) {
            if($fn($value)) {
                return $value;
            }
        }
        return null;
    }

    function array_findIndex(array $array, callable $fn) {
        $index = 0;
        foreach ($array as $value) {
            if($fn($value)) {
                return $index;
            }
            $index++;
        }
        return null;
    }

    function array_find_key(array $array, callable $fn) {
        foreach ($array as $key => $value) {
            if($fn($value)) {
                return $key;
            }
        }
        return null;
    }

    function array_some(array $array, callable $fn) {
        foreach ($array as $value) {
            if($fn($value)) {
                return true;
            }
        }
        return false;
    }
    
    function array_every(array $array, callable $fn) {
        foreach ($array as $value) {
            if(!$fn($value)) {
                return false;
            }
        }
        return true;
    }

    function setGlobalVariable(string $name, /*object|array*/ $obj) {
        /*if ($obj == null) {
            throw new \Error('Global Variable null');
        }*/
        $jsonObj = json_encode($obj);
        $this->DbQuery("INSERT INTO `global_variables`(`name`, `value`)  VALUES ('$name', '$jsonObj') ON DUPLICATE KEY UPDATE `value` = '$jsonObj'");
    }

    function getGlobalVariable(string $name, $asArray = null) {
        $json_obj = $this->getUniqueValueFromDB("SELECT `value` FROM `global_variables` where `name` = '$name'");
        if ($json_obj) {
            $object = json_decode($json_obj, $asArray);
            return $object;
        } else {
            return null;
        }
    }

    function deleteGlobalVariable(string $name) {
        $this->DbQuery("DELETE FROM `global_variables` where `name` = '$name'");
    }

    function deleteGlobalVariables(array $names) {
        $this->DbQuery("DELETE FROM `global_variables` where `name` in (".implode(',', array_map(fn($name) => "'$name'", $names)).")");
    }

    function getPlayersIds() {
        return array_keys($this->loadPlayersBasicInfos());
    }

    function getPlayerName(int $playerId) {
        return self::getUniqueValueFromDB("SELECT player_name FROM player WHERE player_id = $playerId");
    }

    function getPlayer(int $id) {
        $sql = "SELECT * FROM player WHERE player_id = $id";
        $dbResults = $this->getCollectionFromDb($sql);
        return array_map(fn($dbResult) => new HumanityPlayer($dbResult), array_values($dbResults))[0];
    }

    function incPlayerScore(int $playerId, int $amount, $message = '', $args = []) {
        if ($amount != 0) {
            $this->DbQuery("UPDATE player SET `player_score` = `player_score` + $amount WHERE player_id = $playerId");
        }
            
        $this->notifyAllPlayers('score', $message, [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'newScore' => $this->getPlayer($playerId)->score,
            'incScore' => $amount,
        ] + $args);
    }

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

    function getTileFromDb(/*array|null*/ $dbCard) {
        if ($dbCard == null) {
            return null;
        }
        return new Tile($dbCard, $this->TILES);
    }

    function getTilesFromDb(array $dbCards) {
        return array_map(fn($dbCard) => $this->getTileFromDb($dbCard), array_values($dbCards));
    }

    function getTileById(int $id) {
        $sql = "SELECT * FROM `tile` WHERE `card_id` = $id";
        $dbResults = $this->getCollectionFromDb($sql);
        $tiles = array_map(fn($dbCard) => $this->getTileFromDb($dbCard), array_values($dbResults));
        return count($tiles) > 0 ? $tiles[0] : null;
    }

    function getTilesByLocation(string $location, /*int|null*/ $location_arg = null, /*int|null*/ $type = null, /*int|null*/ $number = null) {
        $sql = "SELECT * FROM `tile` WHERE `card_location` = '$location'";
        if ($location_arg !== null) {
            $sql .= " AND `card_location_arg` = $location_arg";
        }
        if ($type !== null) {
            $sql .= " AND `card_type` = $type";
        }
        if ($number !== null) {
            $sql .= " AND `card_type_arg` = $number";
        }
        $sql .= " ORDER BY `card_location_arg`";
        $dbResults = $this->getCollectionFromDb($sql);
        return array_map(fn($dbCard) => $this->getTileFromDb($dbCard), array_values($dbResults));
    }

    function setupTiles(array $players) {
        foreach ([1, 2, 3] as $age => $tilesType) {
            $tiles = [];
            foreach ($this->TILES[$age] as $subType => $tileType) {
                $tiles[] = [ 'type' => $age, 'type_arg' => $subType, 'nbr' => 1 ];
            }
            $this->tiles->createCards($tiles, 'deck'.$age);
            $this->tiles->shuffle('deck'.$age);
        }

        foreach ([1, 2, 3, 4, 5, 6, 7] as $spot) {
            $this->tiles->pickCardForLocation('deck1', 'table', $spot);
        }

        foreach ($players as $playerId => $player) {
            $tiles = [];
            foreach ($this->TILES[0] as $subType => $tileType) {
                $this->tiles->createCards([[ 'type' => 0, 'type_arg' => $subType, 'nbr' => 1 ]], 'temp');
                $cardId = $this->getTilesByLocation('temp')[0]->id;
                $position = $this->STARTING_TILE_POSITIONS[$subType];
                $x = $position[0];
                $y = $position[1];
                $this->DbQuery("UPDATE `tile` SET `card_location` = 'player', `card_location_arg` = $playerId, `x` = $x, `y` = $y WHERE card_id = $cardId");
            }
            
            $this->tiles->createCards([[ 'type' => 9, 'type_arg' => 0, 'nbr' => 3 ]], 'temp');
            $obstacles = $this->getTilesByLocation('temp');
            foreach ($obstacles as $index => $obstacle) {
                $cardId = $obstacle->id;
                $position = $this->OBSTACLE_POSITIONS[$index];
                $x = $position[0];
                $y = $position[1];
                $this->DbQuery("UPDATE `tile` SET `card_location` = 'player', `card_location_arg` = $playerId, `x` = $x, `y` = $y WHERE card_id = $cardId");
            }
        }
    }

    function getResearchFromDb(/*array|null*/ $dbCard) {
        if ($dbCard == null) {
            return null;
        }
        return new Research($dbCard, $this->RESEARCH);
    }

    function getResearchsFromDb(array $dbCards) {
        return array_map(fn($dbCard) => $this->getResearchFromDb($dbCard), array_values($dbCards));
    }

    function getResearchsByLocation(string $location, /*int|null*/ $location_arg = null, /*int|null*/ $type = null, /*int|null*/ $number = null) {
        $sql = "SELECT * FROM `research` WHERE `card_location` = '$location'";
        if ($location_arg !== null) {
            $sql .= " AND `card_location_arg` = $location_arg";
        }
        if ($type !== null) {
            $sql .= " AND `card_type` = $type";
        }
        if ($number !== null) {
            $sql .= " AND `card_type_arg` = $number";
        }
        $sql .= " ORDER BY `card_location_arg`";
        $dbResults = $this->getCollectionFromDb($sql);
        return array_map(fn($dbCard) => $this->getResearchFromDb($dbCard), array_values($dbResults));
    }

    function setupResearches() {
        $tiles[] = [1 => [], 2 => [], 3 => []];
        foreach ([1, 2, 3] as $year) {
            foreach ($this->RESEARCH[$year] as $number => $researchType) {
                $tiles[$year][] = [ 'type' => $year, 'type_arg' => $number, 'nbr' => 1 ];
            }

            $this->research->createCards($tiles[$year], 'deck'.$year);
            $this->research->shuffle('deck'.$year);
        }

        foreach ([1, 2, 3, 4, 5, 6, 7] as $spot) {
            $this->research->pickCardForLocation('deck1', 'table', $spot);
        }
    }

    function getObjectiveFromDb(/*?array*/ $dbCard) {
        if ($dbCard == null) {
            return null;
        }

        self::notifyAllPlayers('log', clienttranslate('objective = ${objective}'), [
            'objective' => json_encode($dbCard),
        ]);

        return new Objective($dbCard, $this->OBJECTIVES);
    }

    function getObjectivesFromDb(array $dbCards) {
        return array_map(fn($dbCard) => $this->getObjectiveFromDb($dbCard), array_values($dbCards));
    }

    function getObjectivesByLocation(?string $location, ?int $location_arg = null, ?int $type = null, ?int $number = null) {
        $sql = "SELECT * FROM `objective` WHERE";
        if ($location !== null) {
            $sql .= " `card_location` = '$location'";
        } else {
            $sql .= " `card_location` NOT LIKE 'deck%'";
        }
        if ($location_arg !== null) {
            $sql .= " AND `card_location_arg` = $location_arg";
        }
        if ($type !== null) {
            $sql .= " AND `card_type` = $type";
        }
        if ($number !== null) {
            $sql .= " AND `card_type_arg` = $number";
        }
        $sql .= " ORDER BY `card_location_arg`";
        $dbResults = $this->getCollectionFromDb($sql);

        return array_map(fn($dbCard) => $this->getObjectiveFromDb($dbCard), array_values($dbResults));
    }

    function setupObjectives() {
        $tiles[] = ['A' => [], 'B' => [], 'C' => []];
        foreach (['A', 'B', 'C'] as $index => $letter) {
            foreach ($this->OBJECTIVES[$index + 1] as $number => $objectiveType) {
                $tiles[$letter][] = [ 'type' => $index + 1, 'type_arg' => $number, 'nbr' => 1 ];
            }

            $this->objectives->createCards($tiles[$letter], 'deck'.$letter);
            $this->objectives->shuffle('deck'.$letter);
        }

        foreach (['A', 'B', 'C'] as $index => $letter) {
            $this->objectives->pickCardForLocation('deck'.$letter, 'table', $index + 1);
        }
    }

    function getSelectedWorker() {
        return $this->getWorkerById($this->getGlobalVariable(SELECTED_WORKER));
    }

    function getArm() {
        return $this->getGlobalVariable(ARM) ?? 0;
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
}
