<?php

require_once(__DIR__.'/../constants.inc.php');

class ExperimentType {
    public int $extremity;
    public array $cost;
    public int $researchPoints;
    public ?int $effect;
    public ?int $points;
  
    public function __construct(int $extremity, array $cost, ?int $researchPoints, ?int $effect = null, ?int $points = 0) {
        $this->extremity = $extremity;
        $this->cost = $cost;
        $this->researchPoints = $researchPoints;
        $this->effect = $effect;
        $this->points = $points;
    } 
}

class Experiment extends ExperimentType {

    public int $id;
    public string $location;
    public int $locationArg;
    public ?int $year; // 1..3
    public ?int $number; // 1..9
    public ?int $line;

    public function __construct($dbCard, $EXPERIMENT) {
        $this->id = intval($dbCard['card_id'] ?? $dbCard['id']);
        $this->location = $dbCard['card_location'] ?? $dbCard['location'];
        $this->locationArg = intval($dbCard['card_location_arg'] ?? $dbCard['location_arg']);
        $this->year = array_key_exists('card_type', $dbCard) || array_key_exists('type', $dbCard) ? intval($dbCard['card_type'] ?? $dbCard['type']) : null;
        $this->number = array_key_exists('card_type_arg', $dbCard) || array_key_exists('type_arg', $dbCard) ? intval($dbCard['card_type_arg'] ?? $dbCard['type_arg']) : null;
        $this->line = array_key_exists('line', $dbCard) ? intval($dbCard['line']) : null;

        if ($this->number !== null) {
            $missionType = $EXPERIMENT[$this->year][$this->number];
            $this->extremity = $missionType->extremity;
            $this->cost = $missionType->cost;
            $this->researchPoints = $missionType->researchPoints;
            $this->effect = $missionType->effect;
            $this->points = $missionType->points;
        }
    } 

    public static function onlyId(?Experiment $experiment) {
        if ($experiment == null) {
            return null;
        }
        
        return new Experiment([
            'card_id' => $experiment->id,
            'card_location' => $experiment->location,
            'card_location_arg' => $experiment->locationArg,
            'card_type' => $experiment->year,
        ], null);
    }

    public static function onlyIds(array $experiments) {
        return array_map(fn($experiment) => self::onlyId($experiment), $experiments);
    }
}

?>