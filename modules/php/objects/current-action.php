<?php

class CurrentAction {
    public string $type; // 'module', 'research', 'activate'
    public ?int $selectedWorker;
    public ?int $workerSpot;
    public ?int $addModuleId;
    public ?int $removeModuleId;
    public ?int $research;
    public ?array $remainingCost;
    public ?int $upgrade;

    public function __construct(string $type) {
        $this->type = $type;
    } 
}

?>