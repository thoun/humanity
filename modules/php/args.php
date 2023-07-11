<?php

trait ArgsTrait {
    
//////////////////////////////////////////////////////////////////////////////
//////////// Game state arguments
////////////

    /*
        Here, you can create methods defined as "game state arguments" (see "args" property in states.inc.php).
        These methods function is to return some additional information that is specific to the current
        game state.
    */

    function argChooseWorker() {
        $playerId = intval($this->getActivePlayerId());

        $workers = $this->getPlayerWorkers($playerId, 'player', true);

        return [
            'workers' => $workers,
        ];
    }
   
    function argPlayAction() {
        /*$playerId = intval($this->getActivePlayerId());
        $player = $this->getPlayer($playerId);

        $bracelets = $player->bracelet;
        $recruits = $player->recruit;

        $playedCardsColors = $this->getPlayedCardsColor($playerId);

        $recruitDone = boolval($this->getGameStateValue(RECRUIT_DONE));
        $exploreDone = boolval($this->getGameStateValue(EXPLORE_DONE));
        $tradeDone = boolval($this->getGameStateValue(TRADE_DONE));

        $possibleDestinations = [];
        if (!$exploreDone) {
            $possibleDestinations = array_merge(
                $this->getResearchsByLocation('slotA'),
                $this->getResearchsByLocation('slotB'),
                $this->getResearchsByLocation('reserved', $playerId),
            );

            $possibleDestinations = array_values(array_filter($possibleDestinations, fn($research) => $this->canTakeDestination($research, $playedCardsColors, $recruits, false)));
        }*/

        return [
            /*'possibleDestinations' => $possibleDestinations,
            'canRecruit' => !$recruitDone,
            'canExplore' => !$exploreDone,
            'canTrade' => !$tradeDone && $bracelets > 0,*/
        ];
    }
} 
