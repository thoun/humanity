<?php

class Astronaut {
    public int $id;
    public int $playerId;
    public int $workforce;
    public int $remainingWorkforce;
    public string $location;
    public ?int $x;
    public ?int $y;
    public ?int $spot;

    public function __construct($dbDice) {
        $this->id = intval($dbDice['id']);
        $this->playerId = intval($dbDice['player_id']);
        $this->workforce = intval($dbDice['workforce']);
        $this->remainingWorkforce = intval($dbDice['remaining_workforce']);
        $this->location = $dbDice['location'];
        $this->x = $dbDice['x'] !== null ? intval($dbDice['x']) : null;
        $this->y = $dbDice['y'] !== null ? intval($dbDice['y']) : null;
        $this->spot = $dbDice['spot'] !== null ? intval($dbDice['spot']) : null;
    } 
}

?>