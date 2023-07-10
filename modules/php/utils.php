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

    function getRoundCardCount() {
        return count($this->getPlayersIds()) + 2;
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

    function incPlayerRecruit(int $playerId, int $amount, $message = '', $args = []) {
        if ($amount != 0) {
            $this->DbQuery("UPDATE player SET `player_recruit` = `player_recruit` + $amount WHERE player_id = $playerId");
        }

        $this->notifyAllPlayers('recruit', $message, [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'newScore' => $this->getPlayer($playerId)->recruit,
            'incScore' => $amount,
        ] + $args);
    }

    function incPlayerBracelet(int $playerId, int $amount, $message = '', $args = []) {
        if ($amount != 0) {
            $this->DbQuery("UPDATE player SET `player_bracelet` = `player_bracelet` + $amount WHERE player_id = $playerId");
        }

        $this->notifyAllPlayers('bracelet', $message, [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'newScore' => $this->getPlayer($playerId)->bracelet,
            'incScore' => $amount,
        ] + $args);
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

    function getDestinationFromDb(/*array|null*/ $dbCard) {
        if ($dbCard == null) {
            return null;
        }
        return new Research($dbCard, $this->RESEARCH);
    }

    function getDestinationsFromDb(array $dbCards) {
        return array_map(fn($dbCard) => $this->getDestinationFromDb($dbCard), array_values($dbCards));
    }

    function getDestinationsByLocation(string $location, /*int|null*/ $location_arg = null, /*int|null*/ $type = null, /*int|null*/ $number = null) {
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
        return array_map(fn($dbCard) => $this->getDestinationFromDb($dbCard), array_values($dbResults));
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

        for ($place = 1; $place <= 7; $place++) {
            $this->research->pickCardForLocation('deck1', 'table', $place);
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

        self::notifyAllPlayers('log', clienttranslate('objectives = ${objectives}'), [
            'objectives' => json_encode($dbResults),
        ]);

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
    
    function groupGains(array $gains) {
        $groupGains = [];

        foreach ($gains as $gain) {
            if (array_key_exists($gain, $groupGains)) {
                $groupGains[$gain] += 1;
            } else {
                $groupGains[$gain] = 1;
            }
        }

        return $groupGains;
    }
    
    function gainResources(int $playerId, array $groupGains, string $phase) {
        $player = $this->getPlayer($playerId);

        $effectiveGains = [];

        foreach ($groupGains as $type => $amount) {
            switch ($type) {
                case VP: 
                    $effectiveGains[VP] = $amount;
                    $this->DbQuery("UPDATE player SET `player_score` = `player_score` + ".$effectiveGains[VP]." WHERE player_id = $playerId");
                    break;
                case BRACELET: 
                    $effectiveGains[BRACELET] = min($amount, 3 - $player->bracelet);
                    $this->DbQuery("UPDATE player SET `player_bracelet` = `player_bracelet` + ".$effectiveGains[BRACELET]." WHERE player_id = $playerId");

                    if ($effectiveGains[BRACELET] < $amount) {
                        $this->incStat($amount - $effectiveGains[BRACELET], 'braceletsMissed');
                        $this->incStat($amount - $effectiveGains[BRACELET], 'braceletsMissed', $playerId);
                    }
                    break;
                case RECRUIT:
                    $effectiveGains[RECRUIT] = min($amount, 3 - $player->recruit);
                    $this->DbQuery("UPDATE player SET `player_recruit` = `player_recruit` + ".$effectiveGains[RECRUIT]." WHERE player_id = $playerId");

                    if ($effectiveGains[RECRUIT] < $amount) {
                        $this->incStat($amount - $effectiveGains[RECRUIT], 'recruitsMissed');
                        $this->incStat($amount - $effectiveGains[RECRUIT], 'recruitsMissed', $playerId);
                    }
                    break;
                case RESEARCH:
                    $effectiveGains[RESEARCH] = min($amount, 14 - $player->research);
                    $this->DbQuery("UPDATE player SET `player_research` = `player_research` + ".$effectiveGains[RESEARCH]." WHERE player_id = $playerId");
                    break;
                case CARD: 
                    $available = $this->getAvailableDeckCards();
                    $effectiveGains[CARD] = min($amount, $available);
                    for ($i = 0; $i < $effectiveGains[CARD]; $i++) {
                        $this->powerTakeCard($playerId);
                    }
                    if ($effectiveGains[CARD] < $amount) {
                        $this->setGlobalVariable(REMAINING_CARDS_TO_TAKE, [
                            'playerId' => $playerId,
                            'phase' => $phase,
                            'remaining' => $amount - $effectiveGains[CARD],
                        ]);
                    }
                    break;
            }
        }

        return $effectiveGains;
    }

    function canTakeDestination(Research $research, array $playedCardsColors, int $recruits, bool $strict) {
        $missingCards = 0;

        foreach ($research->cost as $color => $required) {
            $available = 0;
            if ($color == EQUAL) {
                $available = max($playedCardsColors);
            } else if ($color == DIFFERENT) {
                $available = count(array_filter($playedCardsColors, fn($count) => $count > 0));
            } else {
                $available = $playedCardsColors[$color]; 
            }

            if ($available < $required) {
                $missingCards += ($required - $available);
            }
        }

        return $strict ? $recruits == $missingCards : $recruits >= $missingCards;
    }

    function getGainName(int $gain) {
        switch ($gain) {
            case VP: return clienttranslate("Victory Point");
            case BRACELET: return clienttranslate("Bracelet");
            case RECRUIT: return clienttranslate("Recruit");
            case RESEARCH: return clienttranslate("Research");
            case CARD: return clienttranslate("Card");
        }
    }

    function getColorName(int $color) {
        switch ($color) {
            case BLUE: return clienttranslate("Blue");
            case YELLOW: return clienttranslate("Yellow");
            case GREEN: return clienttranslate("Green");
            case RED: return clienttranslate("Red");
            case PURPLE: return clienttranslate("Purple");
        }
    }

    function getObjectiveName(int $objective) {
        return '';
    }

    function powerTakeCard(int $playerId) {
        $tile = $this->getTileFromDb($this->tiles->pickCardForLocation('deck', 'played'));
        $this->tiles->moveCard($tile->id, 'played'.$playerId.'-'.$tile->color, intval($this->tiles->countCardInLocation('played'.$playerId.'-'.$tile->color)));

        self::notifyAllPlayers('takeDeckCard', clienttranslate('${player_name} takes a ${card_color} ${card_type} card from the deck'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'card' => $tile,
            'cardDeckTop' => Tile::onlyId($this->getTileFromDb($this->tiles->getCardOnTop('deck'))),
            'cardDeckCount' => intval($this->tiles->countCardInLocation('deck')),
            'card_type' => $this->getGainName($tile->gain), // for logs
            'card_color' => $this->getColorName($tile->color), // for logs
        ]);

    }

    function getPlayedCardsByColor(int $playerId) {
        $playedCardsByColor = [];
        foreach ([1,2,3,4,5] as $color) {
            $playedCardsByColor[$color] = $this->getTilesByLocation('played'.$playerId.'-'.$color);
        }
        return $playedCardsByColor;
    }

    function getPlayedCardsColor(int $playerId, /*array | null*/ $playedCardsByColor = null) {
        if ($playedCardsByColor === null) {
            $playedCardsByColor = $this->getPlayedCardsByColor($playerId);
        }
        foreach ([1,2,3,4,5] as $color) {
            $playedCardsByColor[$color] = $this->getTilesByLocation('played'.$playerId.'-'.$color);
        }
        return array_map(fn($tiles) => count($tiles), $playedCardsByColor);
    }

    function checkObjectives(int $playerId) {
        $objectives = $this->getGlobalVariable(OBJECTIVES, true) ?? [];

        foreach ($objectives as $objective) {
            $this->checkObjective($playerId, $objective);
        }
    }

    function checkEndTurnObjectives(int $playerId) {
        $objectives = $this->getGlobalVariable(OBJECTIVES, true) ?? [];

        $endTurn = true;

        foreach ($objectives as $objective) {
            $result = $this->checkEndTurnObjective($playerId, $objective);
            if (!$result) {
                $endTurn = false;
            }
        }

        return $endTurn;
    }

    function getCompletedLines(int $playerId) {
        $playedCardsColors = $this->getPlayedCardsColor($playerId);
        return min($playedCardsColors);
    }

    function completedAPlayedLine(int $playerId) {
        $completedLines = intval($this->getGameStateValue(COMPLETED_LINES));
        return $this->getCompletedLines($playerId) > $completedLines; // completed a line during the turn
    }

    function checkObjective(int $playerId, int $objective) {
    }

    function checkEndTurnObjective(int $playerId, int $objective) {
        return false;
    }

    function getAvailableDeckCards() {
        return intval($this->tiles->countCardInLocation('deck')) + intval($this->tiles->countCardInLocation('discard'));
    }

    function getTradeGains(int $playerId, int $bracelets) {
        $research = $this->getDestinationsByLocation('played'.$playerId);

        $gains = [];

        $rows = 
            array_map(fn($research) => $research->gains, $research)
        ;
        foreach ($rows as $row) {
            for ($i = 0; $i < $bracelets; $i++) {
                if ($row[$i] !== null) {
                    $gains[] = $row[$i];
                }
            }
        }

        return $gains;
    }
}
