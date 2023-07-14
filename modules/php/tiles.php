<?php

trait TileTrait {

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
                $this->DbQuery("UPDATE `tile` SET `card_location` = 'player', `card_location_arg` = $playerId, `x` = $x, `y` = $y, `r` = 1 WHERE card_id = $cardId");
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

    function getAdjacentTiles(array $tiles, Tile $fromTile, bool $diagonal = false) {
        $adjacentTiles = [];
        for ($x = -1; $x <= 1; $x++) {
            for ($y = -1; $y <= 1; $y++) {
                if ($x == 0 && $y == 0) { continue; }
                if (!$diagonal && $x != 0 && $y != 0) { continue; }
            }

            $adjacentTile = $this->array_find($tiles, fn($tile) => 
                $tile->x == $fromTile->x + $x && $tile->y == $fromTile->y + $y
            );

            if ($adjacentTile != null){
                $adjacentTiles[] = $adjacentTile;
            }
        }

        return $adjacentTiles;
    }

    function deployTile(int $playerId, /*CurrentAction*/ $currentAction, Worker $worker) {
        $this->moveWorkerToTable($playerId, $worker, $currentAction->spot);
        $tile = $this->getTileById($currentAction->tile);

        $r = $tile->production != null ? 1 : 0;
        $this->DbQuery("UPDATE tile SET card_location = 'player', card_location_arg = $playerId, `x` = $worker->x, `y` = $worker->y, `r` = $r WHERE `card_id` = $tile->id");
        $tile->location = 'player';
        $tile->locationArg = $playerId;
        $tile->x = $worker->x;
        $tile->y = $worker->y;
        $tile->r = $r;

        self::notifyAllPlayers('deployTile', '', [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'tile' => $tile,
        ]);

        $points = $tile->points;
        /* TODO
5 Vérifiez si votre nouveau module vient compléter un carré de
quatre modules. Si c’est le cas, vous gagnez immédiatement
un pion point de victoire que vous placez à l’intersection des
quatre modules et vous avancez d’une case sur la piste de
score. Vérifiez également si le carré que vous venez de former
vous permet d’améliorer un astronaute. Cette étape est
détaillée p. 11.
Dépensez des ressources*/
        if ($points > 0) {
            $this->incPlayerScore($playerId, $tile->points, clienttranslate('${player_name} gains ${inc} points with placed tile'));
        }
        $science = $tile->science;
        // TODO adjacentScience
        if ($science > 0) {
            $this->incPlayerScience($playerId, $tile->points, clienttranslate('${player_name} gains ${inc} science points with placed tile'));
        }
    }
    
    function getPlayerIcons(int $playerId) {
        $allTiles = $this->getTilesByLocation('player', $playerId);
        $tiles = array_values(array_filter($allTiles, fn($tile) => $tile->production != null));
        //$this->debug($tiles);

        $icons = [ELECTRICITY => 0, 1 => 0, 2 => 0, 3 => 0, 11 => 0, 12 => 0, 13 => 0];

        foreach ($tiles as $tile) {
            $production = $tile->production[$tile->r];

            foreach ($production as $type => $amount) {
                if ($type == ELECTRICITY) {
                    //$this->debug($amount);
                    self::notifyAllPlayers('log', "$playerId, tileId $tile->id, r $tile->r, type $type, amount $amount production ".json_encode($production), []);
                }
                $icons[$type] += $amount;
            }
        }

        return $icons;
    }
}
