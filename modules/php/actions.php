<?php

if (!function_exists('str_starts_with')) {
    function str_starts_with($haystack, $needle) {
        return (string)$needle !== '' && strncmp($haystack, $needle, strlen($needle)) === 0;
    }
}

trait ActionTrait {

    //////////////////////////////////////////////////////////////////////////////
    //////////// Player actions
    //////////// 
    
    /*
        Each time a player is doing some game action, one of the methods below is called.
        (note: each method below must match an input method in nicodemus.action.php)
    */

    public function chooseWorker(int $id) {
        self::checkAction('chooseWorker');

        $args = $this->argChooseWorker();
        $worker = $this->array_find($args['workers'], fn($worker) => $worker->id == $id);

        if ($worker == null) {
            throw new BgaUserException("Invalid worker");
        }

        /*$playerId = intval($this->getActivePlayerId());

        self::notifyAllPlayers('playCard', clienttranslate('${player_name} plays a ${card_color} ${card_type} card from their hand and gains ${gains}'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'card' => $tile,
            'effectiveGains' => $effectiveGains,
            'gains' => $effectiveGains, // for logs
            'card_type' => $this->getGainName($tile->gain), // for logs
            'card_color' => $this->getColorName($tile->color), // for logs
        ]);*/

        $this->setGameStateValue(SELECTED_WORKER, $id);

        $this->gamestate->nextState('next');
    }

    public function chooseNewCard(int $id) {
        self::checkAction('chooseNewCard');

        $playerId = intval($this->getActivePlayerId());

        $args = $this->argChooseNewCard();
        $tile = $this->array_find($args['centerCards'], fn($tile) => $tile->id == $id);

        if ($tile == null || $tile->location != 'slot') {
            throw new BgaUserException("You can't play this card");
        }
        $slotColor = $tile->locationArg;

        if ($slotColor != $args['freeColor'] && !$args['allFree']) {
            if ($args['recruits'] < 1) {
                throw new BgaUserException("Not enough recruits");
            } else {
                $this->incPlayerRecruit($playerId, -1, clienttranslate('${player_name} pays a recruit to choose the new card'), []);
        
                $this->incStat(1, 'recruitsUsedToChooseCard');
                $this->incStat(1, 'recruitsUsedToChooseCard', $playerId);
            }
        }
        
        $this->tiles->moveCard($tile->id, 'hand', $playerId);

        self::notifyAllPlayers('takeCard', clienttranslate('${player_name} takes the ${card_color} ${card_type} card from the table (${color} column)'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'card' => $tile,
            'color' => $this->getColorName($slotColor), // for logs
            'card_type' => $this->getGainName($tile->gain), // for logs
            'card_color' => $this->getColorName($tile->color), // for logs
        ]);

        if ($this->getAvailableDeckCards() >= 1) {
            $this->endOfRecruit($playerId, $slotColor);
        } else {
            $this->setGlobalVariable(REMAINING_CARDS_TO_TAKE, [
                'playerId' => $playerId,
                'slotColor' => $slotColor,
                'phase' => 'recruit',
                'remaining' => 1,
            ]);
            $this->gamestate->nextState('discardCardsForDeck');
        }
    }

    public function endOfRecruit(int $playerId, int $slotColor) {
        $newTableCard = $this->getTileFromDb($this->tiles->pickCardForLocation('deck', 'slot', $slotColor));
        $newTableCard->location = 'slot';
        $newTableCard->locationArg = $slotColor;

        self::notifyAllPlayers('newTableCard', '', [
            'card' => $newTableCard,
            'cardDeckTop' => Tile::onlyId($this->getTileFromDb($this->tiles->getCardOnTop('deck'))),
            'cardDeckCount' => intval($this->tiles->countCardInLocation('deck')) + 1, // to count the new card
        ]);

        $this->setGameStateValue(RECRUIT_DONE, 1);
        $this->setGameStateValue(EXPLORE_DONE, 1);

        $this->gamestate->nextState('next');
    }

    public function takeDestination(int $id) {
        self::checkAction('takeDestination');

        if (boolval($this->getGameStateValue(EXPLORE_DONE))) {
            throw new BgaUserException("Invalid action");
        }

        $args = $this->argPlayAction();
        $research = $this->array_find($args['possibleDestinations'], fn($c) => $c->id == $id);

        if ($research == null) {
            throw new BgaUserException("You can't take this research");
        }

        $this->setGameStateValue(SELECTED_DESTINATION, $id);

        $this->gamestate->nextState('payDestination');
    }

    public function payDestination(array $ids, int $recruits) {
        self::checkAction('payDestination');

        $playerId = intval($this->getActivePlayerId());
        
        if ($recruits > 0 && $this->getPlayer($playerId)->recruit < $recruits) {
            throw new BgaUserException("Not enough recruits");
        }

        $research = $this->getResearchFromDb($this->research->getCard($this->getGameStateValue(SELECTED_DESTINATION)));
        $fromReserve = $research->location == 'reserved';
        
        // will contain only selected cards of player
        $playedCardsByColor = [];
        $selectedPlayedCardsColors = [];
        $tilesToDiscard = [];
        if (count($ids) > 0) {
            $playedCardsByColor = $this->getPlayedCardsByColor($playerId);
            foreach ([1,2,3,4,5] as $color) {
                $playedCardsByColor[$color] = array_values(array_filter($playedCardsByColor[$color], fn($tile) => in_array($tile->id, $ids)));
                $selectedPlayedCardsColors[$color] = count($playedCardsByColor[$color]);
                $tilesToDiscard = array_merge($tilesToDiscard, $playedCardsByColor[$color]);
            }
        }

        $valid = $this->canTakeDestination($research, $selectedPlayedCardsColors, $recruits, true);
        if (!$valid) {
            throw new BgaUserException("Invalid payment for this research");
        }

        if ($recruits > 0) {
            $this->incPlayerRecruit($playerId, -$recruits, clienttranslate('${player_name} pays ${number} recruit(s) for the selected research'), [
                'number' => $recruits, // for logs
            ]);
            $this->incStat($recruits, 'recruitsUsedToPayDestination');
            $this->incStat($recruits, 'recruitsUsedToPayDestination', $playerId);
        }

        if (count($tilesToDiscard)) {
            $this->tiles->moveCards(array_map(fn($tile) => $tile->id, $tilesToDiscard), 'discard');

            self::notifyAllPlayers('discardCards', clienttranslate('${player_name} discards ${number} cards(s) for the selected research'), [
                'playerId' => $playerId,
                'player_name' => $this->getPlayerName($playerId),
                'cards' => $tilesToDiscard,
                'number' => $recruits, // for logs
                'cardDiscardCount' => intval($this->tiles->countCardInLocation('discard')),
            ]);
        }

        $researchIndex = intval($this->research->countCardInLocation('played'.$playerId));
        $this->research->moveCard($research->id, 'played'.$playerId, $researchIndex);

        $effectiveGains = $this->gainResources($playerId, $research->immediateGains, 'explore');
        $type = $research->type == 2 ? 'B' : 'A';

        self::notifyAllPlayers('takeDestination', clienttranslate('${player_name} takes a research from line ${letter} and gains ${gains}'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'research' => $research,
            'effectiveGains' => $effectiveGains,
            'gains' => $effectiveGains, // for logs
            'letter' => $type, // for logs
        ]);
                    
        $this->incStat(1, 'discoveredDestinations');
        $this->incStat(1, 'discoveredDestinations', $playerId);
        $this->incStat(1, 'discoveredDestinations'.$research->type);
        $this->incStat(1, 'discoveredDestinations'.$research->type, $playerId);

        $allGains = array_reduce($effectiveGains, fn($a, $b) => $a + $b, 0);
        $this->incStat($allGains, 'assetsCollectedByDestination');
        $this->incStat($allGains, 'assetsCollectedByDestination', $playerId);
        foreach ($effectiveGains as $type => $count) {
            if ($count > 0) {
                $this->incStat($count, 'assetsCollectedByDestination'.$type);
                $this->incStat($count, 'assetsCollectedByDestination'.$type, $playerId);
            }
        }

        $remainingCardsToTake = $this->getGlobalVariable(REMAINING_CARDS_TO_TAKE);
        if ($remainingCardsToTake != null) {
            $remainingCardsToTake->fromReserve = $fromReserve;
            $remainingCardsToTake->research = $research;
            $remainingCardsToTake->researchIndex = $researchIndex;
            $this->setGlobalVariable(REMAINING_CARDS_TO_TAKE, $remainingCardsToTake);

            $this->gamestate->nextState('discardCardsForDeck');
        } else {
            $this->endExplore($playerId, $fromReserve, $research, $researchIndex);
        }
    }

    public function endExplore(int $playerId, bool $fromReserve, object $research, int $researchIndex) {
        if (!$fromReserve) {
            $type = $research->type == 2 ? 'B' : 'A';
            $newDestination = $this->getResearchFromDb($this->research->pickCardForLocation('deck'.$type, 'slot'.$type, $research->locationArg));
            $newDestination->location = 'slot'.$type;
            $newDestination->locationArg = $research->locationArg;

            self::notifyAllPlayers('newTableDestination', '', [
                'research' => $newDestination,
                'letter' => $type,
                'researchDeckTop' => Research::onlyId($this->getResearchFromDb($this->research->getCardOnTop('deck'.$type))),
                'researchDeckCount' => intval($this->research->countCardInLocation('deck'.$type)),
            ]);
        }

        $this->setGameStateValue(RECRUIT_DONE, 1);
        $this->setGameStateValue(EXPLORE_DONE, 1);

        $this->gamestate->nextState('next');
    }

    public function reserveDestination(int $id) {
        self::checkAction('reserveDestination');

        $playerId = intval($this->getActivePlayerId());

        $research = $this->getResearchFromDb($this->research->getCard($id));

        if ($research == null || !in_array($research->location, ['slotA', 'slotB'])) {
            throw new BgaUserException("You can't reserve this research");
        }

        $this->research->moveCard($research->id, 'reserved', $playerId);
        $type = $research->type == 2 ? 'B' : 'A';

        self::notifyAllPlayers('reserveDestination', clienttranslate('${player_name} takes a research from line ${letter}'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'research' => $research,
            'letter' => $type, // for logs
        ]);

        $newDestination = $this->getResearchFromDb($this->research->pickCardForLocation('deck'.$type, 'slot'.$type, $research->locationArg));
        $newDestination->location = 'slot'.$type;
        $newDestination->locationArg = $research->locationArg;

        self::notifyAllPlayers('newTableDestination', '', [
            'research' => $newDestination,
            'letter' => $type,
            'researchDeckTop' => Research::onlyId($this->getResearchFromDb($this->research->getCardOnTop('deck'.$type))),
            'researchDeckCount' => intval($this->research->countCardInLocation('deck'.$type)),
        ]);

        $this->gamestate->nextState('next');
    }

    public function discardTableCard(int $id) {
        self::checkAction('discardTableCard');

        $playerId = intval($this->getActivePlayerId());

        $tile = $this->getTileFromDb($this->tiles->getCard($id));

        if ($tile == null || $tile->location != 'slot') {
            throw new BgaUserException("You can't discard this card");
        }
        $slotColor = $tile->locationArg;
        
        $this->tiles->moveCard($tile->id, 'discard');

        self::notifyAllPlayers('discardTableCard', clienttranslate('${player_name} discards ${card_color} ${card_type} card from the table (${color} column)'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'card' => $tile,
            'color' => $this->getColorName($slotColor), // for logs
            'card_type' => $this->getGainName($tile->gain), // for logs
            'card_color' => $this->getColorName($tile->color), // for logs
        ]);

        $newTableCard = $this->getTileFromDb($this->tiles->pickCardForLocation('deck', 'slot', $slotColor));
        $newTableCard->location = 'slot';
        $newTableCard->locationArg = $slotColor;

        self::notifyAllPlayers('newTableCard', '', [
            'card' => $newTableCard,
            'cardDeckTop' => Tile::onlyId($this->getTileFromDb($this->tiles->getCardOnTop('deck'))),
            'cardDeckCount' => intval($this->tiles->countCardInLocation('deck')) + 1, // to count the new card
        ]);

        $this->gamestate->nextState('next');
    }

    public function pass() {
        self::checkAction('pass');

        $playerId = intval($this->getActivePlayerId());

        $this->gamestate->nextState('next');
    }

    public function trade(int $number) {
        self::checkAction('trade');

        $playerId = intval($this->getActivePlayerId());

        if ($this->getPlayer($playerId)->bracelet < $number) {
            throw new BgaUserException("Not enough bracelets");
        }

        $this->incPlayerBracelet($playerId, -$number, clienttranslate('${player_name} chooses to pay ${number} bracelet(s) to trade'), [
            'number' => $number, // for logs
        ]);

        $gains = $this->getTradeGains($playerId, $number);
        $groupGains = $this->groupGains($gains);
        $effectiveGains = $this->gainResources($playerId, $groupGains, 'trade');

        self::notifyAllPlayers('trade', clienttranslate('${player_name} gains ${gains} with traded bracelet(s)'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'effectiveGains' => $effectiveGains,
            'gains' => $effectiveGains, // for logs
        ]);

        $this->incStat(1, 'tradeActions');
        $this->incStat(1, 'tradeActions', $playerId);
        $this->incStat(1, 'tradeActions'.$number);
        $this->incStat(1, 'tradeActions'.$number, $playerId);
        $this->incStat($number, 'braceletsUsed');
        $this->incStat($number, 'braceletsUsed', $playerId);

        $allGains = array_reduce($effectiveGains, fn($a, $b) => $a + $b, 0);
        $this->incStat($allGains, 'assetsCollectedByTrade');
        $this->incStat($allGains, 'assetsCollectedByTrade', $playerId);
        foreach ($effectiveGains as $type => $count) {
            if ($count > 0) {
                $this->incStat($count, 'assetsCollectedByTrade'.$type);
                $this->incStat($count, 'assetsCollectedByTrade'.$type, $playerId);
            }
        }

        if ($this->getGlobalVariable(REMAINING_CARDS_TO_TAKE) != null) {
            $this->gamestate->nextState('discardCardsForDeck');
        } else {
            $this->endTrade($playerId);
        }
    }

    public function endTrade(int $playerId) {
        $this->setGameStateValue(TRADE_DONE, 1);
        $this->gamestate->nextState('next');
    }

    public function cancel() {
        self::checkAction('cancel');

        $this->gamestate->nextState('cancel');
    }

    public function endTurn() {
        self::checkAction('endTurn');

        $playerId = intval($this->getCurrentPlayerId());

        $endTurn = $this->checkEndTurnObjectives($playerId);

        $this->gamestate->nextState(!$endTurn ? 'next' : 'endTurn');
    }

    public function discardCard(int $id) {
        self::checkAction('discardCard');

        $playerId = intval($this->getCurrentPlayerId());

        $tile = $this->getTileFromDb($this->tiles->getCard($id));

        if ($tile == null || !str_starts_with($tile->location, "played$playerId")) {
            throw new BgaUserException("You must choose a card in front of you");
        }

        $this->tiles->moveCard($tile->id, 'discard');

        self::notifyAllPlayers('discardCards', clienttranslate('${player_name} discards a cards to refill the deck'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'cards' => [$tile],
            'cardDiscardCount' => intval($this->tiles->countCardInLocation('discard')),
        ]);

        $this->incStat(1, 'discardedCards');
        $this->incStat(1, 'discardedCards', $playerId);

        $this->gamestate->setPlayerNonMultiactive($playerId, 'next');
    }
}
