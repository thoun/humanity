<?php

class CurrentAction {
    public ?string $type; // 'module', 'experiment', 'activate'
    public int $selectedAstronaut;
    public ?int $astronautSpot;
    public ?int $addModuleId;
    public ?int $removeModuleId;
    public ?int $experiment;
    public ?array $remainingCost;
    public ?int $upgrade;

    public function __construct(int $selectedAstronaut) {
        $this->selectedAstronaut = $selectedAstronaut;
    } 
}

?>