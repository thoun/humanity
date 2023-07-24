<?php

class Undo {
    public array $modules;
    public array $research;
    public array $workers;
    public int $vp;
    public int $researchPoints;
    public int $science;
    public array $tableModules;
    public array $tableResearch;
    public array $allObjectives;

    public function __construct(
        array $modules,
        array $research,
        array $workers,
        HumanityPlayer $player,
        array $tableModules,
        array $tableResearch,
        array $allObjectives
    ) {
        $this->modules = $modules;
        $this->research = $research;
        $this->workers = $workers;
        $this->vp = $player->vp;
        $this->researchPoints = $player->researchPoints;
        $this->science = $player->science;
        $this->tableModules = $tableModules;
        $this->tableResearch = $tableResearch;
        $this->allObjectives = $allObjectives;
    }

}
?>