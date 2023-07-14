<?php

class Undo {
    public array $tiles;
    public array $research;
    public array $workers;
    public int $vp;
    public int $researchPoints;
    public int $science;
    public array $tableTiles;
    public array $tableResearch;
    public array $allObjectives;

    public function __construct(
        array $tiles,
        array $research,
        array $workers,
        HumanityPlayer $player,
        array $tableTiles,
        array $tableResearch,
        array $allObjectives
    ) {
        $this->tiles = $tiles;
        $this->research = $research;
        $this->workers = $workers;
        $this->vp = $player->vp;
        $this->researchPoints = $player->researchPoints;
        $this->science = $player->science;
        $this->tableTiles = $tableTiles;
        $this->tableResearch = $tableResearch;
        $this->allObjectives = $allObjectives;
    }

}
?>