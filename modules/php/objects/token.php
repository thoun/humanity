<?php

require_once(__DIR__.'/../constants.inc.php');


class Destination {

    public int $id;
    public string $location;
    public int $locationArg;
    public /*int | null*/ $type;

    public function __construct($dbCard) {
        $this->id = intval($dbCard['card_id'] ?? $dbCard['id']);
        $this->location = $dbCard['card_location'] ?? $dbCard['location'];
        $this->locationArg = intval($dbCard['card_location_arg'] ?? $dbCard['location_arg']);
        $this->type = array_key_exists('card_type', $dbCard) || array_key_exists('type', $dbCard) ? intval($dbCard['card_type'] ?? $dbCard['type']) : null;
    } 

    public static function onlyId(/*Token|null*/ $tile) {
        if ($tile == null) {
            return null;
        }
        
        return new Destination([
            'card_id' => $tile->id,
            'card_location' => $tile->location,
            'card_location_arg' => $tile->locationArg,
        ], null);
    }

    public static function onlyIds(array $tiles) {
        return array_map(fn($tile) => self::onlyId($tile), $tiles);
    }
}

?>