<?php

require_once(__DIR__.'/../constants.inc.php');

class ModuleType {
    public int $color;
    public array $cost;
    public ?int $workforce;
    public ?array $production;
    public int $adjacentResearchPoints;
    public int $researchPoints;
    public int $points;
    public ?int $matchType; // power for blue/orange, color for research, shape for green
  
    public function __construct(int $color, array $cost, ?int $workforce = null, ?array $production = null, int $adjacentResearchPoints = 0, int $researchPoints = 0, ?int $matchType = null, int $points = 0) {
        $this->color = $color;
        $this->cost = $cost;
        $this->workforce = $workforce;
        $this->production = $production;
        $this->adjacentResearchPoints = $adjacentResearchPoints;
        $this->researchPoints = $researchPoints;
        $this->points = $points;
        $this->matchType = $matchType;
    } 
}

class BlueModuleType extends ModuleType {
    public function __construct(array $cost, ?int $workforce = null, ?array $production = null, ?int $power = null, int $points = 0) {
        parent::__construct(BLUE, $cost, $workforce, $production, 0, 0, $power, $points);
    } 
}

class OrangeModuleType extends ModuleType {
    public function __construct(array $cost, ?int $workforce = null, ?array $production = null, ?int $power = null, int $points = 0) {
        parent::__construct(ORANGE, $cost, $workforce, $production, 0, 0, $power, $points);
    } 
}

class PurpleModuleType extends ModuleType {
    public function __construct(array $cost, ?int $adjacentResearchPoints = null, ?int $researchPoints = null, ?int $searchColor = null) {
        parent::__construct(PURPLE, $cost, null, null, $adjacentResearchPoints, $researchPoints, $searchColor);
    } 
}

class GreenModuleType extends ModuleType {
    public function __construct(array $cost, ?int $shape = null, int $points = 0) {
        parent::__construct(GREEN, $cost, null, null, 0, 0, $shape, $points);
    } 
}

class Module extends ModuleType {

    public int $id;
    public string $location;
    public int $locationArg;
    public int $type; // 0 start, 1..3 year, 8 communication, 9 obstacle
    public ?int $number;
    public ?int $x;
    public ?int $y;
    public ?int $r;

    public function __construct($dbCard, $TILES) {
        $this->id = intval($dbCard['card_id'] ?? $dbCard['id']);
        $this->location = $dbCard['card_location'] ?? $dbCard['location'];
        $this->locationArg = intval($dbCard['card_location_arg'] ?? $dbCard['location_arg']);
        $this->type = array_key_exists('card_type', $dbCard) || array_key_exists('type', $dbCard) ? intval($dbCard['card_type'] ?? $dbCard['type']) : null;
        $this->number = array_key_exists('card_type_arg', $dbCard) || array_key_exists('type_arg', $dbCard) ? intval($dbCard['card_type_arg'] ?? $dbCard['type_arg']) : null;
        $this->x = array_key_exists('x', $dbCard) ? intval($dbCard['x']) : null;
        $this->y = array_key_exists('y', $dbCard) ? intval($dbCard['y']) : null;
        $this->r = array_key_exists('r', $dbCard) ? intval($dbCard['r']) : null;

        if ($this->number !== null) {
            $missionType = $TILES[$this->type][$this->number];
            $this->color = $missionType->color;      
            $this->cost = $missionType->cost;
            $this->workforce = $missionType->workforce;
            $this->production = $missionType->production;
            $this->adjacentResearchPoints = $missionType->adjacentResearchPoints;
            $this->researchPoints = $missionType->researchPoints;
            $this->points = $missionType->points;
            $this->matchType = $missionType->matchType;
        }
    } 

    public function getProduction() {
        return $this->production[$this->r];
    }

    public static function onlyId(?Module $module) {
        if ($module == null) {
            return null;
        }
        
        return new Module([
            'card_id' => $module->id,
            'card_location' => $module->location,
            'card_location_arg' => $module->locationArg,
            'card_type' => $module->type,
        ], null);
    }

    public static function onlyIds(array $modules) {
        return array_map(fn($module) => self::onlyId($module), $modules);
    }
}

?>