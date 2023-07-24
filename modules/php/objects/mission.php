<?php

require_once(__DIR__.'/../constants.inc.php');

class MissionType {
    public int $minimum;
    public ?int $color;
    public ?bool $adjacent;
    public ?bool $diagonal;
    public ?int $direction;
    public ?bool $sameColor;
    public ?int $baseType;
    public ?int $extremity;
  
    public function __construct(int $minimum, ?int $color, ?bool $adjacent, ?bool $diagonal, ?int $direction, ?bool $sameColor, ?int $baseType, ?int $extremity) {
        $this->minimum = $minimum;
        $this->color = $color;
        $this->adjacent = $adjacent;
        $this->diagonal = $diagonal;
        $this->direction = $direction;
        $this->sameColor = $sameColor;
        $this->baseType = $baseType;
        $this->extremity = $extremity;
    } 
}

class MissionTypeA extends MissionType {  
    public function __construct(int $minimum, ?int $color, ?bool $adjacent, bool $diagonal = false) {
        parent::__construct($minimum, $color, $adjacent, $diagonal, null, null, null, null);
    } 
}

class MissionTypeB extends MissionType {  
    public function __construct(int $minimum, ?int $direction, ?int $sameColor) {
        parent::__construct($minimum, null, null, null, $direction, $sameColor, null, null);
    } 
}

class MissionTypeC extends MissionType {  
    public function __construct(int $minimum, ?int $baseType, ?int $extremity) {
        parent::__construct($minimum, null, null, null, null, null, $baseType, $extremity);
    } 
}

class Mission extends MissionType {

    public int $id;
    public string $location;
    public int $locationArg;
    public ?int $type; // A, B, C
    public ?int $number; // 1..6

    public function __construct($dbCard, $MISSIONS) {
        $this->id = intval($dbCard['card_id'] ?? $dbCard['id']);
        $this->location = $dbCard['card_location'] ?? $dbCard['location'];
        $this->locationArg = intval($dbCard['card_location_arg'] ?? $dbCard['location_arg']);
        $this->type = array_key_exists('card_type', $dbCard) || array_key_exists('type', $dbCard) ? intval($dbCard['card_type'] ?? $dbCard['type']) : null;
        $this->number = array_key_exists('card_type_arg', $dbCard) || array_key_exists('type_arg', $dbCard) ? intval($dbCard['card_type_arg'] ?? $dbCard['type_arg']) : null;

        if ($this->number !== null) {
            $missionType = $MISSIONS[$this->type][$this->number];        
            $this->minimum = $missionType->minimum;
            $this->color = $missionType->color;
            $this->adjacent = $missionType->adjacent;
            $this->diagonal = $missionType->diagonal;
            $this->direction = $missionType->direction;
            $this->sameColor = $missionType->sameColor;
            $this->baseType = $missionType->baseType;
            $this->extremity = $missionType->extremity;
        }
    } 

    public static function onlyId(?Mission $mission) {
        if ($mission == null) {
            return null;
        }
        
        return new Mission([
            'card_id' => $mission->id,
            'card_location' => $mission->location,
            'card_location_arg' => $mission->locationArg,
            'card_type' => $mission->type,
        ], null);
    }

    public static function onlyIds(array $missions) {
        return array_map(fn($mission) => self::onlyId($mission), $missions);
    }
}

?>