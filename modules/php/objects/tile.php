<?php

require_once(__DIR__.'/../constants.inc.php');

class TileType {
    public int $color;
    public array $cost;
    public ?int $workforce;
    public ?array $production;
    public ?int $adjacentPoints;
    public ?int $points;
    public ?int $matchType; // color for research, shape for green
  
    public function __construct(int $color, array $cost, ?int $workforce = null, ?array $production = null, ?int $adjacentPoints = null, ?int $points = null, ?int $matchType = null) {
        $this->color = $color;
        $this->cost = $cost;
        $this->workforce = $workforce;
        $this->production = $production;
        $this->adjacentPoints = $adjacentPoints;
        $this->points = $points;
        $this->matchType = $matchType;
    } 
}

class BlueTileType extends TileType {
    public function __construct(array $cost, ?int $workforce = null, ?array $production = null) {
        parent::__construct(BLUE, $cost, $workforce, $production);
    } 
}

class OrangeTileType extends TileType {
    public function __construct(array $cost, ?int $workforce = null, ?array $production = null) {
        parent::__construct(ORANGE, $cost, $workforce, $production);
    } 
}

class PurpleTileType extends TileType {
    public function __construct(array $cost, ?int $adjacentPoints = null, ?int $points = null, ?int $searchColor = null) {
        parent::__construct(PURPLE, $cost, null, null, $adjacentPoints, $points, $searchColor);
    } 
}

class GreenTileType extends TileType {
    public function __construct(array $cost, ?int $shape = null) {
        parent::__construct(GREEN, $cost, null, null, null, null, $shape);
    } 
}

class Tile extends TileType {

    public int $id;
    public string $location;
    public int $locationArg;
    public int $type; // 0 start, 1..3 year, 8 communication, 9 obstacle
    public ?int $number;

    public function __construct($dbCard, $TILES) {
        $this->id = intval($dbCard['card_id'] ?? $dbCard['id']);
        $this->location = $dbCard['card_location'] ?? $dbCard['location'];
        $this->locationArg = intval($dbCard['card_location_arg'] ?? $dbCard['location_arg']);
        $this->type = array_key_exists('card_type', $dbCard) || array_key_exists('type', $dbCard) ? intval($dbCard['card_type'] ?? $dbCard['type']) : null;
        $this->number = array_key_exists('card_type_arg', $dbCard) || array_key_exists('type_arg', $dbCard) ? intval($dbCard['card_type_arg'] ?? $dbCard['type_arg']) : null;

        if ($this->number !== null) {
            $objectiveType = $TILES[$this->type][$this->number];  
            $this->type = $objectiveType->type;
            $this->color = $objectiveType->color;      
            $this->cost = $objectiveType->cost;
            $this->workforce = $objectiveType->workforce;
            $this->production = $objectiveType->production;
            $this->adjacentPoints = $objectiveType->adjacentPoints;
            $this->points = $objectiveType->points;
            $this->matchType = $objectiveType->matchType;
        }
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