<?php

trait StateTrait {

//////////////////////////////////////////////////////////////////////////////
//////////// Game state actions
////////////

    /*
        Here, you can create methods defined as "game state actions" (see "action" property in states.inc.php).
        The action method of state X is called everytime the current game state is set to X.
    */

    function stPay() {
        // TODO let player pay

        $this->gamestate->nextState('next');
    }

    function stCheckObjectives() {
        $playerId = intval($this->getActivePlayerId());

        $objectives = $this->getObjectivesByLocation();

        foreach($objectives as $objective) {
            if ($objective->location != 'player' || $objective->locationArg != $playerId) {
                if ($this->fulfillObjective($playerId, $objective)) {
                    $this->gainObjective($playerId, $objective);
                }
            }
        }
        
        $this->gamestate->nextState('next');
    }

    function stNextPlayer() {
        $playerId = intval($this->getActivePlayerId());

        $this->deleteGlobalVariables([CURRENT_ACTION]);

        if ($this->countRemainingWorkers() > 0) {

            $this->activeNextPlayer();
            $playerId = $this->getActivePlayerId();
            while ($this->countRemainingWorkers($playerId) == 0) {
                $this->activeNextPlayer();
                $playerId = $this->getActivePlayerId();
            }
    
            $this->giveExtraTime($playerId);
            
            $this->gamestate->nextState('nextPlayer');

        } else {
            $this->gamestate->nextState('endRound');
        }
    }

    function stEndRound() {
        // change first player
        $newFirstPlayer = intval($this->getPlayerAfter($this->getGlobalVariable(FIRST_PLAYER)));
        $this->setGlobalVariable(FIRST_PLAYER, $newFirstPlayer);
        $this->gamestate->changeActivePlayer($newFirstPlayer);
        self::notifyAllPlayers('newFirstPlayer', '', [
            'playerId' => $newFirstPlayer,
            'player_name' => $this->getPlayerName($newFirstPlayer),
        ]);

        // remove first 2 modules
        $armBefore = $this->getArm();
        $tableTiles = $this->getTilesByLocation('table');
        foreach ([1, 2] as $moduleIndex) {
            $spot = ($armBefore + $moduleIndex) % 7;
            $spotTile = $this->array_find($tableTiles, fn($tableTile) => $tableTile->locationArg == $spot);
            if ($spotTile) {
                $this->tiles->moveCard($spotTile->id, 'void');
                self::notifyAllPlayers('removeTableTile', '', [
                    'tile' => $spotTile,
                ]);
                $tableTiles = array_values(array_filter($tableTiles, fn($tableTile) => $tableTile->id != $spotTile->id));
            }
        }

        // shift remaining modules
        for ($spot = 7; $spot >= 0; $spot--) {
            $spotTile = $this->array_find($tableTiles, fn($tableTile) => $tableTile->locationArg == $spot);
            if (!$spotTile) {
                $lowerTiles = array_values(array_filter($tableTiles, fn($tableTile) => $tableTile->locationArg < $spot));
                if (count($lowerTiles)) {
                    usort($lowerTiles, fn($a, $b) => $b->locationArg - $a->locationArg);
                    $newTile = $lowerTiles[0];
                    $newTile->locationArg = $spot;
                    $this->tiles->moveCard($newTile->id, 'table', $spot);

                    self::notifyAllPlayers('shiftTableTile', '', [
                        'tile' => $newTile,
                    ]);
                }
            }
        }

        // move arm
        $minSpot = min(array_map(fn($tile) => $tile->locationArg, $tableTiles));
        $armAfter = $minSpot - 1;
        $this->setGlobalVariable(ARM, $armAfter);
        self::notifyAllPlayers('moveArm', '', [
            'arm' => $armAfter,
        ]);

        // reset workers in arm range
        $tableWorkers = $this->getTableWorkers();
        $movedWorkers = [];
        foreach ($tableWorkers as $worker) {
            if ($worker->spot >= $armBefore && $worker->spot <= $armAfter) {
                $movedWorkers[] = $worker;
            }
        }
        $this->setGlobalVariable(MOVED_WORKERS, $movedWorkers);

        // place new tiles
        $age = $this->getYear();
        $tableTiles = $this->getTilesByLocation('table');
        for ($i = 1; $i < 8; $i++) {
            $spot = ($armAfter + $i) % 8;
            $spotTile = $this->array_find($tableTiles, fn($tableTile) => $tableTile->locationArg == $spot);
            if (!$spotTile) {
                $newTile = $this->getTileFromDb($this->tiles->pickCardForLocation('deck'.$age, 'table', $spot));
                if ($newTile == null) {
                    self::notifyAllPlayers('log', clienttranslate('Impossible to refill the tiles, moving to next year'), []);
                    
                    $this->gamestate->nextState('endYear');
                    return;
                } else {
                    self::notifyAllPlayers('newTableTile', '', [
                        'tile' => $newTile,
                    ]);
                }
            }
        }

        if (count($movedWorkers)) {
            $this->gamestate->nextState('moveWorkers');
        } else {            
            $this->gamestate->nextState('afterEndRound');
        }
    }

    function stMoveWorkers() {
        $movedWorkers = $this->getGlobalVariable(MOVED_WORKERS);
        $playersIds = array_values(array_unique(array_map(fn($worker) =>$worker->playerId, $movedWorkers)));

        $this->gamestate->setPlayersMultiactive($playersIds, 'next');
        $this->gamestate->initializePrivateStateForAllActivePlayers(); 
    }

    function stAfterEndRound() {
        $this->reactivatePlayerWorkers();

        $this->gamestate->nextState('nextRound');
    }

    function stEndYear() {
        // TODO
        /* 
        6 Gagnez autant de pions science que le plus grand chiffre que
vous avez atteint sur la piste de recherche, puis autant que
le nombre de marqueurs de recherche derrière vous sur la
piste de recherche (à deux, celui ou celle qui est en tête gagne
deux pions science). Placez-les derrière votre aide de jeu et
replacez votre marqueur de recherche au début de la piste.*/
/*
7 Retirez toutes les expériences du plateau principal et
remplacez-les par 7 expériences de la nouvelle année.*/
/*
8 Complétez le remplissage des hangars avec des modules de
la nouvelle année. Les modules de l’année précédente restent
autour du plateau principal.*/
/*
9 Replacez dans votre base les astronautes que vous avez
récupérés. Un astronaute doit toujours être placé actif et
adjacent orthogonalement à au moins un module.*/
/*
10 Tous les astronautes déjà présents dans votre base restent à
leur place et sont rendus actifs.*/
/*
11 Un nouveau tour de jeu peut commencer.
Important : à la fin de l’année 3, la partie est terminée. Résolvez
le décompte de la piste de recherche (voir le point 6 ci-dessus),
puis reportez-vous à la section suivante.
*/

        $year = $this->getGlobalVariable(YEAR);
        $this->setGlobalVariable(YEAR, $year + 1);
        if ($year == 3) {
            $this->gamestate->nextState('endScore');
        } else {
            $this->gamestate->nextState('next');
        }
    }

    function stEndScore() {
        $playersIds = $this->getPlayersIds();

        /*foreach($playersIds as $playerId) {
            $player = $this->getPlayer($playerId);
            //$scoreAux = $player->recruit + $player->bracelet;
            //$this->DbQuery("UPDATE player SET player_score_aux = player_recruit + player_bracelet WHERE player_id = $playerId");
        }
        //$this->DbQuery("UPDATE player SET player_score_aux = player_recruit + player_bracelet");*/

        $this->gamestate->nextState('endGame');
    }
}
