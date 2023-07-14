<?php

require_once(__DIR__.'/../constants.inc.php');

class TileType {
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

class BlueTileType extends TileType {
    public function __construct(array $cost, ?int $workforce = null, ?array $production = null, ?int $power = null, int $points = 0) {
        parent::__construct(BLUE, $cost, $workforce, $production, 0, 0, $power, $points);
    } 
}

class OrangeTileType extends TileType {
    public function __construct(array $cost, ?int $workforce = null, ?array $production = null, ?int $power = null, int $points = 0) {
        parent::__construct(ORANGE, $cost, $workforce, $production, 0, 0, $power, $points);
    } 
}

class PurpleTileType extends TileType {
    public function __construct(array $cost, ?int $adjacentResearchPoints = null, ?int $researchPoints = null, ?int $searchColor = null) {
        parent::__construct(PURPLE, $cost, null, null, $adjacentResearchPoints, $researchPoints, $searchColor);
    } 
}

class GreenTileType extends TileType {
    public function __construct(array $cost, ?int $shape = null, int $points = 0) {
        parent::__construct(GREEN, $cost, null, null, 0, 0, $shape, $points);
    } 
}

class Tile extends TileType {

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
            $objectiveType = $TILES[$this->type][$this->number];
            $this->color = $objectiveType->color;      
            $this->cost = $objectiveType->cost;
            $this->workforce = $objectiveType->workforce;
            $this->production = $objectiveType->production;
            $this->adjacentResearchPoints = $objectiveType->adjacentResearchPoints;
            $this->researchPoints = $objectiveType->researchPoints;
            $this->points = $objectiveType->points;
            $this->matchType = $objectiveType->matchType;
        }
    } 

    public function getProduction() {
        return $this->production[$this->r];
    }

    public static function onlyId(?Tile $tile) {
        if ($tile == null) {
            return null;
        }
        
        return new Tile([
            'card_id' => $tile->id,
            'card_location' => $tile->location,
            'card_location_arg' => $tile->locationArg,
            'card_type' => $tile->type,
        ], null);
    }

    public static function onlyIds(array $tiles) {
        return array_map(fn($tile) => self::onlyId($tile), $tiles);
    }
}

?>