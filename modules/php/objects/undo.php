<?php

class Undo {
    public array $modules;
    public array $experiments;
    public array $astronauts;
    public int $vp;
    public int $researchPoints;
    public int $science;
    public array $tableModules;
    public array $tableExperiments;
    public array $allMissions;

    public function __construct(
        array $modules,
        array $experiments,
        array $astronauts,
        HumanityPlayer $player,
        array $tableModules,
        array $tableExperiments,
        array $allMissions
    ) {
        $this->modules = $modules;
        $this->experiments = $experiments;
        $this->astronauts = $astronauts;
        $this->vp = $player->vp;
        $this->researchPoints = $player->researchPoints;
        $this->science = $player->science;
        $this->tableModules = $tableModules;
        $this->tableExperiments = $tableExperiments;
        $this->allMissions = $allMissions;
    }

}
?>