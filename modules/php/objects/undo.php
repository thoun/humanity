<?php

class Undo {
    public array $modules;
    public array $experiments;
    public array $workers;
    public int $vp;
    public int $researchPoints;
    public int $science;
    public array $tableModules;
    public array $tableExperiments;
    public array $allObjectives;

    public function __construct(
        array $modules,
        array $experiments,
        array $workers,
        HumanityPlayer $player,
        array $tableModules,
        array $tableExperiments,
        array $allObjectives
    ) {
        $this->modules = $modules;
        $this->experiments = $experiments;
        $this->workers = $workers;
        $this->vp = $player->vp;
        $this->researchPoints = $player->researchPoints;
        $this->science = $player->science;
        $this->tableModules = $tableModules;
        $this->tableExperiments = $tableExperiments;
        $this->allObjectives = $allObjectives;
    }

}
?>