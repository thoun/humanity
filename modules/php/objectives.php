<?php

trait ObjectiveTrait {

    function getObjectiveFromDb(/*?array*/ $dbCard) {
        if ($dbCard == null) {
            return null;
        }
        return new Objective($dbCard, $this->OBJECTIVES);
    }

    function getObjectivesFromDb(array $dbCards) {
        return array_map(fn($dbCard) => $this->getObjectiveFromDb($dbCard), array_values($dbCards));
    }

    function getObjectivesByLocation(?string $location = null, ?int $location_arg = null, ?int $type = null, ?int $number = null) {
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

    function getAdjacentTilesCount(array $tiles, Tile $fromTile, bool $diagonal, array $alreadyCounted) {
        $maxFromHere = 0;

        $adjacentTiles = $this->getAdjacentTiles($tiles, $fromTile, $diagonal);
        foreach ($adjacentTiles as $adjacentTile) {
            if (!$this->array_some($alreadyCounted, fn($countedTile) => $countedTile->id == $adjacentTile->id)) {
                $fromAdjacentTile = $this->getAdjacentTilesCount(
                    $tiles, 
                    $adjacentTile, 
                    $diagonal, 
                    array_merge($alreadyCounted, [$adjacentTile]),
                );
                if ($fromAdjacentTile > $maxFromHere) {
                    $maxFromHere = $fromAdjacentTile;
                }
            }
        }

        return $maxFromHere + count($alreadyCounted);
    }

    function countTilesOfColor(int $playerId, int $color, bool $adjacent, bool $diagonal) {
        $tiles = $this->getTilesByLocation('player', $playerId);
        $tilesOfColor = array_values(array_filter($tiles, fn($tile) => $tile->color == $color));

        if ($adjacent) {
            return max(array_map(fn($fromTile) => $this->getAdjacentTilesCount($tilesOfColor, $fromTile, $diagonal, [$fromTile]), $tilesOfColor));
        } else {
            return count($tilesOfColor);
        }
    }

    function getMaxTilesInDirectionFromTile(array $tiles, Tile $fromTile, int $x, int $y, bool $sameColor) {
        $count = 1;
        do {
            $nextTile = $this->array_find($tiles, fn($tile) => 
                $tile->x == $fromTile->x + $x * $count && $tile->y == $fromTile->y + $y * $count
            );

            if ($nextTile !== null && (!$sameColor || $nextTile->color == $fromTile->color)) {
                $count++;
            } else {
                return $count;
            }
        } while (true);
    }

    function getMaxTilesInDirection(int $playerId, int $direction, bool $sameColor) {
        $tiles = $this->getTilesByLocation('player', $playerId);

        if ($direction == HORIZONTAL) {
            return max(array_map(fn($fromTile) => $this->getMaxTilesInDirectionFromTile($tiles, $fromTile, 1, 0, $sameColor), $tiles));
        } else if ($direction == VERTICAL) {
            return max(array_map(fn($fromTile) => $this->getMaxTilesInDirectionFromTile($tiles, $fromTile, 0, 1, $sameColor), $tiles));
        } else if ($direction == DIAGONAL) {
            return max(
                max(array_map(fn($fromTile) => $this->getMaxTilesInDirectionFromTile($tiles, $fromTile, 1, 1, $sameColor), $tiles)),
                max(array_map(fn($fromTile) => $this->getMaxTilesInDirectionFromTile($tiles, $fromTile, -1, 1, $sameColor), $tiles)),
            );
        }
    }

    function getResearchTypeIcons(int $playerId, int $baseType) {
        $researchTiles = $this->getResearchsByLocation('player', $playerId);
        $count = 0;

        foreach ($researchTiles as $researchTile) {
            if (array_key_exists($baseType, $researchTile->cost)) {
                $count += $researchTile->cost[$baseType];
            }
            if (array_key_exists($baseType + 10, $researchTile->cost)) {
                $count += $researchTile->cost[$baseType + 10];
            }
        }

        return $count;
    }

    function getResearchExtremities(int $playerId, int $extremity) {
        $researchTiles = $this->getResearchsByLocation('player', $playerId);
        return count(array_filter($researchTiles, fn($researchTile) => $researchTile->extremity == $extremity));
    }
    
    function fulfillObjective(int $playerId, Objective $objective) {
        if ($objective->color !== null) {
            return $this->countTilesOfColor($playerId, $objective->color, $objective->adjacent, $objective->diagonal) >= $objective->minimum;
        } else if ($objective->direction !== null) {
            return $this->getMaxTilesInDirection($playerId, $objective->direction, $objective->sameColor) >= $objective->minimum;
        } else if ($objective->baseType !== null) {
            return $this->getResearchTypeIcons($playerId, $objective->baseType) >= $objective->minimum;
        } else if ($objective->extremity !== null) {
            return $this->getResearchExtremities($playerId, $objective->extremity) >= $objective->minimum;
        }
        return false;
    }
    
    function gainObjective(int $playerId, Objective $objective) {
        $fromPlayerId = null;
        if ($objective->location == 'player') {
            $fromPlayerId = $objective->locationArg;
        }

        $this->objective->moveCard($objective->id, 'player', $playerId);

        if ($fromPlayerId !== null) {
            $this->incPlayerScore($fromPlayerId, -3, clienttranslate('${player_name} loses ${absInc} points for lost objective (to ${player_name2})'), [ 'player_name2' => $this->getPlayerName($playerId) ]);
        } else {
            $this->incPlayerScience($playerId, 1);
        } 
        $this->incPlayerScore($playerId, 3, clienttranslate('${player_name} gains ${inc} points for completed objective'));

        $message = $fromPlayerId === null ?
            clienttranslate('${player_name} gains an objective card and 1 science point') :
            clienttranslate('${player_name} gains an objective card previously owned by ${player_name2}');

        self::notifyAllPlayers('gainObjective', $message, [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'objective' => $objective,
            'fromPlayerId' => $fromPlayerId,
            'player_name2' => $fromPlayerId !== null ? $this->getPlayerName($fromPlayerId) : null, // for logs
        ]);
    }
}
