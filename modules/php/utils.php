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

    function getPlayerName(int $playerId) {
        return self::getUniqueValueFromDB("SELECT player_name FROM player WHERE player_id = $playerId");
    }

    function getPlayer(int $id) {
        $sql = "SELECT * FROM player WHERE player_id = $id";
        $dbResults = $this->getCollectionFromDb($sql);
        return array_map(fn($dbResult) => new HumanityPlayer($dbResult), array_values($dbResults))[0];
    }

    function incPlayerVP(int $playerId, int $amount, $message = '', $args = []) {
        if ($amount != 0) {
            $this->DbQuery("UPDATE player SET `player_vp` = `player_vp` + $amount WHERE player_id = $playerId");
        }
            
        $this->notifyAllPlayers('vp', $message, [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'new' => $this->getPlayer($playerId)->vp,
            'inc' => $amount,
            'absInc' => abs($amount),
        ] + $args);
    }

    function incPlayerResearchPoints(int $playerId, int $amount, $message = '', $args = []) {
        if ($amount != 0) {
            $this->DbQuery("UPDATE player SET `player_research_points` = `player_research_points` + $amount WHERE player_id = $playerId");
        }
            
        $this->notifyAllPlayers('researchPoints', $message, [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'new' => $this->getPlayer($playerId)->researchPoints,
            'inc' => $amount,
            'absInc' => abs($amount),
        ] + $args);
    }

    function incPlayerScience(int $playerId, int $amount, $message = '', $args = []) {
        if ($amount != 0) {
            $this->DbQuery("UPDATE player SET `player_science` = `player_science` + $amount WHERE player_id = $playerId");
        }
            
        $this->notifyAllPlayers('science', $message, [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'new' => $this->getPlayer($playerId)->science,
            'inc' => $amount,
            'absInc' => abs($amount),
            'private' => intval($this->gamestate->state_id()) < ST_END_SCORE,
        ] + $args);
    }

    function getArm() {
        return $this->getGlobalVariable(ARM) ?? 0;
    }

    function getYear() {
        return $this->getGlobalVariable(YEAR) ?? 1;
    }

    function canPay(array $cost, array $icons) { // payment if can pay, null if cannot pay
        $remainingIcons = $icons; // copy

        $payWith = [
            ELECTRICITY => 0,
            1 => 0, 2 => 0, 3 => 0,
            11 => 0, 12 => 0, 13 => 0,
        ];

        if (array_key_exists(ELECTRICITY, $cost)) {
            if ($cost[ELECTRICITY] > $remainingIcons[ELECTRICITY]) {
                return null;
            } else {
                $payWith[ELECTRICITY] += $cost[ELECTRICITY];
                $remainingIcons[ELECTRICITY] -= $cost[ELECTRICITY];
            }
        }

        foreach([1, 2, 3] as $type) {
            if (array_key_exists($type, $cost)) {
                $payWithType = min($cost[$type], $remainingIcons[$type]);
                $payWith[$type] += $payWithType;
                $remainingIcons[$type] -= $payWithType;

                $remainingOfType = $cost[$type] - $payWithType;
                if ($remainingOfType > $remainingIcons[ELECTRICITY]) {
                    return null;
                } else {
                    $payWith[ELECTRICITY] += $remainingOfType;
                    $remainingIcons[ELECTRICITY] -= $remainingOfType;
                }
            }
        }

        foreach([11, 12, 13] as $type) {
            if (array_key_exists($type, $cost)) {
                $baseType = $type - 10;
                $payWithType = min($cost[$type], $remainingIcons[$type]);
                $payWith[$type] -= $payWithType;
                $remainingIcons[$type] -= $payWithType;

                $remainingOfType = $cost[$type] - $payWithType;
                if ((3 * $remainingOfType) > ($remainingIcons[ELECTRICITY] + $remainingIcons[$baseType])) {
                    return null;
                } else {
                    $payWithBaseType = min(3 * $remainingOfType, $remainingIcons[$baseType]);
                    $payWith[$baseType] -= $payWithBaseType;
                    $remainingIcons[$baseType] -= $payWithBaseType;

                    $payWithElectricity = (3 * $remainingOfType) - $payWithBaseType;
                    $payWith[ELECTRICITY] += $payWithElectricity;
                    $remainingIcons[ELECTRICITY] -= $payWithElectricity;
                }
            }
        }

        return $payWith;
    }

    function getColorName(int $color) {
        switch ($color) {
            case 1: return clienttranslate("Orange");
            case 2: return clienttranslate("Blue");
            case 3: return clienttranslate("Purple");
            case 4: return clienttranslate("Green");
        }
    }

    function getResourceName(int $type) {
        switch ($type) {
            case 0: return clienttranslate("Electricity");
            case 1: return clienttranslate("Ice");
            case 2: return clienttranslate("Methan");
            case 3: return clienttranslate("Insect");
            case 11: return clienttranslate("Oxygen");
            case 12: return clienttranslate("Aircarbon");
            case 13: return clienttranslate("Protein");
        }
    }
}
