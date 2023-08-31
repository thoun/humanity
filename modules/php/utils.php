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

    function array_find_last(array $array, callable $fn) {
        $result = null;
        foreach ($array as $value) {
            if($fn($value)) {
                $result = $value;
            }
        }
        return $result;
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

    function computePermutations(array $array) {
        $result = [];
    
        $recurse = function($array, $start_i = 0) use (&$result, &$recurse) {
            if ($start_i === count($array)-1) {
                array_push($result, $array);
            }
    
            for ($i = $start_i; $i < count($array); $i++) {
                //Swap array value at $i and $start_i
                $t = $array[$i]; $array[$i] = $array[$start_i]; $array[$start_i] = $t;
    
                //Recurse
                $recurse($array, $start_i + 1);
    
                //Restore old order
                $t = $array[$i]; $array[$i] = $array[$start_i]; $array[$start_i] = $t;
            }
        };
    
        $recurse($array);
    
        return $result;
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
            $current = $this->getPlayer($playerId)->researchPoints;
            $new = min(50, $current + $amount);
            $this->DbQuery("UPDATE player SET `player_research_points` = $new WHERE player_id = $playerId");
        }
            
        $this->notifyAllPlayers('researchPoints', $message, [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'new' => $this->getPlayer($playerId)->researchPoints,
            'inc' => $amount,
            'absInc' => abs($amount),
        ] + $args);

        $this->incStat($amount, 'researchPoints', $playerId);
    }

    function incPlayerScience(int $playerId, int $amount, $message = '', $args = []) {
        if ($amount != 0) {
            $this->DbQuery("UPDATE player SET `player_science` = `player_science` + $amount WHERE player_id = $playerId");
            
            $year = $this->getYear();
            $scienceByYear = $this->getPlayer($playerId)->scienceByYear;
            $scienceByYear[$year - 1] += $amount;
            $scienceByYearJson = json_encode($scienceByYear);
            $this->DbQuery("UPDATE player SET `player_science_by_year` = '$scienceByYearJson' WHERE `player_id` = $playerId"); 
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

    private function incArray(array &$array, int $key, int $inc) {
        if (array_key_exists($key, $array)) {
            $array[$key] += $inc;
        } else {
            $array[$key] = $inc;
        }
    }

    function canPay(array $cost, int $playerId) { // payment if can pay, null if cannot pay
        $playerModules = $this->getModulesByLocation('player', $playerId);
        $modules = array_values(array_filter($playerModules, fn($t) => $t->production !== null && $t->r > 0));

        $singleProductionModules = array_values(array_filter($modules, fn($module) => count($module->production) == 1));
        $doubleProductionModules = array_values(array_filter($modules, fn($module) => count($module->production) > 1));

        $doubleProductionModulePermutations = $this->computePermutations($doubleProductionModules);
        if (count($doubleProductionModulePermutations) == 0) {
            $doubleProductionModulePermutations = [[]]; // make sure we test if there is only single production modules !
        }
        // clone modules before testing, to not share rotation with other performed permutations !!!
        $paymentCombinations = array_map(fn($doubleModulePermutation) => $this->canPayWithModules($cost, json_decode(json_encode(array_merge($singleProductionModules, $doubleModulePermutation)))), $doubleProductionModulePermutations);
        $paymentCombinations = array_values(array_filter($paymentCombinations, fn($pc) => $pc != null));
        if (count($paymentCombinations) == 0) {
            return null;
        }
        // make sure we keep the combination using the less electricity
        usort($paymentCombinations, fn($a, $b) => $a['payWith'][ELECTRICITY] - $b['payWith'][ELECTRICITY]);
        return $paymentCombinations[0];
    }

        
    function canPayWithModules(array $cost, array $modules) { // payment if can pay, null if cannot pay
        $payWith = [
            ELECTRICITY => 0,
            1 => 0, 2 => 0, 3 => 0,
            11 => 0, 12 => 0, 13 => 0,
        ];
        $rotate = [];

        if (array_key_exists(ELECTRICITY, $cost)) {
            while ($cost[ELECTRICITY] > 0 && $this->array_some($modules, fn($module) => in_array(ELECTRICITY, $module->production) && $module->r > 0)) {
                $module = $this->array_find($modules, fn($module) => in_array(ELECTRICITY, $module->production) && $module->r > 0);
                $canUse = min($cost[ELECTRICITY], $module->r);
                $module->r -= $canUse;
                $cost[ELECTRICITY] -= $canUse;
                $payWith[ELECTRICITY] += $canUse;
                $this->incArray($rotate, $module->id, $canUse);
            }

            if ($cost[ELECTRICITY] > 0) {
                return null;
            }
        } else {
            $cost[ELECTRICITY] = 0;
        }

        foreach([1, 2, 3] as $type) {
            if (array_key_exists($type, $cost)) {
                while ($cost[$type] > 0 && $this->array_some($modules, fn($m) => in_array($type, $m->production) && $m->r > 0)) {
                    $module = $this->array_find($modules, fn($m) => in_array($type, $m->production) && count($m->production) == 1 && $m->r > 0);
                    if ($module == null) {
                        $module = $this->array_find($modules, fn($m) => in_array($type, $m->production) && $m->r > 0);
                    }
                    $canUse = min($cost[$type], $module->r);
                    $module->r -= $canUse;
                    $cost[$type] -= $canUse;
                    $payWith[$type] += $canUse;
                    $this->incArray($rotate, $module->id, $canUse);
                }

                while ($cost[$type] > 0 && $this->array_some($modules, fn($m) => in_array(ELECTRICITY, $m->production) && $m->r > 0)) {
                    $module = $this->array_find($modules, fn($m) => in_array(ELECTRICITY, $m->production) && $m->r > 0);
                    $canUse = min($cost[$type], $module->r);
                    $module->r -= $canUse;
                    $cost[$type] -= $canUse;
                    $payWith[ELECTRICITY] += $canUse;
                    $this->incArray($rotate, $module->id, $canUse);
                }
    
                if ($cost[$type] > 0) {
                    return null;
                }
            }
        }

        foreach([11, 12, 13] as $advancedType) {
            if (array_key_exists($advancedType, $cost)) {
                
                while ($cost[$advancedType] > 0 && $this->array_some($modules, fn($module) => in_array($advancedType, $module->production) && $module->r > 0)) {
                    $module = $this->array_find($modules, fn($m) => in_array($advancedType, $m->production) && count($m->production) == 1 && $m->r > 0);
                    if ($module == null) {
                        $module = $this->array_find($modules, fn($m) => in_array($advancedType, $m->production) && $m->r > 0);
                    }
                    $canUse = min($cost[$advancedType], $module->r);
                    $module->r -= $canUse;
                    $cost[$advancedType] -= $canUse;
                    $payWith[$advancedType] += $canUse;
                    $this->incArray($rotate, $module->id, $canUse);
                }

                $baseType = $advancedType - 10;

                while ($cost[$advancedType] > 0 && array_reduce(array_map(fn($m) => $m->r, array_filter($modules, fn($module) => (in_array($baseType, $module->production) || in_array(ELECTRICITY, $module->production)) && $module->r > 0)), fn($a, $b) => $a + $b, 0) >= 3) {

                    $baseTypeToPay = 3;

                    while ($baseTypeToPay > 0) {
                        $payType = $baseType;
                        $module = $this->array_find($modules, fn($m) => in_array($baseType, $m->production) && count($m->production) == 1 && $m->r > 0);
                        if ($module == null) {
                            $module = $this->array_find($modules, fn($m) => in_array($baseType, $m->production) && $m->r > 0);
                        }
                        if ($module == null) {
                            $payType = ELECTRICITY;
                            $module = $this->array_find($modules, fn($m) => in_array(ELECTRICITY, $m->production) && $m->r > 0);
                        }
                        if ($module == null) {
                            return null; // shouldn't happen!
                        }
                        $canUse = min($baseTypeToPay, $module->r);
                        $module->r -= $canUse;
                        $payWith[$payType] += $canUse;
                        $this->incArray($rotate, $module->id, $canUse);
                        $baseTypeToPay -= $canUse;
                    }

                    $cost[$advancedType] -= 1;
                }
    
                if ($cost[$advancedType] > 0) {
                    return null;
                }
            }
        }

        return ['payWith' => $payWith, 'rotate' => $rotate];
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
            case 2: return clienttranslate("Methane");
            case 3: return clienttranslate("Insect");
            case 11: return clienttranslate("Oxygen");
            case 12: return clienttranslate("Aircarbon");
            case 13: return clienttranslate("Protein");
        }
    }

    function getPlayerEndScoreSummary(int $playerId) {
        $player = $this->getPlayer($playerId);
        $modules = $this->getModulesByLocation('player', $playerId);
        $modulesPoints = array_reduce(array_map(fn($module) => $module->points, $modules), fn($a, $b) => $a + $b, 0);
        $missionsPoints = $this->getStat('endMissions', $playerId) * 3;

        return [
            'remainingResources' => $this->getStat('vpWithRemainingResources', $playerId),
            'squares' => $this->getStat('vpWithSquares', $playerId), 
            'greenhouses' => $this->getStat('vpWithGreenhouses', $playerId), 
            'experiments' => $this->getStat('vpWithExperiments', $playerId), 
            'missions' => $missionsPoints,
            'modules' => $modulesPoints,
            'scienceByYear' => $player->scienceByYear,
            'total' => $player->score,
        ];
    }
}
