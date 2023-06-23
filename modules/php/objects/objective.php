<?php

require_once(__DIR__.'/../constants.inc.php');

class ObjectiveType {
    public int $minimum;
    public ?int $color;
    public ?bool $adjacent;
    public ?int $direction;
    public ?bool $sameColor;
    public ?int $baseType;
    public ?int $extremity;
  
    public function __construct(int $minimum, ?int $color, ?bool $adjacent, ?int $direction, ?bool $sameColor, ?int $baseType, ?int $extremity) {
        $this->minimum = $minimum;
        $this->color = $color;
        $this->adjacent = $adjacent;
        $this->direction = $direction;
        $this->sameColor = $sameColor;
        $this->baseType = $baseType;
        $this->extremity = $extremity;
    } 
}

class ObjectiveTypeA extends ObjectiveType {  
    public function __construct(int $minimum, ?int $color, ?bool $adjacent) {
        parent::__construct($minimum, $color, $adjacent, null, null, null, null);
    } 
}

class ObjectiveTypeB extends ObjectiveType {  
    public function __construct(int $minimum, ?int $direction, ?int $sameColor) {
        parent::__construct($minimum, null, null, $direction, $sameColor, null, null);
    } 
}

class ObjectiveTypeC extends ObjectiveType {  
    public function __construct(int $minimum, ?int $baseType, ?int $extremity) {
        parent::__construct($minimum, null, null, null, null, $baseType, $extremity);
    } 
}

class Objective extends ObjectiveType {

    public int $id;
    public string $location;
    public int $locationArg;
    public ?int $type; // A, B, C
    public ?int $number; // 1..9

    public function __construct($dbCard, $OBJECTIVES) {
        $this->id = intval($dbCard['card_id'] ?? $dbCard['id']);
        $this->location = $dbCard['card_location'] ?? $dbCard['location'];
        $this->locationArg = intval($dbCard['card_location_arg'] ?? $dbCard['location_arg']);
        $this->type = array_key_exists('card_type', $dbCard) || array_key_exists('type', $dbCard) ? intval($dbCard['card_type'] ?? $dbCard['type']) : null;
        $this->number = array_key_exists('card_type_arg', $dbCard) || array_key_exists('type_arg', $dbCard) ? intval($dbCard['card_type_arg'] ?? $dbCard['type_arg']) : null;

        if ($this->number !== null) {
            $objectiveType = $OBJECTIVES[$this->type][$this->number];        
            $this->minimum = $objectiveType->minimum;
            $this->color = $objectiveType->color;
            $this->adjacent = $objectiveType->adjacent;
            $this->direction = $objectiveType->direction;
            $this->sameColor = $objectiveType->sameColor;
            $this->baseType = $objectiveType->baseType;
            $this->extremity = $objectiveType->extremity;
        }
    } 

    public static function onlyId(?Objective $objective) {
        if ($objective == null) {
            return null;
        }
        
        return new Objective([
            'card_id' => $objective->id,
            'card_location' => $objective->location,
            'card_location_arg' => $objective->locationArg,
            'card_type' => $objective->type,
        ], null);
    }

    public static function onlyIds(array $objectives) {
        return array_map(fn($objective) => self::onlyId($objective), $objectives);
    }
}

?>