<?php

require_once(__DIR__.'/../constants.inc.php');

class TileType {
    public /*int|null*/ $color;
    public /*int|null*/ $gain;
    public array $number;
  
    public function __construct(int $color, int $gain, array $number) {
        $this->color = $color;
        $this->gain = $gain;
        $this->number = $number;
    } 
}

class Tile extends TileType {

    public int $id;
    public string $location;
    public int $locationArg;
    public /*int|null*/ $color;
    public /*int|null*/ $gain;

    public function __construct($dbCard) {
        $this->id = intval($dbCard['card_id'] ?? $dbCard['id']);
        $this->location = $dbCard['card_location'] ?? $dbCard['location'];
        $this->locationArg = intval($dbCard['card_location_arg'] ?? $dbCard['location_arg']);
        $this->color = array_key_exists('card_type', $dbCard) || array_key_exists('type', $dbCard) ? intval($dbCard['card_type'] ?? $dbCard['type']) : null;
        $this->gain = array_key_exists('card_type_arg', $dbCard) || array_key_exists('type_arg', $dbCard) ? intval($dbCard['card_type_arg'] ?? $dbCard['type_arg']) : null;
    } 

    public static function onlyId(?Tile $tile) {
        if ($tile == null) {
            return null;
        }
        
        return new Tile([
            'card_id' => $tile->id,
            'card_location' => $tile->location,
            'card_location_arg' => $tile->locationArg,
        ]);
    }

    public static function onlyIds(array $tiles) {
        return array_map(fn($tile) => self::onlyId($tile), $tiles);
    }
}

?>