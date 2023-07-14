<?php

class CurrentAction {
    public string $type; // 'tile', 'research', 'activate'
    public ?int $selectedWorker;
    public ?int $workerSpot;
    public ?int $addTileId;
    public ?int $removeTileId;
    public ?int $research;

    public function __construct(string $type) {
        $this->type = $type;
    } 
}

?>