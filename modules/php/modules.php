<?php

trait ModuleTrait {

    function getModuleFromDb(/*array|null*/ $dbCard) {
        if ($dbCard == null) {
            return null;
        }
        return new Module($dbCard, $this->TILES);
    }

    function getModulesFromDb(array $dbCards) {
        return array_map(fn($dbCard) => $this->getModuleFromDb($dbCard), array_values($dbCards));
    }

    function getModuleById(int $id) {
        $sql = "SELECT * FROM `module` WHERE `card_id` = $id";
        $dbResults = $this->getCollectionFromDb($sql);
        $modules = array_map(fn($dbCard) => $this->getModuleFromDb($dbCard), array_values($dbResults));
        return count($modules) > 0 ? $modules[0] : null;
    }

    function getModulesByLocation(string $location, /*int|null*/ $location_arg = null, /*int|null*/ $type = null, /*int|null*/ $number = null) {
        $sql = "SELECT * FROM `module` WHERE `card_location` = '$location'";
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
        return array_map(fn($dbCard) => $this->getModuleFromDb($dbCard), array_values($dbResults));
    }

    function setupModules(array $players) {
        foreach ([1, 2, 3] as $year => $modulesType) {
            $modules = [];
            foreach ($this->TILES[$year] as $subType => $moduleType) {
                $modules[] = [ 'type' => $year, 'type_arg' => $subType, 'nbr' => 1 ];
            }
            $this->modules->createCards($modules, 'deck'.$year);
            $this->modules->shuffle('deck'.$year);
        }

        foreach ([1, 2, 3, 4, 5, 6, 7] as $spot) {
            $this->modules->pickCardForLocation('deck1', 'table', $spot);
        }

        foreach ($this->TILES[8] as $subType => $moduleType) {
            $this->modules->createCards([[ 'type' => 8, 'type_arg' => $subType, 'nbr' => 2 ]], 'communication');
        }

        foreach ($players as $playerId => $player) {
            $modules = [];
            foreach ($this->TILES[0] as $subType => $moduleType) {
                $this->modules->createCards([[ 'type' => 0, 'type_arg' => $subType, 'nbr' => 1 ]], 'temp');
                $cardId = $this->getModulesByLocation('temp')[0]->id;
                $position = $this->STARTING_TILE_POSITIONS[$subType];
                $x = $position[0];
                $y = $position[1];
                $this->DbQuery("UPDATE `module` SET `card_location` = 'player', `card_location_arg` = $playerId, `x` = $x, `y` = $y, `r` = 1 WHERE card_id = $cardId");
            }
            
            $this->modules->createCards([[ 'type' => 9, 'type_arg' => 0, 'nbr' => 3 ]], 'temp');
            $obstacles = $this->getModulesByLocation('temp');
            foreach ($obstacles as $index => $obstacle) {
                $cardId = $obstacle->id;
                $position = $this->OBSTACLE_POSITIONS[$index];
                $x = $position[0];
                $y = $position[1];
                $this->DbQuery("UPDATE `module` SET `card_location` = 'player', `card_location_arg` = $playerId, `x` = $x, `y` = $y WHERE card_id = $cardId");
            }
        }
    }

    function getAdjacentModules(array $modules, /*Module | Astronau*/ $fromModuleOrAstronaut, bool $diagonal = false) {
        $adjacentModules = [];
        for ($x = -1; $x <= 1; $x++) {
            for ($y = -1; $y <= 1; $y++) {
                if ($x === 0 && $y === 0) { continue; }
                if (!$diagonal && $x !== 0 && $y !== 0) { continue; }

                $adjacentModule = $this->array_find($modules, fn($module) => 
                    $module->x === $fromModuleOrAstronaut->x + $x && $module->y === $fromModuleOrAstronaut->y + $y
                );

                if ($adjacentModule != null) {
                    $adjacentModules[] = $adjacentModule;
                }
            }
        }

        return $adjacentModules;
    }

    function deployModule(int $playerId, /*CurrentAction*/ $currentAction, Astronaut $astronaut) {
        $this->moveAstronautToTable($playerId, $astronaut, $currentAction->astronautSpot);
        $module = $this->getModuleById($currentAction->addModuleId);

        if ($currentAction->addModuleId != $currentAction->removeModuleId) {
            $this->modules->moveCard($currentAction->removeModuleId, 'void');

            self::notifyAllPlayers('removeTableModule', '', [
                'module' => $this->getModuleById($currentAction->removeModuleId),
            ]);
        }

        $r = $module->production != null ? 1 : 0;
        $this->DbQuery("UPDATE module SET card_location = 'player', card_location_arg = $playerId, `x` = $astronaut->x, `y` = $astronaut->y, `r` = $r WHERE `card_id` = $module->id");
        $module->location = 'player';
        $module->locationArg = $playerId;
        $module->x = $astronaut->x;
        $module->y = $astronaut->y;
        $module->r = $r;

        self::notifyAllPlayers('deployModule', '', [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'module' => $module,
        ]);

        $points = $module->points;

        $playerModulesAndObstacles = $this->getModulesByLocation('player', $playerId);
        $playerModules = array_values(array_filter($playerModulesAndObstacles, fn($t) => $t->type != 9));
        
        $squareResult = $this->checkNewModuleSquares($module, $playerModules);
        $points += $squareResult['points'];

        if ($module->color == GREEN) {
            $modulesOfColor = array_values(array_filter($playerModules, fn($t) => $t->color == GREEN));

            $greenhouseGroupSize = $this->getAdjacentModulesCount($modulesOfColor, $module, false, [$module]);
            $points += $greenhouseGroupSize;
        }
        
        if ($points > 0) {
            $this->incPlayerVP($playerId, $points, clienttranslate('${player_name} gains ${inc} points with placed module'));
            $this->incStat($points, 'vpWithModules', $playerId);
        }
        $researchPoints = $module->researchPoints;

        $adjacentModules = $this->getAdjacentModules($playerModules, $module);
        if ($module->adjacentResearchPoints !== null) {
            $validAdjacentModules = $module->matchType == ANY_COLOR ? $adjacentModules : array_values(array_filter($adjacentModules, fn($t) => $t->color == $module->matchType));
            $researchPoints += $module->adjacentResearchPoints * count($validAdjacentModules);
        }

        // if new module match adjacent already placed purple module
        foreach ($adjacentModules as $adjacentModule) {
            if ($adjacentModule->adjacentResearchPoints !== null && ($adjacentModule->matchType == ANY_COLOR || $adjacentModule->matchType == $module->color)) {
                $researchPoints += $module->adjacentResearchPoints;
            }
        }

        if ($researchPoints > 0) {
            $this->incPlayerResearchPoints($playerId, $researchPoints, clienttranslate('${player_name} gains ${inc} research points with placed module'));
        }
            
        $this->incStat(1, 'deployedModules', $playerId);
        $this->incStat(1, 'deployedModules'.$module->color, $playerId);
        $this->incStat(1, 'deployedModulesYear'.($module->type == 8 ? $module->researchPoints - 2 : $module->type), $playerId);

        return $squareResult['upgrade'];
    }
    
    function getPlayerIcons(int $playerId) {
        $allModules = $this->getModulesByLocation('player', $playerId);
        $modules = array_values(array_filter($allModules, fn($module) => $module->production != null));

        $icons = [-1 => 0, ELECTRICITY => 0, 1 => 0, 2 => 0, 3 => 0, 11 => 0, 12 => 0, 13 => 0];

        foreach ($modules as $module) {
            $production = $module->production;

            foreach ($production as $type) {
                $icons[$type] += $module->r;
            }

            if (count($production) > 1 && $module->r > 0) {
                $icons[-1]++;
            }
        }

        return $icons;
    }
    
    function checkNewModuleSquares(Module $module, array $playerModules) {
        $points = 0;
        $upgrade = 0;

        for ($x = -1; $x <= 1; $x += 2) {
            for ($y = -1; $y <= 1; $y += 2) {

                $squareModules = [
                    $module,
                    $this->array_find($playerModules, fn($t) => $t->x == $module->x + $x && $t->y == $module->y + $y),
                    $this->array_find($playerModules, fn($t) => $t->x == $module->x && $t->y == $module->y + $y),
                    $this->array_find($playerModules, fn($t) => $t->x == $module->x + $x && $t->y == $module->y),
                ];

                $squareModules = array_values(array_filter($squareModules, fn($module) => $module != null));
                if (count($squareModules) == 4) {
                    $points++;

                    $colors = count(array_unique(array_map(fn($module) => $module->color, $squareModules)));

                    if ($colors <= 2) {
                        $upgrade++;
                    }
                }
            }
        }

        return [
            'points' => $points,
            'upgrade' => $upgrade,
        ];
    }

    function canPlaceGreenhouse(int $playerId, Module $module, Astronaut $astronaut) {
        $playerModulesAndObstacles = $this->getModulesByLocation('player', $playerId);
        $playerModules = array_values(array_filter($playerModulesAndObstacles, fn($t) => $t->type != 9));
        $greenModules = array_values(array_filter($playerModules, fn($t) => $t->color == GREEN));

        $adjacentGreenhousesTypes = [];
        $adjacentModules = $this->getAdjacentModules($greenModules, $astronaut, false);
        foreach ($adjacentModules as $adjacentModule) {
            $adjacentGreenhousesTypes[] = $adjacentModule->matchType;
            
            $adjacentModulesLevel2 = $this->getAdjacentModules($greenModules, $adjacentModule, false);
            foreach ($adjacentModulesLevel2 as $adjacentModuleLevel2) {
                $adjacentGreenhousesTypes[] = $adjacentModuleLevel2->matchType;
            }
        }

        return !in_array($module->matchType, $adjacentGreenhousesTypes) && count(array_unique($adjacentGreenhousesTypes)) <= 3;
    }
}
