<?php

require_once(__DIR__.'/../constants.inc.php');

class ResearchType {
    public int $extremity;
    public array $cost;
    public int $science;
    public ?int $effect;
    public ?int $points;
  
    public function __construct(int $extremity, array $cost, ?int $science, ?int $effect = null, ?int $points = 0) {
        $this->extremity = $extremity;
        $this->cost = $cost;
        $this->science = $science;
        $this->effect = $effect;
        $this->points = $points;
    } 
}

class Research extends ResearchType {

    public int $id;
    public string $location;
    public int $locationArg;
    public ?int $year; // 1..3
    public ?int $number; // 1..9
    public ?int $line;

    public function __construct($dbCard, $RESEARCH) {
        $this->id = intval($dbCard['card_id'] ?? $dbCard['id']);
        $this->location = $dbCard['card_location'] ?? $dbCard['location'];
        $this->locationArg = intval($dbCard['card_location_arg'] ?? $dbCard['location_arg']);
        $this->year = array_key_exists('card_type', $dbCard) || array_key_exists('type', $dbCard) ? intval($dbCard['card_type'] ?? $dbCard['type']) : null;
        $this->number = array_key_exists('card_type_arg', $dbCard) || array_key_exists('type_arg', $dbCard) ? intval($dbCard['card_type_arg'] ?? $dbCard['type_arg']) : null;
        $this->line = array_key_exists('line', $dbCard) ? intval($dbCard['line']) : null;

        if ($this->number !== null) {
            $objectiveType = $RESEARCH[$this->year][$this->number];
            $this->extremity = $objectiveType->extremity;
            $this->cost = $objectiveType->cost;
            $this->science = $objectiveType->science;
            $this->effect = $objectiveType->effect;
            $this->points = $objectiveType->points;
        }
    } 

    public static function onlyId(?Research $research) {
        if ($research == null) {
            return null;
        }
        
        return new Research([
            'card_id' => $research->id,
            'card_location' => $research->location,
            'card_location_arg' => $research->locationArg,
            'card_type' => $research->year,
        ], null);
    }

    public static function onlyIds(array $researches) {
        return array_map(fn($research) => self::onlyId($research), $researches);
    }
}

?>