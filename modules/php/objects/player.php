<?php

class HumanityPlayer {
    public int $id;
    public string $name;
    public string $color;
    public int $no;
    public int $score;
    public int $researchPoints;
    public int $vp;
    public int $science;
    public array $scienceByYear;

    public function __construct($dbPlayer) {
        $this->id = intval($dbPlayer['player_id']);
        $this->name = $dbPlayer['player_name'];
        $this->color = $dbPlayer['player_color'];
        $this->no = intval($dbPlayer['player_no']);
        $this->score = intval($dbPlayer['player_score']);
        $this->vp = intval($dbPlayer['player_vp']);
        $this->researchPoints = intval($dbPlayer['player_research_points']);
        $this->science = intval($dbPlayer['player_science']);
        $this->scienceByYear = json_decode($dbPlayer['player_science_by_year']);
    }
}
?>