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
        $modules[] = ['A' => [], 'B' => [], 'C' => []];
        foreach (['A', 'B', 'C'] as $index => $letter) {
            foreach ($this->OBJECTIVES[$index + 1] as $number => $objectiveType) {
                $modules[$letter][] = [ 'type' => $index + 1, 'type_arg' => $number, 'nbr' => 1 ];
            }

            $this->objectives->createCards($modules[$letter], 'deck'.$letter);
            $this->objectives->shuffle('deck'.$letter);
        }

        foreach (['A', 'B', 'C'] as $index => $letter) {
            $this->objectives->pickCardForLocation('deck'.$letter, 'table', $index + 1);
        }
    }

    function getAdjacentModulesCount(array $modules, Module $fromModule, bool $diagonal, array $alreadyCounted) {
        $maxFromHere = 0;

        $adjacentModules = $this->getAdjacentModules($modules, $fromModule, $diagonal);
        foreach ($adjacentModules as $adjacentModule) {
            if (!$this->array_some($alreadyCounted, fn($countedModule) => $countedModule->id == $adjacentModule->id)) {
                $fromAdjacentModule = $this->getAdjacentModulesCount(
                    $modules, 
                    $adjacentModule, 
                    $diagonal, 
                    array_merge($alreadyCounted, [$adjacentModule]),
                );
                if ($fromAdjacentModule > $maxFromHere) {
                    $maxFromHere = $fromAdjacentModule;
                }
            }
        }

        return $maxFromHere + count($alreadyCounted);
    }

    function countModulesOfColor(int $playerId, int $color, bool $adjacent, bool $diagonal) {
        $modules = $this->getModulesByLocation('player', $playerId);
        $modulesOfColor = array_values(array_filter($modules, fn($module) => $module->color == $color));

        if ($adjacent) {
            return max(array_map(fn($fromModule) => $this->getAdjacentModulesCount($modulesOfColor, $fromModule, $diagonal, [$fromModule]), $modulesOfColor));
        } else {
            return count($modulesOfColor);
        }
    }

    function getMaxModulesInDirectionFromModule(array $modules, Module $fromModule, int $x, int $y, bool $sameColor) {
        $count = 1;
        do {
            $nextModule = $this->array_find($modules, fn($module) => 
                $module->x == $fromModule->x + $x * $count && $module->y == $fromModule->y + $y * $count
            );

            if ($nextModule !== null && (!$sameColor || $nextModule->color == $fromModule->color)) {
                $count++;
            } else {
                return $count;
            }
        } while (true);
    }

    function getMaxModulesInDirection(int $playerId, int $direction, bool $sameColor) {
        $modules = $this->getModulesByLocation('player', $playerId);

        if ($direction == HORIZONTAL) {
            return max(array_map(fn($fromModule) => $this->getMaxModulesInDirectionFromModule($modules, $fromModule, 1, 0, $sameColor), $modules));
        } else if ($direction == VERTICAL) {
            return max(array_map(fn($fromModule) => $this->getMaxModulesInDirectionFromModule($modules, $fromModule, 0, 1, $sameColor), $modules));
        } else if ($direction == DIAGONAL) {
            return max(
                max(array_map(fn($fromModule) => $this->getMaxModulesInDirectionFromModule($modules, $fromModule, 1, 1, $sameColor), $modules)),
                max(array_map(fn($fromModule) => $this->getMaxModulesInDirectionFromModule($modules, $fromModule, -1, 1, $sameColor), $modules)),
            );
        }
    }

    function getResearchTypeIcons(int $playerId, int $baseType) {
        $researchModules = $this->getResearchsByLocation('player', $playerId);
        $count = 0;

        foreach ($researchModules as $researchModule) {
            if (array_key_exists($baseType, $researchModule->cost)) {
                $count += $researchModule->cost[$baseType];
            }
            if (array_key_exists($baseType + 10, $researchModule->cost)) {
                $count += $researchModule->cost[$baseType + 10];
            }
        }

        return $count;
    }

    function getResearchExtremities(int $playerId, int $extremity) {
        $researchModules = $this->getResearchsByLocation('player', $playerId);
        return count(array_filter($researchModules, fn($researchModule) => $researchModule->extremity == $extremity));
    }
    
    function fulfillObjective(int $playerId, Objective $objective) {
        if ($objective->color !== null) {
            return $this->countModulesOfColor($playerId, $objective->color, $objective->adjacent, $objective->diagonal) >= $objective->minimum;
        } else if ($objective->direction !== null) {
            return $this->getMaxModulesInDirection($playerId, $objective->direction, $objective->sameColor) >= $objective->minimum;
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

        $this->objectives->moveCard($objective->id, 'player', $playerId);

        if ($fromPlayerId !== null) {
            $this->incPlayerVP($fromPlayerId, -3, clienttranslate('${player_name} loses ${absInc} points for lost objective (to ${player_name2})'), [ 'player_name2' => $this->getPlayerName($playerId) ]);
        } else {
            $this->incPlayerScience($playerId, 1, clienttranslate('${player_name} gains ${inc} science point for being the first player to complete this objective'));
        } 
        $this->incPlayerVP($playerId, 3, clienttranslate('${player_name} gains ${inc} points for completed objective'));

        $message = $fromPlayerId === null ?
            clienttranslate('${player_name} gains an objective card and 1 science point ${objective_image}') :
            clienttranslate('${player_name} gains an objective card previously owned by ${player_name2} ${objective_image}');

        self::notifyAllPlayers('gainObjective', $message, [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'objective' => $objective,
            'fromPlayerId' => $fromPlayerId,
            'player_name2' => $fromPlayerId !== null ? $this->getPlayerName($fromPlayerId) : null, // for logs
            'objective_image' => '',
            'preserve' => ['objective'],
        ]);
    }
}
