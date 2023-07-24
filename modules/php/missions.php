<?php

trait MissionTrait {

    function getMissionFromDb(/*?array*/ $dbCard) {
        if ($dbCard == null) {
            return null;
        }
        return new Mission($dbCard, $this->MISSIONS);
    }

    function getMissionsFromDb(array $dbCards) {
        return array_map(fn($dbCard) => $this->getMissionFromDb($dbCard), array_values($dbCards));
    }

    function getMissionsByLocation(?string $location = null, ?int $location_arg = null, ?int $type = null, ?int $number = null) {
        $sql = "SELECT * FROM `mission` WHERE";
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

        return array_map(fn($dbCard) => $this->getMissionFromDb($dbCard), array_values($dbResults));
    }

    function setupMissions() {
        $modules[] = ['A' => [], 'B' => [], 'C' => []];
        foreach (['A', 'B', 'C'] as $index => $letter) {
            foreach ($this->MISSIONS[$index + 1] as $number => $missionType) {
                $modules[$letter][] = [ 'type' => $index + 1, 'type_arg' => $number, 'nbr' => 1 ];
            }

            $this->missions->createCards($modules[$letter], 'deck'.$letter);
            $this->missions->shuffle('deck'.$letter);
        }

        foreach (['A', 'B', 'C'] as $index => $letter) {
            $this->missions->pickCardForLocation('deck'.$letter, 'table', $index + 1);
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
            $maxes = array_map(fn($fromModule) => $this->getAdjacentModulesCount($modulesOfColor, $fromModule, $diagonal, [$fromModule]), $modulesOfColor);
            return count($maxes) > 0 ? max($maxes) : 0;
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

    function getExperimentTypeIcons(int $playerId, int $baseType) {
        $experiments = $this->getExperimentsByLocation('player', $playerId);
        $count = 0;

        foreach ($experiments as $experiment) {
            if (array_key_exists($baseType, $experiment->cost)) {
                $count += $experiment->cost[$baseType];
            }
            if (array_key_exists($baseType + 10, $experiment->cost)) {
                $count += $experiment->cost[$baseType + 10];
            }
        }

        return $count;
    }

    function getExperimentExtremities(int $playerId, int $extremity) {
        $experiments = $this->getExperimentsByLocation('player', $playerId);
        return count(array_filter($experiments, fn($experiment) => $experiment->extremity == $extremity));
    }
    
    function fulfillMission(int $playerId, Mission $mission) {
        if ($mission->color !== null) {
            return $this->countModulesOfColor($playerId, $mission->color, $mission->adjacent, $mission->diagonal) >= $mission->minimum;
        } else if ($mission->direction !== null) {
            return $this->getMaxModulesInDirection($playerId, $mission->direction, $mission->sameColor) >= $mission->minimum;
        } else if ($mission->baseType !== null) {
            return $this->getExperimentTypeIcons($playerId, $mission->baseType) >= $mission->minimum;
        } else if ($mission->extremity !== null) {
            return $this->getExperimentExtremities($playerId, $mission->extremity) >= $mission->minimum;
        }
        return false;
    }
    
    function gainMission(int $playerId, Mission $mission) {
        $fromPlayerId = null;
        if ($mission->location == 'player') {
            $fromPlayerId = $mission->locationArg;
        }

        $this->missions->moveCard($mission->id, 'player', $playerId);

        if ($fromPlayerId !== null) {
            $this->incPlayerVP($fromPlayerId, -3, clienttranslate('${player_name} loses ${absInc} points for lost mission (to ${player_name2})'), [ 'player_name2' => $this->getPlayerName($playerId) ]);
        } else {
            $this->incPlayerScience($playerId, 1, clienttranslate('${player_name} gains ${inc} science point for being the first player to complete this mission'));
        } 
        $this->incPlayerVP($playerId, 3, clienttranslate('${player_name} gains ${inc} points for completed mission'));

        $message = $fromPlayerId === null ?
            clienttranslate('${player_name} gains an mission card and 1 science point ${mission_image}') :
            clienttranslate('${player_name} gains an mission card previously owned by ${player_name2} ${mission_image}');

        self::notifyAllPlayers('gainMission', $message, [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'mission' => $mission,
            'fromPlayerId' => $fromPlayerId,
            'player_name2' => $fromPlayerId !== null ? $this->getPlayerName($fromPlayerId) : null, // for logs
            'mission_image' => '',
            'preserve' => ['mission'],
        ]);
    }
}
