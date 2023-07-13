<?php

class CurrentAction {
    public string $type; // 'tile', 'research', 'activate'
    public ?int $selectedWorker;
    public ?int $spot;
    public ?int $tile;
    public ?int $research;

    public function __construct(string $type) {
        $this->type = $type;
    } 
}

?>