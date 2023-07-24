<?php

trait AstronautTrait {

    function setupAstronauts(array $playersIds) {
        $sql = "INSERT INTO astronaut (`player_id`, `location`, `x`, `y`, `spot`) VALUES ";
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

    function getAstronautById(int $id) {
        $sql = "SELECT * FROM astronaut WHERE `id` = $id";
        $dbAstronauts = $this->getCollectionFromDB($sql);
        return array_map(fn($dbAstronaut) => new Astronaut($dbAstronaut), array_values($dbAstronauts))[0];
    }

    function getPlayerAstronauts(int $playerId, ?string $location = null, bool $filterRemainingWorkforce = false) {
        $sql = "SELECT * FROM astronaut WHERE `player_id` = $playerId";
        if ($location !== null) {
            $sql .= " AND `location` = '$location'";
        }
        if ($filterRemainingWorkforce) {
            $sql .= " AND `remaining_workforce` > 0";
        }
        $dbAstronauts = $this->getCollectionFromDB($sql);
        return array_map(fn($dbAstronaut) => new Astronaut($dbAstronaut), array_values($dbAstronauts));
    }

    function getTableAstronauts() {
        $sql = "SELECT * FROM astronaut WHERE `location` = 'table'";
        $dbAstronauts = $this->getCollectionFromDB($sql);
        return array_map(fn($dbAstronaut) => new Astronaut($dbAstronaut), array_values($dbAstronauts));
    }

    function countRemainingAstronauts(?int $playerId = null) {
        $sql = "SELECT count(*) FROM astronaut WHERE `location` = 'player' && `remaining_workforce` > 0";
        if ($playerId !== null) {
            $sql .= " AND `player_id` = '$playerId'";
        }
        return intval($this->getUniqueValueFromDB($sql));
    }

    function getSelectedAstronaut() {
        $currentAction = $this->getGlobalVariable(CURRENT_ACTION);
        return $currentAction != null ? $this->getAstronautById($currentAction->selectedAstronaut) : null;
    }

    function gainTimeUnit(int $playerId, int $amount) {
        $astronauts = $this->getPlayerAstronauts($playerId, 'table');
        $arm = $this->getArm();
        $movedAstronauts = [];

        foreach ($astronauts as $astronaut) {
            $distanceWithArm = $astronaut->spot - $arm;
            if ($distanceWithArm < 0) {
                $distanceWithArm += 8;
            }
            if ($distanceWithArm != 0) {
                $moved = min($amount, $distanceWithArm - 1);
                $astronaut->spot -= $moved;
                $this->DbQuery("UPDATE astronaut SET `spot` = $astronaut->spot WHERE `id` = $astronaut->id");

                $movedAstronauts[] = $astronaut;
            }
        }

        self::notifyAllPlayers('gainTimeUnit', clienttranslate('${player_name} gains ${amount} Time Unit(s) and shift its table astronauts'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'astronauts' => $movedAstronauts,
            'amount' => $amount, // for logs
        ]);
    }

    function reactivatePlayerAstronauts(?int $playerId) {
        $sql = "UPDATE astronaut SET `remaining_workforce` = `workforce`";
        if ($playerId !== null) {
            $sql .= " WHERE `player_id` = $playerId";

        }
        $this->DbQuery($sql);

        $message = $playerId !== null ?
            clienttranslate('${player_name} reactivates table astronauts') :
            clienttranslate('All players reactivates table astronauts');

        self::notifyAllPlayers('reactivateAstronauts', $message, [
            'playerId' => $playerId,
            'player_name' => $playerId !== null ? $this->getPlayerName($playerId) : null,
        ]);
    }
    
    function moveAstronautToTable(int $playerId,  Astronaut $astronaut, int $spot) {
        $this->DbQuery("UPDATE astronaut SET `location` = 'table', `x` = null, `y` = null, `spot` = $spot WHERE `id` = $astronaut->id");
        $astronaut->location = 'table';
        $astronaut->spot = $spot;

        self::notifyAllPlayers('moveAstronautToTable', '', [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'astronaut' => $astronaut,
        ]);
    }

    function getAstronautPossibleCoordinates(int $playerId, array $alreadyMovedAstronauts) {
        $astronauts = $this->getPlayerAstronauts($playerId);
        $modulesAndObstacles = ($this->getModulesByLocation('player', $playerId));
        $modules = array_values(array_filter($modulesAndObstacles, fn($module) => $module->type !== 9));
        $possibleCoordinates = [];

        foreach ($modules as $module) {    
            for ($dx = -1; $dx <= 1; $dx++) {
                for ($dy = -1; $dy <= 1; $dy++) {
                    if ($dx == 0 && $dy == 0) { continue; }
                    if ($dx != 0 && $dy != 0) { continue; }

                    $x = $module->x + $dx;
                    $y = $module->y + $dy;

                    if (
                        !$this->array_some($modulesAndObstacles, fn($t) => $t->x == $x && $t->y == $y) // no module or obstacle in this place
                        && !$this->array_some($astronauts, fn($w) => $w->x == $x && $w->y == $y) // no astronaut in this place
                        && !$this->array_some($alreadyMovedAstronauts, fn($w) => $w->x == $x && $w->y == $y) // not already moved astronaut in this place
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
