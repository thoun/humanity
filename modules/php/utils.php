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
        return new Tile($dbCard);
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

    function setupCards(array $playersIds) {
        $playerCount = count($playersIds);
        foreach ($this->TILES as $tileType) {
            $tiles[] = [ 'type' => $tileType->color, 'type_arg' => $tileType->gain, 'nbr' => $tileType->number[$playerCount] ];
        }
        $this->tiles->createCards($tiles, 'deck');
        $this->tiles->shuffle('deck');

        foreach ([1,2,3,4,5] as $slot) {
            $this->tiles->pickCardForLocation('deck', 'slot', $slot);
        }

        foreach ($playersIds as $playerId) {
            $playedCards = $this->getTilesFromDb($this->tiles->pickCardsForLocation(2, 'deck', 'played'.$playerId));
            while ($playedCards[0]->color == $playedCards[1]->color) {
                $this->tiles->moveAllCardsInLocation('played'.$playerId, 'deck');
                $this->tiles->shuffle('deck');
                $playedCards = $this->getTilesFromDb($this->tiles->pickCardsForLocation(2, 'deck', 'played'.$playerId));
            }
            foreach ($playedCards as $playedCard) {
                $this->tiles->moveCard($playedCard->id, 'played'.$playerId.'-'.$playedCard->color);
            }

            $this->tiles->pickCardsForLocation(3, 'deck', 'hand', $playerId);
        }
    }

    function getDestinationFromDb(/*array|null*/ $dbCard) {
        if ($dbCard == null) {
            return null;
        }
        return new Destination($dbCard, $this->RESEARCH);
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

    function setupDestinations() {
        $tiles[] = ['A' => [], 'B' => []];
        foreach ($this->RESEARCH as $number => $researchType) {
            $tiles[$number > 20 ? 'B' : 'A'][] = [ 'type' => $number > 20 ? 2 : 1, 'type_arg' => $number, 'nbr' => 1 ];
        }
        foreach (['A', 'B'] as $type) {
            $this->research->createCards($tiles[$type], 'deck'.$type);
            $this->research->shuffle('deck'.$type);
        }

        foreach ([1,2,3] as $slot) {
            foreach (['A', 'B'] as $type) {
                $this->research->pickCardForLocation('deck'.$type, 'slot'.$type, $slot);
            }
        }
    }
    
    function redirectAfterAction(int $playerId, bool $checkArtifacts) {

        if (boolval($this->getGameStateValue(GO_RESERVE))) {
            $this->incGameStateValue(GO_RESERVE, -1);
            $reserved = $this->getDestinationsByLocation('reserved', $playerId);
            if (count($reserved) >= 2) {
                self::notifyAllPlayers('log', clienttranslate('${player_name} cannot reserve a research because he already has 2'), [
                    'playerId' => $playerId,
                    'player_name' => $this->getPlayerName($playerId),
                ]);
            } else {
                $this->gamestate->nextState('reserve');
                return;
            }
        }
        if (boolval($this->getGameStateValue(GO_DISCARD_TABLE_CARD))) {
            $this->incGameStateValue(GO_DISCARD_TABLE_CARD, -1);
            $this->gamestate->nextState('discardTableCard');
            return;
        }

        $args = $this->argPlayAction();

        $canPlay = $args['canRecruit'] || $args['canExplore'] || $args['canTrade'];

        if ($canPlay) {
            $this->gamestate->nextState('next');
        } else {
            $endTurn = $this->checkEndTurnArtifacts($playerId);

            $this->gamestate->nextState(!$endTurn ? 'next' : 'endTurn');
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

    function canTakeDestination(Destination $research, array $playedCardsColors, int $recruits, bool $strict) {
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

    function getArtifactName(int $artifact) {
        switch ($artifact) {
            case ARTIFACT_MEAD_CUP: return clienttranslate("Mead Cup");
            case ARTIFACT_SILVER_COIN: return clienttranslate("Silver coin");
            case ARTIFACT_CAULDRON: return clienttranslate("Cauldron");
            case ARTIFACT_GOLDEN_BRACELET: return clienttranslate("Golden bracelet");
            case ARTIFACT_HELMET: return clienttranslate("Helmet");
            case ARTIFACT_AMULET: return clienttranslate("Amulet");
            case ARTIFACT_WEATHERVANE: return clienttranslate("Weathervane");
        }
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

    function setupArtifacts(int $option, int $playerCount) {
        $availableArtifacts = [1, 2, 3, 4, 5, 6, 7];
        $artifacts = [];

        if ($option == 2 && $playerCount == 2) {
            $artifacts[] = array_shift($availableArtifacts);
        }

        $index = bga_rand(1, count($availableArtifacts)) - 1;
        $artifacts[] = $availableArtifacts[$index];
        array_splice($availableArtifacts, $index, 1);

        $this->setGlobalVariable(ARTIFACTS, $artifacts);
    }

    function checkArtifacts(int $playerId) {
        $artifacts = $this->getGlobalVariable(ARTIFACTS, true) ?? [];

        foreach ($artifacts as $artifact) {
            $this->checkArtifact($playerId, $artifact);
        }
    }

    function checkEndTurnArtifacts(int $playerId) {
        $artifacts = $this->getGlobalVariable(ARTIFACTS, true) ?? [];

        $endTurn = true;

        foreach ($artifacts as $artifact) {
            $result = $this->checkEndTurnArtifact($playerId, $artifact);
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

    function checkArtifact(int $playerId, int $artifact) {
        switch ($artifact) {
            case ARTIFACT_SILVER_COIN:
                $playedCardColor = intval($this->getGameStateValue(PLAYED_CARD_COLOR));
                if ($playedCardColor > 0) {
                    $playedCardsColors = $this->getPlayedCardsColor($playerId);
                    if ($playedCardsColors[$playedCardColor] > 3) {
                        $groupGains = [
                            VP => 1,
                        ];
                        $effectiveGains = $this->gainResources($playerId, $groupGains, 'artifact:silver-coins');
    
                        self::notifyAllPlayers('trade', clienttranslate('${player_name} gains ${gains} with artifact ${artifact_name} effect'), [
                            'playerId' => $playerId,
                            'player_name' => $this->getPlayerName($playerId),
                            'effectiveGains' => $effectiveGains,
                            'gains' => $effectiveGains, // for logs
                            'artifact_name' => $this->getArtifactName($artifact), // for logs
                            'i18n' => ['artifact_name'],
                        ]);

                        $this->incStat(1, 'activatedArtifacts');
                        $this->incStat(1, 'activatedArtifacts', $playerId);
                    }
                }
                break;
            case ARTIFACT_GOLDEN_BRACELET:
                $playedCardColor = intval($this->getGameStateValue(PLAYED_CARD_COLOR));
                if ($playedCardColor > 0) {
                    $playedCardsColors = $this->getPlayedCardsColor($playerId);
                    if ($playedCardsColors[$playedCardColor] == 3) {
                        $this->setGameStateValue(GO_RESERVE, 1);

                        $this->incStat(1, 'activatedArtifacts');
                        $this->incStat(1, 'activatedArtifacts', $playerId);
                    }
                }
                break;
        }
    }

    function checkEndTurnArtifact(int $playerId, int $artifact) {
        $endTurn = true;
        switch ($artifact) {
            case ARTIFACT_AMULET:
                if ($this->completedAPlayedLine($playerId)) {
                    $groupGains = [
                        BRACELET => 1,
                        RECRUIT => 1,
                        RESEARCH => 1,
                    ];
                    $effectiveGains = $this->gainResources($playerId, $groupGains, 'artifact:amulet');

                    self::notifyAllPlayers('trade', clienttranslate('${player_name} gains ${gains} with artifact ${artifact_name} effect'), [
                        'playerId' => $playerId,
                        'player_name' => $this->getPlayerName($playerId),
                        'effectiveGains' => $effectiveGains,
                        'gains' => $effectiveGains, // for logs
                        'artifact_name' => $this->getArtifactName($artifact), // for logs
                        'i18n' => ['artifact_name'],
                    ]);

                    $this->incStat(1, 'activatedArtifacts');
                    $this->incStat(1, 'activatedArtifacts', $playerId);
                }
                break;
            case ARTIFACT_WEATHERVANE:
                if ($this->completedAPlayedLine($playerId)) {
                    $this->setGameStateValue(EXPLORE_DONE, 0);
                    $this->setGameStateValue(COMPLETED_LINES, 999); // make sure the bonus turn doesn't retrigger the effect

                    self::notifyAllPlayers('log', clienttranslate('${player_name} can explore with artifact ${artifact_name} effect'), [
                        'playerId' => $playerId,
                        'player_name' => $this->getPlayerName($playerId),
                        'artifact_name' => $this->getArtifactName($artifact), // for logs
                        'i18n' => ['artifact_name'],
                    ]);

                    $this->incStat(1, 'activatedArtifacts');
                    $this->incStat(1, 'activatedArtifacts', $playerId);
                    
                    $endTurn = false;
                }
                break;
        }
        return $endTurn;
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
