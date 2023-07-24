<?php

trait ExperimentTrait {

    function getExperimentFromDb(/*array|null*/ $dbCard) {
        if ($dbCard == null) {
            return null;
        }
        return new Experiment($dbCard, $this->EXPERIMENT);
    }

    function getExperimentsFromDb(array $dbCards) {
        return array_map(fn($dbCard) => $this->getExperimentFromDb($dbCard), array_values($dbCards));
    }

    function getExperimentById(int $id) {
        $sql = "SELECT * FROM `experiment` WHERE `card_id` = $id";
        $dbResults = $this->getCollectionFromDb($sql);
        $modules = array_map(fn($dbCard) => $this->getExperimentFromDb($dbCard), array_values($dbResults));
        return count($modules) > 0 ? $modules[0] : null;
    }

    function getExperimentsByLocation(string $location, /*int|null*/ $location_arg = null, /*int|null*/ $type = null, /*int|null*/ $number = null) {
        $sql = "SELECT * FROM `experiment` WHERE `card_location` = '$location'";
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
        return array_map(fn($dbCard) => $this->getExperimentFromDb($dbCard), array_values($dbResults));
    }

    function setupExperiments() {
        $modules[] = [1 => [], 2 => [], 3 => []];
        foreach ([1, 2, 3] as $year) {
            foreach ($this->EXPERIMENT[$year] as $number => $experimentType) {
                $modules[$year][] = [ 'type' => $year, 'type_arg' => $number, 'nbr' => 1 ];
            }

            $this->experiments->createCards($modules[$year], 'deck'.$year);
            $this->experiments->shuffle('deck'.$year);
        }

        foreach ([1, 2, 3, 4, 5, 6, 7] as $spot) {
            $this->experiments->pickCardForLocation('deck1', 'table', $spot);
        }
    }

    function deployExperiment(int $playerId, /*CurrentAction*/ $currentAction, Astronaut $astronaut) {
        $this->moveAstronautToTable($playerId, $astronaut, $currentAction->astronautSpot);

        $playerExperiments = $this->getExperimentsByLocation('player', $playerId);
        $module = $this->getExperimentById($currentAction->experiment);

        $numberBySides = [LEFT => 0, CENTRAL => 0, RIGHT => 0];
        foreach ($playerExperiments as $playerExperiment) {
            $numberBySides[$playerExperiment->side]++;
        }
        $line = $numberBySides[$module->side];

        $alreadyBuildForSameLine = 0;
        foreach (array_keys($numberBySides) as $side) {
            if ($side != $module->side && $numberBySides[$side] > $line) {
                $alreadyBuildForSameLine++;
            }
        }

        if ($alreadyBuildForSameLine > 0) {
            $message = clienttranslate('${player_name} gains ${inc} points for placing the ${rank} experiment of a line');
            $args = ['i18n' => ['rank']];
            if ($alreadyBuildForSameLine == 1) {
                $args['rank'] = clienttranslate('second');
                $this->incPlayerVP($playerId, 1, $message, $args);
            } else if ($alreadyBuildForSameLine == 2) {
                $args['rank'] = clienttranslate('third');
                $this->incPlayerVP($playerId, 2, $message, $args);
            }
        }

        if ($module->researchPoints > 0) {
            $this->incPlayerResearchPoints($playerId, $module->researchPoints, clienttranslate('${player_name} gains ${inc} research points from the played experiment'));
        }

        if ($module->points > 0) {
            $this->incPlayerVP($playerId, $module->points, clienttranslate('${player_name} gains ${inc} points from the played experiment'));
        }

        $this->DbQuery("UPDATE experiment SET `card_location` = 'player', `card_location_arg` = $playerId, `line` = $line WHERE `card_id` = $module->id");
        $module->location = 'player';
        $module->locationArg = $playerId;
        $module->line = $line;

        self::notifyAllPlayers('deployExperiment', '', [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'experiment' => $module,
        ]);

        if ($module->effect == EXPERIMENT_POWER_TIME) {
            $this->gainTimeUnit($playerId, 2);
        } else if ($module->effect == EXPERIMENT_POWER_REACTIVATE) {
            $this->reactivatePlayerAstronauts($playerId);
        }
    }
}
