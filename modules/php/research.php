<?php

trait ResearchTrait {

    function getResearchFromDb(/*array|null*/ $dbCard) {
        if ($dbCard == null) {
            return null;
        }
        return new Research($dbCard, $this->RESEARCH);
    }

    function getResearchsFromDb(array $dbCards) {
        return array_map(fn($dbCard) => $this->getResearchFromDb($dbCard), array_values($dbCards));
    }

    function getResearchById(int $id) {
        $sql = "SELECT * FROM `research` WHERE `card_id` = $id";
        $dbResults = $this->getCollectionFromDb($sql);
        $tiles = array_map(fn($dbCard) => $this->getResearchFromDb($dbCard), array_values($dbResults));
        return count($tiles) > 0 ? $tiles[0] : null;
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

    function deployResearch(int $playerId, /*CurrentAction*/ $currentAction, Worker $worker) {
        $this->moveWorkerToTable($playerId, $worker, $currentAction->spot);

        $playerResearches = $this->getResearchsByLocation('player', $playerId);
        $tile = $this->getResearchById($currentAction->research);

        $numberByExtremities = [LEFT => 0, CENTRAL => 0, RIGHT => 0];
        foreach ($playerResearches as $playerResearch) {
            $numberByExtremities[$playerResearch->extremity]++;
        }
        $line = $numberByExtremities[$tile->extremity];

        $alreadyBuildForSameLine = 0;
        foreach (array_keys($numberByExtremities) as $extremity) {
            if ($extremity != $tile->extremity && $numberByExtremities[$extremity] > $line) {
                $alreadyBuildForSameLine++;
            }
        }

        if ($alreadyBuildForSameLine > 0) {
            $message = clienttranslate('${player_name} gains ${inc} points for placing the ${rank} research tile of a line');
            $args = ['i18n' => ['rank']];
            if ($alreadyBuildForSameLine == 1) {
                $args['rank'] = clienttranslate('second');
                $this->incPlayerScore($playerId, 1, $message, $args);
            } else if ($alreadyBuildForSameLine == 2) {
                $args['rank'] = clienttranslate('third');
                $this->incPlayerScore($playerId, 2, $message, $args);
            }
        }

        if ($tile->science > 0) {
            $this->incPlayerScience($playerId, $tile->science, clienttranslate('${player_name} gains ${inc} science points from the played research'));
        }

        if ($tile->points > 0) {
            $this->incPlayerScience($playerId, $tile->points, clienttranslate('${player_name} gains ${inc} points from the played research'));
        }

        $this->DbQuery("UPDATE research SET `card_location` = 'player', `card_location_arg` = $playerId, `line` = $line WHERE `card_id` = $tile->id");
        $tile->location = 'player';
        $tile->locationArg = $playerId;
        $tile->line = $line;

        self::notifyAllPlayers('deployResearch', '', [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'research' => $tile,
        ]);

        if ($tile->effect == RESEARCH_POWER_TIME) {
            $this->gainTimeUnit($playerId, 2);
        } else if ($tile->effect == RESEARCH_POWER_REACTIVATE) {
            $this->reactivatePlayerWorkers($playerId);
        }
    }
}
