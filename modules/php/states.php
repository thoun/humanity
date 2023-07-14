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
        $newFirstPlayer = intval($this->getPlayerAfter($this->getGlobalVariable(FIRST_PLAYER)));
        $this->setGlobalVariable(FIRST_PLAYER, $newFirstPlayer);
        $this->gamestate->changeActivePlayer($newFirstPlayer);
        self::notifyAllPlayers('newFirstPlayer', '', [
            'playerId' => $newFirstPlayer,
            'player_name' => $this->getPlayerName($newFirstPlayer),
        ]);
        
// TODO
/*
2 Si les deux premiers modules, placés sous les croix blanches,
n’ont pas été déployés, ils sont retirés du jeu.*/
/*
3 Décalez en sens horaire les modules restant autour du
plateau principal sans laisser de hangar vide entre eux.
Tournez le bras articulé en sens horaire jusqu’à le placer sur le
dernier hangar vide.*/
/*
4 Tous les astronautes dépassés par le bras articulé vous sont
restitués. Les astronautes en face du bras articulé (comme
l’astronaute vert sur l’exemple) ainsi que tous ceux qui n’ont
pas été dépassés restent bloqués autour du plateau principal.*/
/*
5 Remplissez les hangars vides dans le sens horaire avec les
modules de l’année en cours. Il ne faut pas toucher à la roue
des expériences, elle reste en l’état jusqu’à la fin de l’année.
Important : si vous ne parvenez pas à remplir tous les
hangars de module car la pioche est épuisée, cela déclenche
la fin d’année. Arrêtez la réinitialisation pour l’instant et
reportez-vous à la section suivante « Fin d’année ». Si la
pioche est épuisée, mais que vous êtes parvenu à remplir tous
les hangars, ce n’est pas encore la fin d’année.*/
$canRefillTiles = true;

        if ($canRefillTiles) {
            // TODO
             /* 
6 Replacez dans votre base les astronautes que vous
avez récupérés. Un astronaute doit être placé adjacent
orthogonalement à au moins un module (les obstacles ne
sont pas des modules). De plus, il doit être tourné face à vous,
c’est-à-dire actif.
Important : réfléchissez bien avant de placer vos astronautes,
car vous ne pourrez pas les déplacer, à moins de les envoyer
autour du plateau principal, et c’est à leur emplacement que
les prochains modules pourront être construits.
*/
            $this->reactivatePlayerWorkers();

            $this->gamestate->nextState('next');
        } else {
            $this->gamestate->nextState('endYear');
        }
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
