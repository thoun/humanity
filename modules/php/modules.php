<?php

trait ModuleTrait {

    function getModuleFromDb(/*array|null*/ $dbCard) {
        if ($dbCard == null) {
            return null;
        }
        return new Module($dbCard, $this->MODULES);
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
        foreach ([1, 2, 3] as $year) {
            $modules = [];
            foreach ($this->MODULES[$year] as $subType => $moduleType) {
                $modules[] = [ 'type' => $year, 'type_arg' => $subType, 'nbr' => 1 ];
            }
            $this->modules->createCards($modules, 'deck'.$year);
            $this->modules->shuffle('deck'.$year);
        }

        foreach ([1, 2, 3, 4, 5, 6, 7] as $spot) {
            $this->modules->pickCardForLocation('deck1', 'table', $spot);
        }

        foreach ($this->MODULES[8] as $subType => $moduleType) {
            $this->modules->createCards([[ 'type' => 8, 'type_arg' => $subType, 'nbr' => 2 ]], 'communication');
        }

        foreach ($players as $playerId => $player) {
            $modules = [];
            foreach ($this->MODULES[0] as $subType => $moduleType) {
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
        $module->location = 'player';
        $module->locationArg = $playerId;
        $module->x = $astronaut->x;
        $module->y = $astronaut->y;
        $module->r = $r;

        $moduleVp = 0;
        if ($module->color == GREEN) {
            $set = $this->getGreenhouseSet($playerId, $module, $module);
            $moduleVp = count($set);
        }
        $module->vp = $moduleVp;

        $this->DbQuery("UPDATE module SET card_location = 'player', card_location_arg = $playerId, `x` = $astronaut->x, `y` = $astronaut->y, `r` = $r, `vp` = $moduleVp WHERE `card_id` = $module->id");

        self::notifyAllPlayers('deployModule', '', [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'module' => $module,
        ]);

        $points = $module->points + $moduleVp;

        $playerModulesAndObstacles = $this->getModulesByLocation('player', $playerId);
        $playerModules = array_values(array_filter($playerModulesAndObstacles, fn($t) => $t->type != 9));
        
        $squareResult = $this->checkNewModuleSquares($module, $playerModules);
        
        if ($points > 0) {
            $this->incPlayerVP($playerId, $points, clienttranslate('${player_name} gains ${inc} point(s) with placed module'));
            $this->incStat($points, 'vpWithModules', $playerId);
        }

        if (count($squareResult['squares']) > 0) {
            $this->incPlayerVP($playerId, count($squareResult['squares']), clienttranslate('${player_name} gains ${inc} point(s) with completed square(s)'));
            $this->incStat($points, 'vpWithSquares', $playerId);

            $sql = "INSERT INTO square (`player_id`, `x`, `y`) VALUES ";
            $values = [];
            foreach($squareResult['squares'] as $square) {
                $values[] = "($playerId, ".$square['x'].", ".$square['y'].")";
            }

            $sql .= implode(',', $values);
            $this->DbQuery($sql);

            self::notifyAllPlayers('addSquares', '', [
                'playerId' => $playerId,
                'squares' => $squareResult['squares'],
            ]);
        }
        if ($module->researchPoints > 0) {
            $this->incPlayerResearchPoints($playerId, $module->researchPoints, clienttranslate('${player_name} gains ${inc} research points with placed module'));
        }

        $adjacentModules = $this->getAdjacentModules($playerModules, $module);
        if ($module->adjacentResearchPoints > 0) {
            $validAdjacentModules = $module->matchType == ANY_COLOR ? $adjacentModules : array_values(array_filter($adjacentModules, fn($t) => $t->color == $module->matchType));
            
            $researchPoints = $module->adjacentResearchPoints * count($validAdjacentModules);
            if ($researchPoints > 0) {
                $this->incPlayerResearchPoints($playerId, $researchPoints, clienttranslate('${player_name} gains ${inc} research points with placed module (${number} neighbor module(s) matching)'), ['number' => count($validAdjacentModules)]);
            }
        }

        // if new module match adjacent already placed purple module
        foreach ($adjacentModules as $adjacentModule) {
            if ($adjacentModule->adjacentResearchPoints > 0 && ($adjacentModule->matchType == ANY_COLOR || $adjacentModule->matchType == $module->color)) {
                $researchPoints = $module->adjacentResearchPoints;
                if ($researchPoints > 0) {
                    $this->incPlayerResearchPoints($playerId, $researchPoints, clienttranslate('${player_name} gains ${inc} research points with placed module (for matching an already placed purple module)'));
                }
            }
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
        $squares = [];

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
                    $squares[] = [
                        'x' => min($module->x, $module->x + $x),
                        'y' => min($module->y, $module->y + $y),
                    ];

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
            'squares' => $squares,
        ];
    }

    function getRecursiveAdjacentGreenhouses(array $modules, /*Module|Astronaut*/ $from, array $alreadyCounted) {
        $adjacentModules = $this->getAdjacentModules($modules, $from, false);
        $adjacentsToCall = [];
        foreach ($adjacentModules as $adjacentModule) {
            if (!$this->array_some($alreadyCounted, fn($countedModule) => $countedModule->id == $adjacentModule->id)) {
                $adjacentsToCall[] = $adjacentModule;
            }
        }
        
        if (count($adjacentsToCall) == 0) {
            return $alreadyCounted;
        } else {
            $adjacentsResults = array_map(fn($adjacentToCall) => $this->getRecursiveAdjacentGreenhouses($modules, $adjacentToCall, array_merge([$adjacentToCall], $alreadyCounted)), $adjacentsToCall);
            return array_merge($alreadyCounted, ...$adjacentsResults);
        }
    }

    function getGreenhouseSet(int $playerId, Module $module, /*Module | Astronaut*/ $from) {
        $playerModulesAndObstacles = $this->getModulesByLocation('player', $playerId);
        $playerModules = array_values(array_filter($playerModulesAndObstacles, fn($t) => $t->type != 9));
        $greenModules = array_values(array_filter($playerModules, fn($t) => $t->color == GREEN));

        $greenhousesSet = $this->getRecursiveAdjacentGreenhouses($greenModules, $from, [$module]);
        $greenhousesSet = array_intersect_key($greenhousesSet, array_unique(array_column($greenhousesSet, 'id')));
        return $greenhousesSet;
    }

    function canPlaceGreenhouse(int $playerId, Module $module, Astronaut $astronaut) {
        $newGreenhousesSet = $this->getGreenhouseSet($playerId, $module, $astronaut);
        $newGreenhousesSetTypes = array_map(fn($m) => $m->matchType, $newGreenhousesSet);
        return count(array_unique($newGreenhousesSetTypes)) == count($newGreenhousesSetTypes) && count($newGreenhousesSetTypes) <= 3;
    }

    function getPlayerSquares(int $playerId) {
        $sql = "SELECT * FROM square WHERE `player_id` = $playerId";
        $dbQuares = $this->getCollectionFromDB($sql);
        return array_map(fn($dbQuare) => ['x' => intval($dbQuare['x']), 'y' => intval($dbQuare['y'])], array_values($dbQuares));
    }
}
